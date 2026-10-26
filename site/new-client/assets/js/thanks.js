/*
 * Thank-you page: records the booking once per funnel session.
 * Only counts visitors who came through the funnel (a lead that reached the
 * phone step), so someone opening the URL directly isn't reported as a booking.
 */
(function () {
  // A booking widget (e.g. Acuity) may load this page inside its own frame after
  // a booking. Same origin as the top page, so reload it full-window and stop.
  if (window.top !== window.self) {
    try { window.top.location.href = location.href; return; } catch (e) { /* not ours – carry on */ }
  }
  const lead = LeadStore.getLead();
  if (!lead.email || !["complete", "booked"].includes(lead.status)) return;
  if (lead.thankYouSeen) return;
  const saved = LeadStore.saveLead({ status: "booked", thankYouSeen: true });
  // Label the event with the offer the visitor came from, not the shared page's own.
  Track.event("Schedule", saved.funnel ? { content_name: saved.funnel } : {}, saved.id);
})();
