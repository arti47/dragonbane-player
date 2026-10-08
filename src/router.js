/* router.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map.
   Navigation: four tabs — Hero (home/sheet) · Fight (party) · Story (solo | gm) ·
   Book (rules | about). Story and Book are groups: the tab opens the last screen
   used in that group, and a mode switch at the top of the screen flips between
   them. The docked context button (action.js) sits between Fight and Story. */
import { $, el } from './core.js';
import { closeAllModals, confirmModal } from './ui.js';
import { Settings } from './settings.js';
import { Screens } from './screens.js';
import { GM } from './gm.js';
import { init } from './main.js';
import { Store } from './store.js';
import { Combat } from './combat.js';
import { Sync } from './sync.js';
import { Action } from './action.js';
import { icon } from './icons.js';

export const GROUPS = {
  story: [["solo", "Solo", "compass"], ["gm", "GM", "dice"]],
  book: [["rules", "Rules", "book"], ["about", "Settings", "gear"]],
};
const groupOf = (route) => Object.keys(GROUPS).find((g) => g === route || GROUPS[g].some(([r]) => r === route)) || (route === "sheet" ? "home" : route);
const allowed = (route) => route === "solo" ? Settings.soloMode() : route === "gm" ? GM.enabled() : true;

export const Router = {
    route: "home",
    // Pick the concrete screen for a group tab: the last one used, else the first available.
    resolve(route) {
      if (!GROUPS[route]) return route;
      let last = null; try { last = localStorage.getItem("dragonbane.last." + route); } catch (_) {}
      const opts = GROUPS[route].map(([r]) => r).filter(allowed);
      if (last && opts.includes(last)) return last;
      return opts[0] || route; // "story" with nothing on → the chooser screen
    },
    go(route) {
      closeAllModals();
      document.querySelectorAll(".toast").forEach((t) => t.remove()); // stale notices don't follow you
      document.documentElement.style.setProperty("--mini-h", "0px");
      if (route !== "sheet") window.activeCharacterId = null;
      route = this.resolve(route);
      if (!allowed(route)) route = this.resolve("story");
      const grp = groupOf(route);
      if (GROUPS[grp] && route !== grp) { try { localStorage.setItem("dragonbane.last." + grp, route); } catch (_) {} }
      const screen = $("#screen");
      screen.innerHTML = "";
      const screenFn = Screens[route] || Screens.home;
      const node = screenFn.call(Screens); // bind `this` = Screens for screen methods
      if (GROUPS[grp] && route !== grp) node.insertBefore(this.modeSwitch(grp, route), node.firstChild);
      screen.appendChild(node);
      screen.dataset.route = route;
      this.route = route;
      if (screen.firstElementChild) screen.firstElementChild.classList.add("screen-in");
      this.setActive(grp);
      window.scrollTo(0, 0);
      this.updateBadges();
      Action.update();
    },
    setActive(grp) {
      document.querySelectorAll("#app-nav button[data-route]").forEach((b) => {
        const on = b.dataset.route === grp;
        b.classList.toggle("active", on);
        if (on) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
    },
    // Segmented switch at the top of a grouped screen (Solo | GM, Rules | Settings).
    // A mode that is switched off still shows; tapping it offers to turn it on.
    modeSwitch(grp, route) {
      const nav = el(`<nav class="mode-switch" aria-label="${grp === "story" ? "Story mode" : "Book section"}"></nav>`);
      GROUPS[grp].forEach(([r, label, ic]) => {
        const on = r === route, ok = allowed(r);
        const b = el(`<button type="button" class="ms-btn${on ? " on" : ""}${ok ? "" : " off"}" data-mode="${r}"${on ? ' aria-current="page"' : ""}>${icon(ic, "ic ms-ic")}<span>${label}</span>${ok ? "" : '<span class="ms-plus" aria-hidden="true">+</span>'}</button>`);
        b.onclick = async () => {
          if (on) return;
          if (!ok) {
            const what = r === "solo" ? "Solo mode — the app answers your questions as the world" : "the GM screen — party, phases and monsters";
            if (!(await confirmModal(`Turn on ${what}?`, { title: `Turn on ${label}`, okText: "Turn on" }))) return;
            Settings.set(r === "solo" ? "soloMode" : "gmScreen", true);
          }
          this.go(r);
        };
        nav.appendChild(b);
      });
      return nav;
    },
    // Nav badges: gold dot on Fight while a round runs; red dot on Hero when a
    // hero is at 0 HP; blue dot on Hero for unread GM messages.
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
      window.addEventListener("db:changed", () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; this.updateBadges(); Action.update(); }); });
      window.addEventListener("table:changed", () => Action.update());
      // Programmatic navigation (coach marks, deep links, tests): dispatch db:go with a route.
      document.addEventListener("db:go", (e) => this.go(e.detail));
      document.querySelectorAll("#app-nav button[data-route]").forEach((b) =>
        b.addEventListener("click", () => this.go(b.dataset.route)));
      Action.init();
      this.go("home");
    }
  };

  /* =================================================================
   * Bootstrap
   * ================================================================= */
