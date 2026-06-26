/* router.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $ } from './core.js';
import { Settings } from './settings.js';
import { Screens } from './screens.js';
import { init } from './main.js';

export const Router = {
    go(route) {
      if (route !== "sheet") window.activeCharacterId = null;
      if (route === "solo" && !Settings.soloMode()) {
        this.go("home");
        return;
      }
      const soloNav = document.querySelector("#app-nav button[data-route='solo']");
      if (soloNav) {
        soloNav.style.display = Settings.soloMode() ? "" : "none";
      }
      const screen = $("#screen");
      screen.innerHTML = "";
      const screenFn = Screens[route] || Screens.home;
      screen.appendChild(screenFn.call(Screens)); // bind `this` = Screens for screen methods
      document.querySelectorAll("#app-nav button").forEach((b) =>
        b.classList.toggle("active", b.dataset.route === route));
      window.scrollTo(0, 0);
    },
    init() {
      document.querySelectorAll("#app-nav button").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.route)));
      this.go("home");
    }
  };

  /* =================================================================
   * Bootstrap
   * ================================================================= */
