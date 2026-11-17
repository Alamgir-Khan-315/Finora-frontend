// Phone behaviour: no pinch / double-tap zoom, and table cells get labels so tables can show as cards on small screens.

// 1) Zoom lock. The viewport tag does this on Android; iPhone Safari ignores it, so block its gesture events too.
const touch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
if (touch) {
  ["gesturestart", "gesturechange", "gestureend"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });   // two-finger pinch
  // Double-tap zoom is switched off in CSS (touch-action: manipulation), which does not delay or swallow normal taps.
}

// 2) Copy each column heading onto its cells (data-label) so the phone card layout can print "Amount: Rs 1,000".
function labelTables() {
  document.querySelectorAll(".table-wrap table").forEach(t => {
    const heads = [...t.querySelectorAll("thead th")].map(th => (th.querySelector(".sr") || th.classList.contains("sr") || /^(actions?|delete)$/i.test(th.textContent.trim()) ? "" : th.textContent.trim()));
    if (!heads.length) return;
    t.querySelectorAll("tbody tr, tfoot tr").forEach(tr => [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label) td.dataset.label = heads[i]; }));
  });
}
let queued = false;
const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; labelTables(); }); };
export function startMobileHelpers(root) { new MutationObserver(schedule).observe(root, { childList: true, subtree: true }); schedule(); }
