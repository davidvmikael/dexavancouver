(function () {
  const ORDER = ["intro", "name", "email", "phone"];
  const steps = {};
  document.querySelectorAll("[data-step]").forEach((el) => { steps[el.dataset.step] = el; });

  const honeypot = () => (document.querySelector("input[name=company]") || {}).value || "";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const backBtn = document.getElementById("backBtn");
  const progress = document.getElementById("progress");
  const progressBar = document.getElementById("progressBar");

  function show(name, push) {
    if (!steps[name]) name = "intro";
    Object.entries(steps).forEach(([key, el]) => { el.hidden = key !== name; });
    const index = ORDER.indexOf(name);
    backBtn.hidden = index === 0;
    progress.hidden = index === 0;
    // Bar shows how far along you are, counting the booking page as the final step.
    requestAnimationFrame(() => { progressBar.style.width = `${(index / ORDER.length) * 100}%`; });
    if (push) history.pushState({ step: name }, "", name === "intro" ? location.pathname + location.search : "#" + name);
    window.scrollTo(0, 0);
    const first = steps[name].querySelector("input");
    if (first && window.matchMedia("(min-width: 641px)").matches) first.focus();
  }

  function next(current) {
    show(ORDER[ORDER.indexOf(current) + 1], true);
  }

  // Only allow deep-linking to a step whose earlier answers we already have.
  function allowedStep(name) {
    const lead = LeadStore.getLead();
    if (name === "email") return lead.firstName ? "email" : "intro";
    if (name === "phone") return lead.email ? "phone" : "intro";
    return ORDER.includes(name) ? name : "intro";
  }

  function setError(form, message, fields) {
    form.querySelector(".error-msg").textContent = message || "";
    form.querySelectorAll(".field, .check").forEach((f) => f.classList.remove("invalid"));
    (fields || []).forEach((input) => input.closest(".field, .check").classList.add("invalid"));
    if (fields && fields[0]) fields[0].focus();
  }

  function formatPhone(value) {
    const d = value.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // Prefill from this session, falling back to details from an earlier visit.
  const saved = Object.assign({}, LeadStore.lastKnown(), LeadStore.getLead());
  ["firstName", "lastName", "email", "phone"].forEach((k) => {
    const input = document.querySelector(`[name="${k}"]`);
    if (input && saved[k]) input.value = k === "phone" ? formatPhone(saved[k]) : saved[k];
  });

  document.querySelector("[data-step=intro] [data-next]").addEventListener("click", () => {
    LeadStore.saveLead({ status: LeadStore.getLead().status || "started" });
    next("intro");
  });

  steps.name.addEventListener("submit", (e) => {
    e.preventDefault();
    const first = steps.name.elements.firstName;
    const last = steps.name.elements.lastName;
    const missing = [first, last].filter((i) => !i.value.trim());
    if (missing.length) return setError(steps.name, "Please enter your first and last name.", missing);
    setError(steps.name);
    LeadStore.saveLead({ firstName: first.value.trim(), lastName: last.value.trim() });
    next("name");
  });

  steps.email.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = steps.email.elements.email;
    const value = email.value.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError(steps.email, "Please enter a valid email address.", [email]);
    setError(steps.email);
    const lead = LeadStore.getLead();
    // Partial lead: captured as soon as we have an email, even if they drop off on the phone step.
    LeadStore.saveLead({ _hp: honeypot(), email: value, status: lead.status === "complete" || lead.status === "booked" ? lead.status : "partial" });
    next("email");
  });

  const phoneInput = steps.phone.elements.phone;
  // "change" as well as "input" so browser/OS autofill gets formatted too.
  ["input", "change"].forEach((ev) => phoneInput.addEventListener(ev, () => { phoneInput.value = formatPhone(phoneInput.value); }));

  // Keyboard "next" on first name jumps to last name instead of submitting.
  steps.name.elements.firstName.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !steps.name.elements.lastName.value.trim()) {
      e.preventDefault();
      steps.name.elements.lastName.focus();
    }
  });

  const countrySelect = steps.phone.elements.country;
  countrySelect.addEventListener("change", () => {
    steps.phone.querySelector("[data-flag]").textContent = countrySelect.selectedOptions[0].dataset.flag;
  });

  steps.phone.addEventListener("submit", (e) => {
    e.preventDefault();
    const els = steps.phone.elements;
    const digits = phoneInput.value.replace(/\D/g, "");
    if (digits.length !== 10) return setError(steps.phone, "Please enter a valid 10-digit phone number.", [phoneInput]);
    if (!els.privacyAccepted.checked) return setError(steps.phone, "Please accept the privacy policy to continue.", [els.privacyAccepted]);
    setError(steps.phone);

    LeadStore.saveLead({
      _hp: honeypot(),
      phone: "+1" + digits,
      country: countrySelect.value,
      privacyAccepted: true,
      smsConsent: els.smsConsent.checked,
      consentAt: new Date().toISOString(),
      status: LeadStore.getLead().status === "booked" ? "booked" : "complete",
    });

    const btn = steps.phone.querySelector("button[type=submit]");
    btn.disabled = true;
    // Meta "Lead" fires on the calendar page (Track.leadOnce), once per opt-in.
    location.href = "book.html" + location.search;
  });

  backBtn.addEventListener("click", () => {
    const current = ORDER.find((k) => !steps[k].hidden);
    show(ORDER[Math.max(0, ORDER.indexOf(current) - 1)], true);
  });

  window.addEventListener("popstate", (e) => show(allowedStep((e.state && e.state.step) || location.hash.slice(1)), false));

  const initial = allowedStep(location.hash.slice(1));
  history.replaceState({ step: initial }, "", initial === "intro" ? location.pathname + location.search : "#" + initial);
  show(initial, false);
})();
