/* router.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $ } from './core.js';
import { closeAllModals } from './ui.js';
import { Settings } from './settings.js';
import { Screens } from './screens.js';
import { GM } from './gm.js';
import { init } from './main.js';
import { Store } from './store.js';
import { Combat } from './combat.js';
import { Sync } from './sync.js';

export const Router = {
    go(route) {
      closeAllModals();
      document.querySelectorAll(".toast").forEach((t) => t.remove()); // stale notices don't follow you
      document.documentElement.style.setProperty("--mini-h", "0px");
      if (route !== "sheet") window.activeCharacterId = null;
      if (route === "solo" && !Settings.soloMode()) {
        this.go("home");
        return;
      }
      if (route === "gm" && !GM.enabled()) {
        this.go("home");
        return;
      }
      const soloNav = document.querySelector("#app-nav button[data-route='solo']");
      if (soloNav) {
        soloNav.style.display = Settings.soloMode() ? "" : "none";
      }
      const gmNav = document.querySelector("#app-nav button[data-route='gm']");
      if (gmNav) {
        gmNav.style.display = GM.enabled() ? "" : "none";
      }
      const screen = $("#screen");
      screen.innerHTML = "";
      const screenFn = Screens[route] || Screens.home;
      screen.appendChild(screenFn.call(Screens)); // bind `this` = Screens for screen methods
      screen.dataset.route = route;
      if (screen.firstElementChild) screen.firstElementChild.classList.add("screen-in");
      document.querySelectorAll("#app-nav button").forEach((b) => {
        const on = b.dataset.route === route;
        b.classList.toggle("active", on);
        if (on) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
      window.scrollTo(0, 0);
      this.updateBadges();
    },
    // Nav badges: gold dot on Combat while a round runs; red dot on Heroes when a
    // hero is at 0 HP; blue dot on Heroes for unread GM messages.
    updateBadges() {
      const set = (route, cls, on, label) => {
        const b = document.querySelector(`#app-nav button[data-route='${route}']`); if (!b) return;
        let d = b.querySelector(`.nav-dot.${cls}`);
        if (on && !d) { d = document.createElement("span"); d.className = `nav-dot ${cls}`; d.setAttribute("aria-hidden", "true"); b.appendChild(d); }
        if (!on && d) d.remove();
        b.dataset[cls] = on ? label : "";
        const extra = [...b.querySelectorAll(".nav-dot")].map((x) => b.dataset[x.classList[1]]).filter(Boolean);
        const base = [...b.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
        if (extra.length) b.setAttribute("aria-label", `${base} (${extra.join(", ")})`); else b.removeAttribute("aria-label");
      };
      let st = {}; try { st = Combat.load() || {}; } catch (_) {}
      set("party", "round", !!(st.round && (st.combatants || []).length), "combat round active");
      let dying = false; try { dying = Store.list().some((c) => c.state && c.state.hp <= 0 && !((c.state.deathRolls || {}).failures >= 3)); } catch (_) {}
      set("home", "dying", dying, "a hero is dying");
      let unread = false;
      try { const n = (Sync.broadcast || []).length; const seen = +(localStorage.getItem("dragonbane.bcSeen") || 0); unread = n > seen; } catch (_) {}
      set("home", "msg", unread, "unread GM messages");
    },
    markMessagesRead() { try { localStorage.setItem("dragonbane.bcSeen", String((Sync.broadcast || []).length)); } catch (_) {} this.updateBadges(); },
    init() {
      let pending = false;
      window.addEventListener("db:changed", () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; this.updateBadges(); }); });
      document.querySelectorAll("#app-nav button").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.route)));
      this.go("home");
    }
  };

  /* =================================================================
   * Bootstrap
   * ================================================================= */
