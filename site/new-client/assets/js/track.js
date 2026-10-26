/*
 * Conversion events. No-ops unless the client config sets a Meta Pixel
 * (tracking.metaPixelId), so funnels without tracking behave the same.
 * Each event gets a stable eventID (event + lead id) so a later server-side
 * Conversions API setup can deduplicate against these browser events.
 */
(function () {
  const SITE = window.FUNNEL_CONFIG || {};
  const tracking = SITE.tracking || {};
  const enabled = () => !!(tracking.metaPixelId && typeof window.fbq === "function");

  window.Track = {
    enabled,
    // Standard Meta event (Lead, Schedule, ...).
    event(name, params, leadId) {
      const data = Object.assign({ content_name: tracking.contentName || SITE.id }, params || {});
      // Google Tag Manager: e.g. "funnel_lead" / "funnel_schedule", usable as GTM triggers.
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: "funnel_" + name.toLowerCase(), funnel: data.content_name, event_id: leadId ? `${name}_${leadId}` : undefined });
      }
      if (!enabled()) return;
      const opts = leadId ? { eventID: `${name}_${leadId}` } : undefined;
      try { window.fbq("track", name, data, opts); } catch (e) { /* never break the funnel */ }
    },
    // Calendar page: fire "Lead" once per person who completed the opt-in form.
    // Refreshes, back-button visits and direct visits to the page don't count.
    leadOnce() {
      if (!window.LeadStore) return;
      const lead = window.LeadStore.getLead();
      if (!lead.email || !["complete", "booked"].includes(lead.status) || lead.leadTracked) return;
      window.LeadStore.saveLead({ leadTracked: true });
      this.event("Lead", lead.funnel ? { content_name: lead.funnel } : {}, lead.id);
    },
  };
})();
