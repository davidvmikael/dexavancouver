/*
 * Iframe booking widget (booking.embed.src in the client config).
 * - Prefills the widget with the details captured earlier in the funnel.
 * - Passes on the visitor's real UTM tags; the config's utm values are only
 *   a fallback for visitors who arrived without any.
 * - Resizes the iframe from the widget's postMessage, accepting messages
 *   only from that iframe and its origin.
 */
(function () {
  const SITE = window.FUNNEL_CONFIG;
  const cfg = SITE.booking.embed;
  const frame = document.getElementById("embedFrame");
  if (!cfg || !frame) return;

  const base = new URL(cfg.src);
  const lead = Object.assign({}, LeadStore.lastKnown(), LeadStore.getLead());

  // UTMs: from the lead's first visit, else this page's URL, else config fallback.
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const here = new URLSearchParams(location.search);
  const fromLead = lead.source || {};
  const hasRealUtm = UTM_KEYS.some((k) => fromLead[k] || here.get(k));
  UTM_KEYS.forEach((k) => {
    const value = hasRealUtm ? (fromLead[k] || here.get(k)) : (cfg.utm || {})[k];
    if (value) base.searchParams.set(k, value);
  });

  // Fixed parameters for this funnel, e.g. which service to open on.
  Object.entries(cfg.params || {}).forEach(([k, v]) => base.searchParams.set(k, v));

  // Prefill: widget param name -> lead field.
  Object.entries(cfg.prefill || {}).forEach(([param, field]) => {
    base.searchParams.set(param, lead[field] || "");
  });

  frame.src = base.toString();

  window.addEventListener("message", (e) => {
    if (e.origin !== base.origin || e.source !== frame.contentWindow) return;
    const d = e.data;
    if (!d || d.source !== cfg.messageSource) return;
    // Fires once the calendar developer adds: parent.postMessage({source, type: "booked"}, "*")
    if (d.type === "booked") {
      if (frame.dataset.booked) return;
      frame.dataset.booked = "1";
      if (SITE.thankYouPage) {
        // The thank-you page records the booking (CRM stage + Schedule event).
        location.href = "thank-you.html";
      } else {
        const saved = LeadStore.saveLead({ status: "booked" });
        Track.event("Schedule", {}, saved.id);
      }
      return;
    }
    if (d.type !== "resize") return;
    const height = Number(d.height);
    if (!Number.isFinite(height)) return;
    frame.style.height = Math.min(Math.max(height, 200), 10000) + "px";
  });
})();
