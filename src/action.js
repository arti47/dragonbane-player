/* action.js — the docked context button (centre of the nav). It always shows the
   one next thing to do, worked out from where you are and the state of play:
   dying hero → Death roll · your initiative turn → Your turn · a fight running →
   Fight / Next turn · GM calls a rest or session end → Rest / Advance · otherwise
   the screen's main action (New hero, Play, Roll, Ask, Add …). Every action calls
   an existing function — this module adds no rules of its own. */
import { $, el, esc } from './core.js';
import { modal } from './ui.js';
import { icon } from './icons.js';
import { emblem } from './graphics.js';
import { Store } from './store.js';
import { Combat } from './combat.js';
import { Table } from './table.js';
import { Sheet } from './sheet.js';
import { Roller } from './roller.js';
import { Wizard } from './wizard.js';
import { Router } from './router.js';

const goto = (r) => Router.go(r);

export const Action = {
  btn() { return document.getElementById("ctx-action"); },
  // The hero the context refers to: the open sheet, else the last one played, else the first of mine.
  hero() {
    let last = null; try { last = localStorage.getItem("dragonbane.lastHero"); } catch (_) {}
    return Store.get(window.activeCharacterId) || Store.get(last) || Table.myHeroes()[0] || null;
  },
  compute() {
    const route = ($("#screen") && $("#screen").dataset.route) || "home";
    const h = this.hero();
    const cs = Combat.load();
    const fight = !!(cs.round && cs.combatants.length);
    if (route === "sheet" && h && h.state.hp <= 0 && !((h.state.deathRolls || {}).failures >= 3))
      return { key: "death", ic: "skull", label: "Death roll", run: () => Sheet.deathRollModal(h.id) };
    if (fight) {
      const cur = Combat.ordered(cs).filter((c) => c.init != null).find((c) => !c.done);
      const mine = new Set(Table.myHeroes().map((c) => c.id));
      if (cur && cur.kind === "hero" && mine.has(cur.charId) && !(Table.synced() && Table.isGm()))
        return { key: "turn", ic: "swords", label: "Your turn", hot: true, run: () => { goto("party"); setTimeout(() => Combat.focusTurn && Combat.focusTurn(cur.id), 30); } };
      if (route === "party") {
        if (Combat.isGm()) return { key: "next", ic: "refresh", label: "Next turn", run: () => Combat.nextTurn() };
      } else return { key: "fight", ic: "swords", label: "Fight", hot: true, run: () => goto("party") };
    }
    const ph = Table.phase();
    if (h && ph && ph.key === "rest") return { key: "rest", ic: "tent", label: "Rest", run: () => this.restPicker(h) };
    if (h && ph && ph.key === "end") return { key: "adv", ic: "medal", label: "Advance", run: () => { Sheet.open(h.id); Sheet.endSession(); } };
    if (route === "sheet" && h) return { key: "roll", ic: "dice", label: "Roll", run: () => this.rollPicker(h) };
    if (route === "solo") return { key: "ask", ic: "question", label: "Ask", run: () => { const b = $("#solo-f-roll"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "center" }); b.click(); } } };
    if (route === "party") return { key: "add", ic: "people", label: "Add", run: () => { const d = $("#screen .add-panel"); if (d) { d.open = true; window._combatAddOpen = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } } };
    if (!h) return { key: "new", ic: "sparkle", label: "New hero", run: () => Wizard.start() };
    return { key: "play", ic: "person", label: "Play", run: () => Sheet.open(h.id) };
  },
  update() {
    const b = this.btn(); if (!b) return;
    let a; try { a = this.compute(); } catch (_) { a = null; }
    this.cur = a;
    b.hidden = !a;
    if (!a) return;
    if (b.dataset.key !== a.key) {
      b.dataset.key = a.key;
      b.innerHTML = `<span class="ca-seal" aria-hidden="true">${icon(a.ic, "ic ca-ic")}</span><span class="ca-lbl">${esc(a.label)}</span>`;
      b.classList.remove("ca-pop"); void b.offsetWidth; b.classList.add("ca-pop");
    }
    b.classList.toggle("hot", !!a.hot);
    b.setAttribute("aria-label", a.label);
  },
  // "Roll": every skill as a tile, trained first; tap one to roll it.
  rollPicker(h) {
    const m = modal(`Roll — ${h.identity.name}`);
    const conds = h.state.conditions || {};
    const baned = new Set((window.DRAGONBANE.conditions || []).filter((cn) => conds[cn.key]).map((cn) => cn.attribute));
    const grid = el(`<div class="dice-board"></div>`);
    Object.entries(h.skills).sort((a, b) => (b[1].trained - a[1].trained) || a[0].localeCompare(b[0])).forEach(([n, v]) => {
      const t = el(`<button type="button" class="db-tile${v.trained ? " trained" : ""}${baned.has(v.attribute) ? " baned" : ""}" aria-label="Roll ${esc(n)}, ${v.level}">${emblem("attr", v.attribute, "emb db-emb")}<b class="db-lvl">${v.level}</b><span class="db-name">${esc(n)}</span></button>`);
      t.onclick = () => { m.close(); Roller.skill(h.id, n); };
      grid.appendChild(t);
    });
    m.body.appendChild(grid);
  },
  restPicker(h) {
    const m = modal(`Rest — ${h.identity.name}`);
    const row = el(`<div class="rest-pick"></div>`);
    [["round", "Round", "+D6 WP"], ["stretch", "Stretch", "HP · WP · 1 condition"], ["shift", "Shift", "Everything"]].forEach(([k, l, s]) => {
      const b = el(`<button type="button" class="rp-btn">${icon(k === "shift" ? "bed" : "tent", "ic rp-ic")}<b>${l}</b><small>${s}</small></button>`);
      b.onclick = () => { m.close(); Sheet.open(h.id); Sheet.rest(k); };
      row.appendChild(b);
    });
    m.body.appendChild(row);
  },
  init() {
    const b = this.btn(); if (!b) return;
    b.addEventListener("click", () => { if (this.cur) this.cur.run(); });
  },
};
