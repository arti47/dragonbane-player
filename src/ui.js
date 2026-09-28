/* ui.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, Dice, el, esc } from './core.js';

let __modalSeq = 0;
export function modal(title) {
    const titleId = "modal-title-" + (++__modalSeq);
    const back = el(`<div class="modal-back"></div>`);
    const card = el(`<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1"></div>`);
    card.appendChild(el(`<div class="modal-head"><h3 id="${titleId}">${esc(title)}</h3></div>`));
    const x = el(`<button class="icon-btn modal-x" aria-label="Close dialog">✕</button>`);
    card.querySelector(".modal-head").appendChild(x);
    const body = el(`<div class="modal-body"></div>`);
    card.appendChild(body);
    back.appendChild(card);
    // Remember what had focus so it can be restored when the dialog closes.
    const prevFocus = document.activeElement;
    document.body.appendChild(back);
    // Size the overlay to the *visible* viewport (excludes the mobile browser
    // toolbar), so the bottom-anchored sheet never slips off-screen. Falls back
    // to the CSS dvh/vh rules when visualViewport is unavailable.
    const vv = window.visualViewport;
    const fit = () => {
      const h = (vv && vv.height) || window.innerHeight;
      back.style.height = h + "px";
      back.style.top = (vv ? vv.offsetTop : 0) + "px";
      card.style.maxHeight = Math.round(h * 0.92) + "px";
    };
    fit();
    if (vv) { vv.addEventListener("resize", fit); vv.addEventListener("scroll", fit); }
    const focusables = () => [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((n) => !n.disabled && n.offsetParent !== null);
    const close = () => {
      if (vv) { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); }
      document.removeEventListener("keydown", onKey, true);
      back.remove();
      // Restore focus to the control that opened the dialog (a11y).
      if (prevFocus && typeof prevFocus.focus === "function" && document.contains(prevFocus)) prevFocus.focus();
      if (typeof back._onClose === "function") back._onClose();
    };
    // Escape closes; Tab is trapped within the dialog (a11y).
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) { e.preventDefault(); card.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    back._close = close;
    back.onclick = (e) => { if (e.target === back) close(); };
    x.onclick = close;
    // Move focus into the dialog (first focusable, else the card itself).
    requestAnimationFrame(() => { const f = focusables(); (f[0] || card).focus(); });
    return { body, close, back };
  }

  // Close every open dialog (used on navigation so a stale roll window never
  // lingers over a new screen). Each close resolves its confirm/prompt promise.
  export function closeAllModals() {
    document.querySelectorAll(".modal-back").forEach((b) => { if (typeof b._close === "function") b._close(); else b.remove(); });
  }

  /* =================================================================
   * UX helpers — non-blocking toasts + themed confirm/prompt modals
   * (replace native alert/confirm/prompt so the app stays on-brand and
   *  never freezes the page with a system dialog, esp. on mobile).
   * ================================================================= */

export function showToast(msg, type) {
    const isErr = type === "error" || type === "warn";
    const t = el(`<div class="toast ${type ? "toast-" + type : ""}" role="${isErr ? "alert" : "status"}">${esc(msg)}</div>`);
    // Stack multiple toasts so they don't overlap; tap an error toast to dismiss.
    const existing = document.querySelectorAll(".toast").length;
    t.style.bottom = (84 + existing * 46) + "px";
    t.style.pointerEvents = "auto"; t.style.cursor = "pointer";
    const dur = isErr || type === "undo" ? 5200 : 2600;
    t.style.setProperty("--dur", dur + "ms");
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    const kill = () => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); };
    let timer = setTimeout(kill, dur);
    t.onclick = () => { clearTimeout(timer); kill(); };
    // Swipe sideways to dismiss.
    let x0 = null;
    t.addEventListener("pointerdown", (e) => { x0 = e.clientX; t.style.transition = "none"; });
    t.addEventListener("pointermove", (e) => { if (x0 == null) return; const dx = e.clientX - x0; t.style.transform = `translate(calc(-50% + ${dx}px), 0)`; t.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 160)); });
    const end = (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; t.style.transition = ""; if (Math.abs(dx) > 60) { clearTimeout(timer); t.onclick = null; t.remove(); } else { t.style.transform = ""; t.style.opacity = ""; } };
    t.addEventListener("pointerup", end); t.addEventListener("pointercancel", end);
    return t;
  }
  // "Removed X · Undo" — a toast with an Undo action (~5s). onUndo restores.
export function showUndoToast(msg, onUndo) {
    const t = showToast(msg, "undo");
    const b = el(`<button type="button" class="undo-btn">Undo</button>`);
    b.onclick = (e) => { e.stopPropagation(); try { onUndo(); } finally { t.remove(); } };
    t.appendChild(b);
    return t;
  }
  // Promise<boolean>. opts: { title, okText, cancelText, danger }

export function confirmModal(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const m = modal(opts.title || "Confirm");
      m.body.appendChild(el(`<p class="modal-msg">${esc(message)}</p>`));
      const row = el(`<div class="modal-actions"></div>`);
      const cancel = el(`<button class="btn ghost">${esc(opts.cancelText || "Cancel")}</button>`);
      const ok = el(`<button class="btn ${opts.danger ? "danger" : "block"}">${esc(opts.okText || "OK")}</button>`);
      let done = false;
      const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
      m.back._onClose = () => finish(false);
      cancel.onclick = () => finish(false);
      ok.onclick = () => finish(true);
      row.append(cancel, ok);
      m.body.appendChild(row);
      ok.focus();
    });
  }
  // Promise<string|null> (null = cancelled). opts: { title, defaultValue, inputType, placeholder, okText }

export function promptModal(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const m = modal(opts.title || "Enter a value");
      if (message) m.body.appendChild(el(`<p class="modal-msg">${esc(message)}</p>`));
      const input = el(`<input class="modal-input" type="${opts.inputType || "text"}" placeholder="${esc(opts.placeholder || "")}" value="${esc(opts.defaultValue != null ? opts.defaultValue : "")}">`);
      m.body.appendChild(input);
      const row = el(`<div class="modal-actions"></div>`);
      const cancel = el(`<button class="btn ghost">Cancel</button>`);
      const ok = el(`<button class="btn block">${esc(opts.okText || "OK")}</button>`);
      let done = false;
      const finish = (v) => { if (done) return; done = true; m.close(); resolve(v); };
      m.back._onClose = () => finish(null);
      cancel.onclick = () => finish(null);
      ok.onclick = () => finish(input.value);
      input.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); finish(input.value); } };
      row.append(cancel, ok);
      m.body.appendChild(row);
      setTimeout(() => { input.focus(); input.select(); }, 30);
    });
  }
  // Expose for any inline handlers / debugging.
  window.showToast = showToast;
  window.confirmModal = confirmModal;
  window.promptModal = promptModal;

  /* =================================================================
   * Dice engine (Phase 3) — skill rolls, damage, spell casting
   * ================================================================= */
