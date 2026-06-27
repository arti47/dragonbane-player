/* main.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, el } from './core.js';
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

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("service-worker.js").then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                const toast = el(`<div class="update-toast" role="alert" title="Click to reload with updated version">Update Available: Click to Reload 🔄</div>`);
                toast.onclick = () => window.location.reload();
                document.body.appendChild(toast);
              }
            });
          }
        });
      }).catch(() => {});
    }

    if (!window.DRAGONBANE) {
      $("#screen").innerHTML = `<div class="panel notice">Could not load the rules library (data.js). Check that all files are served together.</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

