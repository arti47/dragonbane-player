/* onboard.js — first-run welcome flow + coach marks.
   Onboard: a full-screen, three-question start (how well do you know the game →
   how will you play → get a hero). Coach: a short guided tour on the hero sheet
   (beginners get it automatically; Settings can replay it). Nothing here changes
   a rule — choices only set device settings or call the existing hero makers. */
import { $, el, esc, uid } from './core.js';
import { icon } from './icons.js';
import { illo } from './graphics.js';
import { Settings } from './settings.js';
import { Store } from './store.js';
import { Combat } from './combat.js';
import { Table } from './table.js';
import { Wizard, Pregens } from './wizard.js';
import { Router } from './router.js';
import { effHpMax, effWpMax, heroArmor } from './derived.js';

const card = (key, ic, title, line) => `<button type="button" class="ob-card" data-k="${key}"><span class="ob-ic" aria-hidden="true">${icon(ic, "ic")}</span><b>${title}</b><small>${line}</small></button>`;

export const Onboard = {
  KEY: "dragonbane.welcomed",
  start() {
    const ov = el(`<div class="onboard" role="dialog" aria-modal="true" aria-labelledby="ob-q"><div class="ob-inner"></div></div>`);
    document.body.appendChild(ov);
    document.documentElement.classList.add("ob-open");
    const inner = ov.querySelector(".ob-inner");
    const done = () => { ov.remove(); document.documentElement.classList.remove("ob-open"); try { localStorage.setItem(this.KEY, "1"); } catch (_) {} };
    const step = (n, art, q, cards, onPick, skip) => {
      inner.innerHTML = `<div class="ob-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i === n ? "on" : i < n ? "done" : ""}"></i>`).join("")}</div>
        <div class="ob-art">${art}</div><h2 id="ob-q" class="ob-q">${q}</h2><div class="ob-cards">${cards}</div>
        <button type="button" class="ob-skip">${skip || "Skip"}</button>`;
      inner.querySelectorAll(".ob-card").forEach((b) => b.onclick = () => onPick(b.dataset.k));
      inner.querySelector(".ob-skip").onclick = () => { done(); Router.go("home"); };
      const first = inner.querySelector(".ob-card"); if (first) first.focus();
    };
    const s3 = () => step(2, illo("campfire"), "Get a hero",
      card("quick", "dice", "Quick hero", "Ready in one tap") + card("pregen", "person", "Pre-made", "A Core Set hero") + card("build", "wand", "Build my own", "Step by step"),
      (k) => { done(); if (k === "quick") Wizard.quick(); else if (k === "pregen") Pregens.open(); else Wizard.start(); }, "Later");
    const s2 = () => step(1, illo("swords"), "How will you play?",
      card("solo", "compass", "Solo", "The app is the world") + card("group", "people", "With a GM", "Friends at a table") + card("gm", "dice", "I'm the GM", "Run the game"),
      (k) => { Settings.set("soloMode", k === "solo"); if (k === "gm") Settings.set("gmScreen", true); s3(); });
    step(0, illo("dragon"), "Welcome, adventurer. How well do you know Dragonbane?",
      card("beginner", "sparkle", "New to it", "Show me everything") + card("standard", "book", "Played a little", "Keep it simple") + card("expert", "medal", "Veteran", "Every option, always"),
      (k) => { Settings.setLevel(k); Table.applyBeginner(); if (k === "beginner") Coach.arm(); s2(); });
  },
};

/* ---- Coach marks: a spotlight + a speech bubble, one step at a time ---- */
const STEPS = [
  { sel: ".hero-top .stat-block", text: "Six attributes. Every skill grows from one of them." },
  { sel: ".hero-top .vitals", text: "Hit Points keep you alive; Willpower fuels magic and heroic abilities. Tap − when you're hurt." },
  { sel: "#ctx-action", text: "This seal always shows your next move. Tap it now to roll a skill.", waitClick: true },
  { sel: "#app-nav [data-route='party']", text: "Fights happen here. Want a practice fight against a goblin scout?", fight: true },
  { sel: "#ctx-action", text: "In a fight, the seal runs the turns. That's the whole loop — you're ready!", last: true },
];

export const Coach = {
  KEY: "dragonbane.coach",
  arm() { try { localStorage.setItem(this.KEY, "0"); } catch (_) {} },
  state() { try { return localStorage.getItem(this.KEY); } catch (_) { return null; } },
  // Called whenever the hero sheet mounts: resume an armed tour.
  maybe() {
    const st = this.state();
    if (st == null || st === "done" || this._on) return;
    setTimeout(() => this.show(+st || 0), 350);
  },
  start() { this.arm(); this.maybe(); },
  end() { try { localStorage.setItem(this.KEY, "done"); } catch (_) {} this.clear(); this._on = false; },
  clear() { document.querySelectorAll(".coach-spot, .coach-bubble").forEach((n) => n.remove()); window.removeEventListener("resize", this._place); window.removeEventListener("scroll", this._place); },
  show(i) {
    this.clear();
    const s = STEPS[i]; if (!s) { this.end(); return; }
    const target = $(s.sel);
    if (!target) { this.end(); return; }
    this._on = true;
    try { localStorage.setItem(this.KEY, String(i)); } catch (_) {}
    if (!s.sel.startsWith("#")) target.scrollIntoView({ block: "center" });
    const spot = el(`<div class="coach-spot" aria-hidden="true"></div>`);
    const bub = el(`<div class="coach-bubble" role="dialog" aria-live="polite"><p>${esc(s.text)}</p><div class="cb-acts"></div><span class="cb-step">${i + 1} / ${STEPS.length}</span></div>`);
    const acts = bub.querySelector(".cb-acts");
    const next = () => this.show(i + 1);
    if (s.fight) {
      const yes = el(`<button type="button" class="btn">Practice fight</button>`); yes.onclick = () => { this.practice(); this.show(i + 1); };
      const no = el(`<button type="button" class="btn ghost">Not now</button>`); no.onclick = () => this.end();
      acts.append(yes, no);
    } else if (s.waitClick) {
      const skip = el(`<button type="button" class="btn ghost">Skip tour</button>`); skip.onclick = () => this.end();
      acts.append(skip);
      const once = () => { target.removeEventListener("click", once); setTimeout(() => { if (this._on) this.waitModal(() => this.show(i + 1)); }, 50); };
      target.addEventListener("click", once);
      spot.classList.add("pass");
    } else {
      const n = el(`<button type="button" class="btn">${s.last ? "Done" : "Next"}</button>`); n.onclick = () => (s.last ? this.end() : next());
      acts.append(n);
      if (!s.last) { const skip = el(`<button type="button" class="btn ghost">Skip tour</button>`); skip.onclick = () => this.end(); acts.append(skip); }
    }
    document.body.append(spot, bub);
    this._place = () => {
      const r = target.getBoundingClientRect(), pad = 6;
      Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
      const bw = Math.min(320, window.innerWidth - 24);
      bub.style.width = bw + "px";
      bub.style.left = Math.max(12, Math.min(window.innerWidth - bw - 12, r.left + r.width / 2 - bw / 2)) + "px";
      const below = r.bottom + 14 + bub.offsetHeight < window.innerHeight;
      bub.style.top = (below ? r.bottom + 14 : Math.max(12, r.top - bub.offsetHeight - 14)) + "px";
      bub.classList.toggle("above", !below);
    };
    this._place();
    window.addEventListener("resize", this._place);
    window.addEventListener("scroll", this._place, { passive: true });
    const b = bub.querySelector(".btn"); if (b) b.focus();
  },
  // Wait until the roll dialog the user opened is closed, then continue.
  waitModal(cb) {
    this.clear();
    const t = setInterval(() => { if (!document.querySelector(".modal-back")) { clearInterval(t); cb(); } }, 300);
  },
  // A practice fight: your hero against one rulebook goblin scout (real stats, real rules).
  practice() {
    const h = Store.get(window.activeCharacterId) || Table.myHeroes()[0];
    const g = (window.DRAGONBANE_NPCS || []).find((n) => n.id === "goblin_scout");
    if (!h || !g) return;
    Combat.mutate((st) => {
      if (!st.combatants.some((c) => c.charId === h.id)) st.combatants.push({ id: uid(), name: h.identity.name, kind: "hero", charId: h.id, init: null, done: false, hp: h.state.hp, maxHp: effHpMax(h), wp: h.state.wp, maxWp: effWpMax(h), armor: heroArmor(h) });
      st.combatants.push({ id: uid(), name: g.name, kind: "npc", npcId: g.id, init: null, done: false, hp: g.hp, maxHp: g.hp, wp: g.wp || null, maxWp: g.wp || null, armor: g.armor || 0, desc: g.desc || "", weapons: g.weapons || null, spells: g.spells || null });
    });
    Router.go("party");
  },
};
