/*
 * Lead store. Leads are kept in this browser's localStorage and, when the
 * build sets leads.endpoint (production), also sent to that endpoint
 * (functions/api/lead.js), which forwards them to the CRM.
 *
 * Lead status progression: started -> partial (email captured) -> complete
 * (phone + consent submitted) -> booked (appointment confirmed).
 */
(function () {
  // Namespaced per client so several funnels previewed on one host don't mix.
  // Offers of one location can share storage (storageNamespace), so a shared
  // thank-you page finds the lead whichever offer it came from.
  const CFG0 = window.FUNNEL_CONFIG || {};
  const NS = CFG0.storageNamespace || CFG0.id || "funnel";
  const LEADS_KEY = NS + ":leads";
  const CURRENT_KEY = NS + ":current_lead";

  function safeGet(storage, key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); } catch (e) { /* storage blocked – demo keeps working in memory */ }
  }

  function readAll() {
    try { return JSON.parse(safeGet(localStorage, LEADS_KEY)) || []; } catch (e) { return []; }
  }

  function writeAll(leads) {
    safeSet(localStorage, LEADS_KEY, JSON.stringify(leads));
  }

  function newId() {
    return "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function currentId() {
    let id = safeGet(sessionStorage, CURRENT_KEY);
    if (!id) {
      id = newId();
      safeSet(sessionStorage, CURRENT_KEY, id);
    }
    return id;
  }

  function utm() {
    const params = new URLSearchParams(location.search);
    const out = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((k) => {
      if (params.get(k)) out[k] = params.get(k);
    });
    return out;
  }

  function getLead() {
    const id = currentId();
    return readAll().find((l) => l.id === id) || { id };
  }

  // Most recent contact details entered in this browser (any session), so a
  // returning visitor doesn't have to type them again.
  function lastKnown() {
    const leads = readAll().filter((l) => l.email || l.firstName);
    leads.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    const latest = leads[0] || {};
    return { firstName: latest.firstName, lastName: latest.lastName, email: latest.email, phone: latest.phone };
  }

  // ---- remote sending (production builds only) ----
  const SITE = window.FUNNEL_CONFIG || {};
  const ENDPOINT = SITE.leads && SITE.leads.endpoint;
  const STAGES = ["partial", "complete", "booked"];
  const SENT_KEY = NS + ":sent";

  function send(lead, hp) {
    if (!ENDPOINT || !lead.email || !STAGES.includes(lead.status)) return;
    // Only send when something meaningful changed (stage or contact details).
    const signature = [lead.id, lead.status, lead.firstName, lead.lastName, lead.email, lead.phone, lead.smsConsent].join("|");
    if (safeGet(sessionStorage, SENT_KEY) === signature) return;
    safeSet(sessionStorage, SENT_KEY, signature);
    const payload = {
      funnel: lead.funnel || SITE.id,
      stage: lead.status,
      leadId: lead.id,
      firstName: lead.firstName || "",
      lastName: lead.lastName || "",
      email: lead.email,
      phone: lead.phone || "",
      country: lead.country || "",
      privacyAccepted: !!lead.privacyAccepted,
      smsConsent: !!lead.smsConsent,
      consentText: lead.smsConsent != null ? SITE.leads.consentText : "",
      consentAt: lead.consentAt || "",
      source: lead.source || {},
      page: location.origin + location.pathname,
      hp: hp || "",
    };
    try {
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true })
        .catch(() => { safeSet(sessionStorage, SENT_KEY, ""); });
    } catch (e) { /* never break the funnel */ }
  }

  function saveLead(fields) {
    fields = Object.assign({}, fields);
    const hp = fields._hp;
    delete fields._hp;
    const id = currentId();
    const leads = readAll();
    const now = new Date().toISOString();
    let lead = leads.find((l) => l.id === id);
    if (!lead) {
      lead = { id, createdAt: now, source: Object.assign({ page: location.pathname }, utm()) };
      leads.push(lead);
    }
    // The thank-you page is shared; don't let it overwrite the offer the lead came from.
    if (window.FUNNEL_PAGE !== "thank-you") lead.funnel = SITE.id;
    Object.assign(lead, fields, { updatedAt: now });
    writeAll(leads);
    if (!ENDPOINT) console.info("[funnel demo] lead saved locally", lead);
    send(lead, hp);
    return lead;
  }

  window.LeadStore = {
    getLead,
    lastKnown,
    saveLead,
    all: readAll,
    clear: () => writeAll([]),
    resetSession: () => { try { sessionStorage.removeItem(CURRENT_KEY); } catch (e) {} },
  };
})();
