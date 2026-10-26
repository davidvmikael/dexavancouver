// Tap-to-copy for discount code chips (<button data-copy="CODE">).
(function () {
  const toast = document.getElementById("toast");
  let timer;

  function show(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
    return ok;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const code = btn.dataset.copy;
    const done = () => {
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1500);
      show(`Copied ${code}`);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done, () => { if (fallbackCopy(code)) done(); });
    } else if (fallbackCopy(code)) {
      done();
    }
  });
})();
