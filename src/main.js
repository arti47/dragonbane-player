/* main.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, el, GLOSSARY } from './core.js';
import { modal, showToast } from './ui.js';
import { Sync, Theme } from './sync.js';
import { Router } from './router.js';

export function init() {
    if (typeof Sync !== "undefined") Sync.init();

    const pill = $("#sync-status");
    if (pill) {
      pill.style.cursor = "pointer";
      // Make the clickable status pill operable by keyboard (it's a <span>).
      pill.setAttribute("role", "button");
      pill.setAttribute("tabindex", "0");
      pill.setAttribute("aria-label", "Data storage mode — open multiplayer settings");
      const activate = () => {
        Router.go("about");
        setTimeout(() => {
          const mp = document.querySelector("#btn-create-camp")?.closest(".panel") || document.querySelector("#rules-search")?.closest(".panel");
          if (mp) mp.scrollIntoView({ behavior: "smooth" });
        }, 100);
      };
      pill.onclick = activate;
      pill.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } };
    }

    Theme.init();
    Router.init();

    // Inline glossary: tap (or Enter/Space on) any .gloss token to show its definition.
    const showGloss = (node) => { const d = GLOSSARY[node.dataset.gloss]; if (d) showToast(d); };
    document.addEventListener("click", (e) => { const g = e.target.closest && e.target.closest("[data-gloss]"); if (g) { e.preventDefault(); showGloss(g); } });
    document.addEventListener("keydown", (e) => { if (e.key !== "Enter" && e.key !== " ") return; const g = e.target.closest && e.target.closest("[data-gloss]"); if (g) { e.preventDefault(); showGloss(g); } });

    // ---- PWA update detection ----
    // Show a persistent "reload to update" toast whenever a new deploy is
    // available — for browser tabs AND installed (home-screen) PWAs. An
    // installed app can stay resident for a long time, so we don't rely on the
    // browser's own periodic service-worker check: we actively poll for a new
    // worker on load, whenever the app regains focus (reopening it), and hourly.
    // (A new worker is only detected when service-worker.js changes — i.e. when
    // CACHE_VERSION is bumped, which every code push does per §7B/§9.)
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      let updateToastShown = false;
      const showUpdateToast = () => {
        if (updateToastShown) return;
        updateToastShown = true;
        const toast = el(`<div class="update-toast" role="alert" title="Reload to load the latest version">🔄 Update available — tap to reload</div>`);
        const dismiss = el(`<button class="update-toast-x" aria-label="Dismiss update notice">✕</button>`);
        dismiss.onclick = (e) => { e.stopPropagation(); toast.remove(); };
        toast.onclick = () => window.location.reload();
        toast.appendChild(dismiss);
        document.body.appendChild(toast);
      };
      navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then((reg) => {
        // A newer worker may already be waiting (updated while the app was closed).
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast();
        // A new worker started installing — prompt once it's ready, but only if a
        // controller already exists (so the very first install stays silent).
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) showUpdateToast();
          });
        });
        // Actively check for a new deploy (a resident installed PWA may not
        // trigger the browser's own update check for a long time).
        const checkForUpdate = () => { reg.update().catch(() => {}); };
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });
        window.addEventListener("focus", checkForUpdate);
        setInterval(checkForUpdate, 60 * 60 * 1000); // hourly while open
      }).catch(() => {});
    }

    if (!window.DRAGONBANE) {
      $("#screen").innerHTML = `<div class="panel notice">Could not load the rules library (data.js). Check that all files are served together.</div>`;
    }

    // One-time welcome: the whole game in three beats + a link to the full tutorial.
    try {
      if (window.DRAGONBANE && !localStorage.getItem("dragonbane.welcomed")) {
        const m = modal("👋 Welcome to Dragonbane");
        m.body.appendChild(el(`<p class="modal-msg">New here? The whole game in three beats:</p>`));
        m.body.appendChild(el(`<ul class="stat-line" style="padding-left:20px;line-height:1.6">
          <li><b>Start</b> — make or pick a hero, then choose <b>solo</b> (🧭 Solo tab) or <b>with friends</b> (⚙ About → campaign).</li>
          <li><b>Keep playing</b> — set a scene, ask the GM/oracle what happens, tap a skill to roll <b>D20 ≤ its level</b>, fight on the 🛡 Combat tab, rest to recover.</li>
          <li><b>End well</b> — tap <b>End session — advancement</b> (solo: <b>🏅 Mission +5</b>) to improve your skills.</li>
        </ul>`));
        const row = el(`<div class="modal-actions"></div>`);
        const later = el(`<button class="btn ghost">Got it</button>`);
        const show = el(`<button class="btn block">📖 Show me How to Play</button>`);
        later.onclick = () => m.close();
        show.onclick = () => { m.close(); Router.go("rules"); setTimeout(() => { const a = document.querySelector("details.rule-accordion[data-cat='howtoplay']"); if (a) { a.open = true; a.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 80); };
        row.append(later, show); m.body.appendChild(row);
        localStorage.setItem("dragonbane.welcomed", "1");
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", init);

