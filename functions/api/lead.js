/*
 * POST /api/lead – Cloudflare Pages Function.
 * Receives funnel leads from the browser (assets/js/store.js) and writes them
 * to GoHighLevel. The GHL token never reaches the browser.
 *
 * Environment variables (Cloudflare Pages project -> Settings -> Variables):
 *   GHL_TOKEN        (secret)  Private Integration token, scopes: contacts.write, contacts.readonly
 *   GHL_LOCATION_ID            Sub-account (location) ID
 *   ALLOWED_ORIGINS  optional  Comma-separated extra origins allowed to post,
 *                              e.g. "https://westport-funnels.pages.dev". The
 *                              site's own origin is always allowed.
 *
 * In GHL each lead becomes/updates a contact (matched on email/phone per the
 * location's duplicate settings) and gets tags:
 *   <funnel id>                 e.g. longevity-westport-dexa
 *   funnel-partial / funnel-complete / funnel-booked
 *   sms-consent                 only when the SMS box was ticked
 * plus a timeline note recording consent (wording, time, IP, page) at the
 * "complete" stage.
 */

const GHL = "https://services.leadconnectorhq.com";
const STAGES = ["partial", "complete", "booked"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY = 10000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  const own = new URL(request.url).origin;
  const extra = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return origin === own || extra.includes(origin);
}

async function ghl(env, path, body) {
  const res = await fetch(GHL + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GHL_TOKEN}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* non-JSON error page */ }
  if (!res.ok) throw new Error(`GHL ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

function consentNote(lead, request) {
  const h = request.headers;
  const utm = Object.entries(lead.source || {})
    .filter(([k]) => /^(utm_|fbclid|gclid)/.test(k))
    .map(([k, v]) => `${k}=${str(String(v), 100)}`)
    .join(", ");
  return [
    `Funnel lead (${lead.funnel}) – consent record`,
    `Privacy policy accepted: ${lead.privacyAccepted ? "Yes" : "No"}`,
    `SMS marketing consent: ${lead.smsConsent ? "YES" : "NO"}`,
    lead.smsConsent ? `Consent wording shown: "${str(lead.consentText, 600)}"` : null,
    `Consent time (client): ${str(lead.consentAt, 40) || "n/a"}`,
    `Received (server, UTC): ${new Date().toISOString()}`,
    `IP: ${h.get("CF-Connecting-IP") || "n/a"}`,
    `User agent: ${str(h.get("User-Agent") || "", 300)}`,
    `Page: ${str(lead.page, 300)}`,
    utm ? `Attribution: ${utm}` : null,
  ].filter(Boolean).join("\n");
}

export async function onRequestPost({ request, env }) {
  if (!env.GHL_TOKEN || !env.GHL_LOCATION_ID) return json({ ok: false, error: "not configured" }, 500);
  if (!allowedOrigin(request, env)) return json({ ok: false, error: "origin" }, 403);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: "too large" }, 413);
  let lead;
  try { lead = JSON.parse(raw); } catch (e) { return json({ ok: false, error: "bad json" }, 400); }

  // Honeypot filled in: pretend success, store nothing.
  if (str(lead.hp)) return json({ ok: true });

  const funnel = str(lead.funnel, 60);
  const stage = str(lead.stage, 20);
  const email = str(lead.email, 200).toLowerCase();
  const phone = str(lead.phone, 20);
  if (!/^[a-z0-9-]{1,60}$/.test(funnel) || !STAGES.includes(stage)) return json({ ok: false, error: "bad lead" }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "bad email" }, 400);
  if (phone && !/^\+1\d{10}$/.test(phone)) return json({ ok: false, error: "bad phone" }, 400);

  const contact = {
    locationId: env.GHL_LOCATION_ID,
    firstName: str(lead.firstName, 80) || undefined,
    lastName: str(lead.lastName, 80) || undefined,
    email,
    phone: phone || undefined,
    source: `Funnel: ${funnel}`,
  };

  let contactId;
  try {
    const up = await ghl(env, "/contacts/upsert", contact);
    contactId = up && up.contact && up.contact.id;
    if (!contactId) throw new Error("GHL upsert returned no contact id");
  } catch (e) {
    console.error(e.message);
    return json({ ok: false, error: "crm" }, 502);
  }

  // Tags and the consent note are secondary: log failures, don't fail the lead.
  const tags = [funnel, `funnel-${stage}`];
  if (lead.smsConsent && stage !== "partial") tags.push("sms-consent");
  const extras = [ghl(env, `/contacts/${contactId}/tags`, { tags })];
  if (stage === "complete") extras.push(ghl(env, `/contacts/${contactId}/notes`, { body: consentNote(lead, request) }));
  const results = await Promise.allSettled(extras);
  results.filter((r) => r.status === "rejected").forEach((r) => console.error(r.reason && r.reason.message));

  return json({ ok: true });
}
