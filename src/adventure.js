/* adventure.js — the Adventure feed: the Story tab's one screen for solo and group play.
   The whole game writes itself into it as short prose with the mechanics in small print:
   skill / attack / cast / death rolls (via Table.logRoll → "adv:roll"), rests ("adv:rest"
   from Sheet.rest), HP / WP / conditions / gear / coins / skill and ability changes on the
   heroes this device plays (a diff watcher), the fight (start, blows, foes falling, a summary
   card), GM phases and messages, and every solo-tool result. Play is organised as sessions →
   scenes (place + hook), with a shift clock (Morning · Day · Evening · Night) whose turning
   re-opens the once-per-shift round and stretch rests. Quests (open threads), NPCs and places
   visited are kept with the story. A prompt bar asks "What do you do?" with chips that fit the
   moment; during a fight a pinned fight card takes its place.
   Storage: dragonbane.adventure:<scope> — scope = camp:<id> (synced campaign, one shared party
   feed at campaigns/{id}/adventure/{meta,entries}), hero:<id> (Solo mode with a linked hero),
   or local. No rules live here: every action calls an existing rules function. */
import { $, DB, Dice, el, esc, sectionTitle, uid, helpBox } from './core.js';
import { modal, showToast, confirmModal, promptModal, closeAllModals } from './ui.js';
import { icon } from './icons.js';
import { crest, illo, dayDial, emblem } from './graphics.js';
import { Settings } from './settings.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Table } from './table.js';
import { Combat } from './combat.js';
import { Roller } from './roller.js';
import { Sheet } from './sheet.js';
import { SoloMode } from './solo.js';
import { Action } from './action.js';
import { Router } from './router.js';
import { effHpMax, effWpMax, heroArmor } from './derived.js';
import { openChapter } from './library.js';

const SHIFTS = ["Morning", "Day", "Evening", "Night"];
const SHIFT_LINE = ["Morning comes.", "The day wears on.", "Evening falls.", "Night closes in."];
const blank = () => ({ v: 1, sessions: [], scenes: [], entries: [], clock: { day: 1, shift: 0 }, threads: [], npcs: [], places: [], fight: null });
const LISTS = ["sessions", "scenes", "entries", "threads", "npcs", "places"];
const pick = (arr, seed) => arr[Math.abs(seed | 0) % arr.length];
const ini = (n) => { const w = String(n || "?").trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); };
const ENTRY_IC = { roll: "dice", attack: "swords", cast: "sparkle", death: "skull", rest: "tent", time: "hourglass", hurt: "drop", heal: "heart", cond: "warn", loot: "pack", coin: "scales", adv: "medal", fight: "swords", foe: "swords", round: "hourglass", oracle: "orb", inspire: "bulb", twist: "dragon", travel: "tree", camp: "tent", mishap: "storm", note: "journal", gm: "horn", phase: "compass", quest: "thread", npc: "people", solo: "medal" };

export const Adventure = {
  remote: null,     // synced campaign: { ...meta, entries }
  refs: [],
  _snaps: {},       // heroId → last seen snapshot (diff watcher)
  _quiet: {},       // heroId → ts: skip HP/WP lines right after a rest (the rest line says it)
  _cb: null,        // last seen combat snapshot

  // ---- Where the story lives --------------------------------------------
  synced() { return Table.synced(); },
  scope() {
    if (this.synced()) return "camp:" + Sync.campaign.id;
    if (Settings.soloMode() && SoloMode.heroId()) return "hero:" + SoloMode.heroId();
    return "local";
  },
  key() { return "dragonbane.adventure:" + this.scope(); },
  // Who runs scenes, the clock and sessions: the GM in a synced campaign, anyone otherwise.
  canRun() { return !this.synced() || Table.isGm(); },
  norm(st) {
    const b = blank();
    Object.keys(b).forEach((k) => { if (st[k] == null) st[k] = b[k]; });
    LISTS.forEach((k) => { if (!Array.isArray(st[k])) st[k] = st[k] && typeof st[k] === "object" ? Object.values(st[k]) : []; });
    st.clock = { day: +st.clock.day || 1, shift: +st.clock.shift || 0, restAt: st.clock.restAt || 0 };
    return st;
  },
  load() {
    let st = null;
    if (this.synced()) st = this.remote ? JSON.parse(JSON.stringify(this.remote)) : null;
    else { try { st = JSON.parse(localStorage.getItem(this.key())); } catch (_) { st = null; } }
    return this.norm(st || this.migrate());
  },
  // The old solo journal (scene note, log, threads, NPCs) becomes the start of this story.
  migrate() {
    const st = blank(); const s = this.scope();
    const jk = s.startsWith("hero:") ? "dragonbane.soloJournal:" + s.slice(5) : s === "local" ? "dragonbane.soloJournal:global" : null;
    let j = null; try { j = jk && JSON.parse(localStorage.getItem(jk)); } catch (_) { j = null; }
    if (!j) return st;
    st.entries = (j.entries || []).filter((e) => e && e.text).map((e) => ({ id: uid(), ts: e.ts || Date.now(), kind: e.kind || "note", text: e.text }));
    st.threads = (j.threads || []).map((t) => ({ id: t.id || uid(), text: t.text, done: !!t.done }));
    st.npcs = (j.npcs || []).map((n) => ({ id: n.id || uid(), name: n.name, note: n.note || "" }));
    if (j.scene) {
      const ses = { id: uid(), n: 1, startedAt: Date.now() }; st.sessions.push(ses);
      st.scenes.push({ id: uid(), sessionId: ses.id, place: "Where we left off", hook: j.scene, startedAt: Date.now(), day: 1, shift: 0 });
    }
    return st;
  },
  // Write the state (meta) and append new entries.
  write(st, adds = [], meta = true) {
    const sc = this.scene(st);
    adds.forEach((e) => { e.id = e.id || uid(); e.ts = e.ts || Date.now(); if (!e.sceneId && sc) e.sceneId = sc.id; if (Sync && Sync.uid) e.by = Sync.uid; Object.keys(e).forEach((k) => e[k] == null && delete e[k]); });
    if (this.synced()) {
      const base = `campaigns/${Sync.campaign.id}/adventure`;
      if (meta) { const m = { ...st }; delete m.entries; this.remote = { ...st, entries: (this.remote && this.remote.entries) || [] }; Sync.db.ref(base + "/meta").set(JSON.parse(JSON.stringify(m))).catch(() => {}); }
      adds.forEach((e) => { const { id, ...rest } = e; Sync.db.ref(base + "/entries").push(rest).catch(() => {}); });
    } else {
      st.entries.push(...adds);
      st.entries = st.entries.slice(-400);
      try { localStorage.setItem(this.key(), JSON.stringify(st)); } catch (_) {}
    }
    this.changed();
  },
  attach() {
    this.detach();
    if (!this.synced()) return;
    const base = `campaigns/${Sync.campaign.id}/adventure`;
    this.remote = blank();
    const me = Sync.db.ref(base + "/meta");
    me.on("value", (s) => { const ents = (this.remote && this.remote.entries) || []; this.remote = { ...this.norm(s.val() || {}), entries: ents }; this.clockSeen(this.remote.clock); this.changed(); });
    const en = Sync.db.ref(base + "/entries").limitToLast(300);
    en.on("value", (s) => { const l = []; s.forEach((x) => { l.push({ id: x.key, ...x.val() }); }); l.sort((a, b) => a.ts - b.ts); this.remote = { ...(this.remote || blank()), entries: l }; this.changed(); });
    this.refs = [me, en];
  },
  detach() { this.refs.forEach((r) => r.off()); this.refs = []; this.remote = null; this._clockIdx = null; },
  changed() {
    try { window.dispatchEvent(new Event("adventure:changed")); } catch (_) {}
    if (this._refresh && $("#screen").dataset.route === "adventure") this._refresh();
  },
  hasStory() { try { const st = this.load(); return st.entries.length > 0 || st.scenes.length > 0; } catch (_) { return false; } },

  // ---- Sessions, scenes, clock -------------------------------------------
  session(st) { return [...st.sessions].reverse().find((s) => !s.endedAt) || null; },
  scene(st) { return [...st.scenes].reverse().find((s) => !s.endedAt) || null; },
  clockText(c) { return `Day ${c.day} · ${SHIFTS[c.shift] || SHIFTS[0]}`; },
  openSession(st, adds) {
    let s = this.session(st);
    if (!s) { s = { id: uid(), n: st.sessions.length + 1, startedAt: Date.now() }; st.sessions.push(s); adds.push({ kind: "session", text: `Session ${s.n} begins`, mech: this.clockText(st.clock) }); }
    return s;
  },
  post(e) {
    const st = this.load(); const adds = [];
    const had = !!this.session(st);
    this.openSession(st, adds);
    adds.push({ kind: e.kind || "note", text: e.text || "", mech: e.mech || null, tone: e.tone || null, hero: e.hero || null });
    this.write(st, adds, !had);
  },
  startScene({ place, hook, passShift }) {
    const st = this.load(); const adds = [];
    const ses = this.openSession(st, adds);
    const old = this.scene(st);
    if (old) { old.endedAt = Date.now(); old.summary = old.summary || this.sceneStats(st, old); adds.push({ kind: "sceneEnd", sceneId: old.id, text: old.place, mech: old.summary }); }
    if (passShift) adds.push(this.advance(st));
    place = String(place || "").trim() || "Somewhere new";
    const sc = { id: uid(), sessionId: ses.id, place, hook: String(hook || "").trim(), startedAt: Date.now(), day: st.clock.day, shift: st.clock.shift };
    st.scenes.push(sc);
    const p = st.places.find((x) => x.name.toLowerCase() === place.toLowerCase());
    if (p) p.count = (p.count || 1) + 1; else st.places.push({ name: place, first: Date.now(), count: 1 });
    adds.push({ kind: "scene", sceneId: sc.id, text: place, mech: sc.hook || null });
    this.write(st, adds);
  },
  // "4 rolls · 1 Dragon · 7 damage taken · 2 foes down" for a scene.
  sceneStats(st, sc) {
    const es = st.entries.filter((e) => e.sceneId === sc.id);
    const rolls = es.filter((e) => ["roll", "attack", "cast", "death"].includes(e.kind)).length;
    const dragons = es.filter((e) => e.tone === "dragon").length, demons = es.filter((e) => e.tone === "demon").length;
    const dmg = es.filter((e) => e.kind === "hurt").reduce((a, e) => a + (+e.n || 0), 0);
    const down = es.filter((e) => e.kind === "foe" && e.tone === "down").length;
    const bits = [];
    if (rolls) bits.push(`${rolls} roll${rolls > 1 ? "s" : ""}`);
    if (dragons) bits.push(`${dragons} Dragon${dragons > 1 ? "s" : ""}`);
    if (demons) bits.push(`${demons} Demon${demons > 1 ? "s" : ""}`);
    if (dmg) bits.push(`${dmg} damage taken`);
    if (down) bits.push(`${down} foe${down > 1 ? "s" : ""} down`);
    return bits.join(" · ") || "a quiet scene";
  },
  endScene(summary) {
    const st = this.load(); const sc = this.scene(st); if (!sc) return;
    sc.endedAt = Date.now(); sc.summary = String(summary || "").trim() || this.sceneStats(st, sc);
    this.write(st, [{ kind: "sceneEnd", sceneId: sc.id, text: sc.place, mech: sc.summary }]);
  },
  // One shift passes: the clock turns and once-per-shift rests come back (core rule).
  advance(st) {
    st.clock.shift += 1;
    if (st.clock.shift > 3) { st.clock.shift = 0; st.clock.day += 1; }
    this._clockIdx = st.clock.day * 4 + st.clock.shift;
    this.resetRests();
    return { kind: "time", text: SHIFT_LINE[st.clock.shift], mech: this.clockText(st.clock) };
  },
  passShift(why) {
    const st = this.load(); const adds = [];
    this.openSession(st, adds);
    const t = this.advance(st);
    if (why) t.text = why + " " + t.text;
    adds.push(t);
    this.write(st, adds);
  },
  resetRests() {
    Table.myHeroes().forEach((h) => { if (h.state && (h.state.roundRestUsed || h.state.stretchRestUsed)) Store.update(h.id, (ch) => { ch.state.roundRestUsed = false; ch.state.stretchRestUsed = false; }); });
  },
  // A synced player sees the GM turn the clock: their own heroes' once-per-shift rests come back.
  clockSeen(c) {
    const idx = (c.day || 1) * 4 + (c.shift || 0);
    if (this._clockIdx != null && idx > this._clockIdx) this.resetRests();
    this._clockIdx = idx;
  },
  sessionRecap(st, ses) {
    const scenes = st.scenes.filter((s) => s.sessionId === ses.id);
    const ids = new Set(scenes.map((s) => s.id));
    const es = st.entries.filter((e) => e.ts >= ses.startedAt && (!e.sceneId || ids.has(e.sceneId)));
    const places = [...new Set(scenes.map((s) => s.place))];
    const rolls = es.filter((e) => ["roll", "attack", "cast", "death"].includes(e.kind)).length;
    const dragons = es.filter((e) => e.tone === "dragon").length, demons = es.filter((e) => e.tone === "demon").length;
    const down = es.filter((e) => e.kind === "foe" && e.tone === "down").length;
    const ups = es.filter((e) => e.kind === "adv").map((e) => e.text);
    const quests = st.threads.filter((t) => t.done && t.doneAt >= ses.startedAt).map((t) => t.text);
    const lines = [];
    lines.push(places.length ? `Visited ${places.join(", ")}.` : "No scenes this session.");
    const b = [];
    if (rolls) b.push(`${rolls} rolls`); if (dragons) b.push(`${dragons} Dragon${dragons > 1 ? "s" : ""}`); if (demons) b.push(`${demons} Demon${demons > 1 ? "s" : ""}`); if (down) b.push(`${down} foe${down > 1 ? "s" : ""} defeated`);
    if (b.length) lines.push(b.join(" · ") + ".");
    if (quests.length) lines.push(`Quests resolved: ${quests.join("; ")}.`);
    if (ups.length) lines.push(ups.join(" "));
    return lines.join(" ");
  },
  // End the session: close the scene, write the recap, then advancement through the
  // rules' own flows (group: the five questions + rolls; solo: Mission +5 when earned).
  async endSession() {
    if (!(await confirmModal("End the session? The scene closes, a recap is written, then advancement.", { title: "End session", okText: "End session" }))) return;
    const st = this.load(); const ses = this.session(st); const adds = [];
    const sc = this.scene(st);
    if (sc) { sc.endedAt = Date.now(); sc.summary = sc.summary || this.sceneStats(st, sc); adds.push({ kind: "sceneEnd", sceneId: sc.id, text: sc.place, mech: sc.summary }); }
    let recap = "A short session.";
    if (ses) { recap = this.sessionRecap(st, ses); ses.endedAt = Date.now(); ses.recap = recap; adds.push({ kind: "sessionEnd", text: `Session ${ses.n} ends`, mech: recap }); }
    this.write(st, adds);
    const h = this.hero();
    if (Settings.soloMode()) {
      const m = modal("Session over");
      m.body.appendChild(el(`<p class="modal-msg">${esc(recap)}</p>`));
      if (h) {
        const mb = el(`<button class="btn block">🏅 Mission complete — mark 5 skills</button>`);
        mb.onclick = () => { m.close(); Sheet.use(h.id); Sheet.soloMissionMarks(); };
        m.body.appendChild(mb);
      }
      const ok = el(`<button class="btn ghost block u-mt2">Not yet — keep going next time</button>`); ok.onclick = () => m.close(); m.body.appendChild(ok);
      return;
    }
    if (this.synced() && Table.isGm()) Table.partyAction("endSession");
    const mine = Table.myHeroes();
    const run = (c) => { Sheet.use(c.id); Sheet.endSession(); };
    if (this.synced() && Table.isGm() && !mine.some((c) => c.owner === Sync.uid)) return;
    if (h) run(h); else if (mine.length === 1) run(mine[0]);
  },

  // ---- The hero this device plays in the feed ----------------------------
  hero() {
    if (Settings.soloMode()) { const l = SoloMode.linkedHero(); if (l) return l; }
    let last = null; try { last = localStorage.getItem("dragonbane.lastHero"); } catch (_) {}
    const mine = Table.myHeroes();
    return mine.find((c) => c.id === last) || mine[0] || null;
  },
  setHero(id) {
    try { if (id) localStorage.setItem("dragonbane.lastHero", id); } catch (_) {}
    if (Settings.soloMode()) SoloMode.setHero(id || null);
  },

  // ---- Prose ---------------------------------------------------------------
  // A roll from Table.logRoll → one line of story + the numbers in small print.
  fromRoll(e) {
    const h = e.hero || "Someone", seed = (e.roll || 0) + String(e.label || "").length + (e.ts || 0);
    const res = e.dragon ? "Dragon" : e.demon ? "Demon" : e.success ? "success" : "failure";
    const tone = e.dragon ? "dragon" : e.demon ? "demon" : e.success ? "ok" : "bad";
    const mech = `${e.label || ""}${e.roll != null ? ` · ${e.roll}${e.target != null ? " vs " + e.target : ""}` : ""} · ${res}${e.pushed ? ` · pushed (${e.pushed})` : ""}`;
    let text;
    if (e.kind === "solo") { this.post({ kind: "solo", text: `${h} returns from the mission — ${String(e.text || "").replace(/^solo mission — /, "")}.`, tone: "adv", hero: h }); return; }
    const sk = e.label || "it";
    if (e.kind === "attack") {
      const w = String(e.label || "weapon").toLowerCase();
      text = e.dragon ? pick([`${h} lands a perfect blow with the ${w}!`, `A Dragon — ${h}'s ${w} strikes true and deep.`], seed)
        : e.demon ? pick([`${h} fumbles the ${w}!`, `A Demon — ${h}'s ${w} goes horribly wrong.`], seed)
        : e.success ? pick([`${h} strikes with the ${w}.`, `${h}'s ${w} finds its mark.`, `${h} lands a blow with the ${w}.`], seed)
        : pick([`${h} swings the ${w} and misses.`, `${h}'s ${w} cuts only air.`, `${h}'s attack is turned aside.`], seed);
    } else if (e.kind === "cast") {
      const sp = String(e.label || "").replace(/^Cast /, "");
      text = e.dragon ? `${h} casts ${sp} — the magic surges with dragon-fire!` : e.demon ? `${h}'s ${sp} backfires — magic runs wild!`
        : e.success ? pick([`${h} casts ${sp}.`, `${h} speaks the words: ${sp} takes hold.`], seed) : pick([`${h}'s ${sp} fizzles.`, `${h} reaches for ${sp}, but the power slips away.`], seed);
    } else if (e.kind === "death") {
      text = e.dragon ? `${h} fights back from the brink!` : e.demon ? `${h} slips much closer to death.` : e.success ? `${h} clings to life.` : `${h} slips closer to death.`;
    } else {
      text = e.dragon ? pick([`A Dragon! ${h}'s ${sk} succeeds brilliantly.`, `${h} pulls off ${sk} like a legend.`], seed)
        : e.demon ? pick([`A Demon! ${h}'s ${sk} goes badly wrong.`, `${h}'s ${sk} turns to disaster.`], seed)
        : e.success ? pick([`${h} tries ${sk} — and it works.`, `${h}'s ${sk} holds true.`, `${h} pulls it off with ${sk}.`], seed)
        : pick([`${h} tries ${sk}, but it doesn't work out.`, `${h}'s ${sk} falls short.`, `${h} attempts ${sk} and fails.`], seed);
    }
    if (e.pushed) text = `${h} pushes on, ${String(e.pushed).toLowerCase()} — ` + text.charAt(0).toLowerCase() + text.slice(1);
    this.post({ kind: e.kind === "skill" ? "roll" : e.kind, text, mech, tone, hero: h });
  },
  fromRest(d) {
    const c = Store.get(d.charId); if (!c) return;
    const h = c.identity.name;
    this._quiet[c.id] = Date.now() + 2500;
    this.snapAll(); // the rest line covers the numbers
    if (d.kind === "shift") {
      const st = this.load(); const adds = [];
      this.openSession(st, adds);
      adds.push({ kind: "rest", text: `${h} sleeps through a shift.`, mech: d.text, tone: "ok", hero: h });
      // A party sleeping together is one shift: only the first rest in a few minutes turns the clock.
      if (this.canRun() && Date.now() - (st.clock.restAt || 0) > 10 * 60 * 1000) { st.clock.restAt = Date.now(); adds.push(this.advance(st)); }
      this.write(st, adds);
      return;
    }
    this.post({ kind: "rest", text: d.kind === "round" ? `${h} catches their breath.` : `${h} takes a stretch to tend wounds.`, mech: `${d.kind === "round" ? "Round" : "Stretch"} rest · ${d.text}`, tone: "ok", hero: h });
  },
  fromPhase(key) {
    if (!key || key === "combat" || !this.canRun()) return;
    const p = { explore: "The party explores.", travel: "The party sets off on the road.", rest: "The party makes camp to rest.", downtime: "Time to rest, shop and train.", end: "The session draws to a close." }[key];
    if (p) this.post({ kind: "phase", text: p, tone: "gm" });
  },

  // ---- Change watcher: heroes this device plays --------------------------
  snap(c) {
    const items = {};
    ((c.inventory && c.inventory.items) || []).forEach((i) => { const n = i && i.name; if (n) items[n] = (items[n] || 0) + 1; });
    const m = (c.inventory && c.inventory.money) || {};
    return {
      name: c.identity.name, hp: c.state.hp, wp: c.state.wp, hpMax: effHpMax(c), wpMax: effWpMax(c),
      cond: (DB.conditions || []).filter((cn) => c.state.conditions && c.state.conditions[cn.key]).map((cn) => cn.name),
      items, money: { gold: +m.gold || 0, silver: +m.silver || 0, copper: +m.copper || 0 },
      skills: Object.fromEntries(Object.entries(c.skills || {}).map(([n, v]) => [n, v.level])),
      abil: (c.abilities || []).map((a) => a.name),
      dead: ((c.state.deathRolls || {}).failures || 0) >= 3,
    };
  },
  snapAll() { Table.myHeroes().forEach((c) => { try { this._snaps[c.id] = this.snap(c); } catch (_) {} }); },
  diffHeroes() {
    const out = [];
    Table.myHeroes().forEach((c) => {
      let cur; try { cur = this.snap(c); } catch (_) { return; }
      const prev = this._snaps[c.id]; this._snaps[c.id] = cur;
      if (!prev) return;
      const h = cur.name, quiet = (this._quiet[c.id] || 0) > Date.now();
      if (!quiet) {
        const dh = cur.hp - prev.hp, dw = cur.wp - prev.wp;
        if (dh < 0) out.push(cur.hp <= 0 && prev.hp > 0
          ? { kind: "hurt", n: -dh, text: `${h} takes ${-dh} damage and falls — dying!`, mech: `HP 0/${cur.hpMax} · death rolls begin`, tone: "demon", hero: h }
          : { kind: "hurt", n: -dh, text: pick([`${h} takes ${-dh} damage.`, `${h} is wounded — ${-dh} damage.`], cur.hp + dh), mech: `HP ${cur.hp}/${cur.hpMax}`, tone: "bad", hero: h });
        if (dh > 0) out.push({ kind: "heal", text: prev.hp <= 0 ? `${h} is back on their feet.` : `${h} recovers ${dh} HP.`, mech: `HP ${cur.hp}/${cur.hpMax}`, tone: "ok", hero: h });
        if (dw < 0) out.push({ kind: "heal", text: `${h} spends ${-dw} WP.`, mech: `WP ${cur.wp}/${cur.wpMax}`, tone: "wp", hero: h });
        if (dw > 0) out.push({ kind: "heal", text: `${h} regains ${dw} WP.`, mech: `WP ${cur.wp}/${cur.wpMax}`, tone: "ok", hero: h });
      }
      cur.cond.filter((x) => !prev.cond.includes(x)).forEach((x) => out.push({ kind: "cond", text: `${h} is now ${x.toLowerCase()}.`, mech: `Condition: ${x}`, tone: "bad", hero: h }));
      prev.cond.filter((x) => !cur.cond.includes(x)).forEach((x) => out.push({ kind: "cond", text: `${h} is no longer ${x.toLowerCase()}.`, mech: `Condition cleared: ${x}`, tone: "ok", hero: h }));
      const gained = [], lost = [];
      new Set([...Object.keys(prev.items), ...Object.keys(cur.items)]).forEach((n) => { const d = (cur.items[n] || 0) - (prev.items[n] || 0); if (d > 0) gained.push(n); if (d < 0) lost.push(n); });
      if (gained.length) out.push({ kind: "loot", text: `${h} takes ${gained.join(", ")}.`, mech: "Gear", tone: "ok", hero: h });
      if (lost.length) out.push({ kind: "loot", text: `${h} no longer has ${lost.join(", ")}.`, mech: "Gear", tone: "bad", hero: h });
      const coin = ["gold", "silver", "copper"].map((k) => [k, cur.money[k] - prev.money[k]]).filter(([, d]) => d);
      if (coin.length) out.push({ kind: "coin", text: coin.every(([, d]) => d > 0) ? `${h} pockets some coin.` : coin.every(([, d]) => d < 0) ? `${h} pays out some coin.` : `${h}'s purse changes.`, mech: coin.map(([k, d]) => `${d > 0 ? "+" : "−"}${Math.abs(d)} ${k}`).join(" · "), tone: "coin", hero: h });
      Object.entries(cur.skills).forEach(([n, v]) => { if (prev.skills[n] != null && v > prev.skills[n]) out.push({ kind: "adv", text: `${h}'s ${n} improves to ${v}.`, mech: `Advancement · ${prev.skills[n]} → ${v}`, tone: "adv", hero: h }); });
      cur.abil.filter((x) => !prev.abil.includes(x)).forEach((x) => out.push({ kind: "adv", text: `${h} gains the heroic ability ${x}.`, mech: "Heroic ability", tone: "adv", hero: h }));
      if (cur.dead && !prev.dead) out.push({ kind: "death", text: `${h} has died.`, mech: "Three failed death rolls", tone: "demon", hero: h });
    });
    return out;
  },
  // ---- Change watcher: the fight (written by the GM's device, or the only device) ----
  cbSnap() {
    const s = Combat.load();
    return { round: s.round || 0, list: Object.fromEntries((s.combatants || []).filter((c) => !c.isArmyOfOneSecondary).map((c) => [c.id, { name: c.name, kind: c.kind, hp: c.hp, maxHp: c.maxHp, companion: !!c.isCompanion }])) };
  },
  diffCombat() {
    const cur = this.cbSnap(), prev = this._cb; this._cb = cur;
    if (!prev || (this.synced() && !Table.isGm())) return [];
    const out = []; const foe = (c) => c && c.kind !== "hero" && !c.companion;
    const curL = Object.values(cur.list), prevL = Object.values(prev.list);
    const started = cur.round > 0 && curL.length && !(prev.round > 0 && prevL.length);
    if (started) {
      const heroes = curL.filter((c) => c.kind === "hero").map((c) => c.name), foes = curL.filter(foe).map((c) => c.name);
      out.push({ kind: "fight", text: foes.length ? `Battle! ${heroes.length ? heroes.join(" and ") + (heroes.length > 1 ? " face" : " faces") : "Facing"} ${foes.join(", ")}.` : "A fight breaks out.", mech: "Round 1 · initiative drawn", tone: "bad", start: { heroes, foes } });
      return out;
    }
    if (!(prev.round > 0 && prevL.length)) return out;
    Object.entries(cur.list).forEach(([id, c]) => {
      const p = prev.list[id];
      if (!p) { if (foe(c)) out.push({ kind: "foe", text: `${c.name} joins the fight.`, mech: c.maxHp ? `HP ${c.hp}/${c.maxHp}` : null, tone: "bad" }); return; }
      if (!foe(c) || c.hp == null || p.hp == null) return;
      if (c.hp < p.hp) out.push(c.hp <= 0 && p.hp > 0 ? { kind: "foe", text: pick([`${c.name} falls!`, `${c.name} goes down.`, `${c.name} is defeated.`], p.hp), mech: `${p.hp - c.hp} damage · HP 0/${c.maxHp}`, tone: "down" } : { kind: "foe", text: `${c.name} takes ${p.hp - c.hp} damage.`, mech: `HP ${c.hp}/${c.maxHp}`, tone: "ok" });
    });
    const ended = !(cur.round > 0 && curL.length);
    const victory = ended && prevL.some(foe) && !curL.some(foe) && curL.length > 0;
    if (victory) Object.entries(prev.list).forEach(([id, p]) => { if (foe(p) && !cur.list[id] && p.hp > 0) out.push({ kind: "foe", text: `${p.name} falls!`, mech: "Defeated", tone: "down" }); });
    if (!ended && cur.round > prev.round) out.push({ kind: "round", text: `Round ${cur.round}.`, mech: "Initiative redrawn" });
    if (ended) out.push({ kind: "fightEnd", end: { victory, rounds: prev.round, prev } });
    return out;
  },
  scan() {
    let lines = [];
    try { lines = this.diffCombat().concat(this.diffHeroes()); } catch (_) { lines = []; }
    if (!lines.length) return;
    const st = this.load(); const adds = [];
    const had = !!this.session(st);
    this.openSession(st, adds);
    let meta = !had;
    lines.forEach((l) => {
      if (l.start) { st.fight = { id: uid(), startedAt: Date.now(), heroes: l.start.heroes, foes: l.start.foes, downed: [] }; meta = true; delete l.start; }
      if (l.kind === "foe" && l.tone === "down" && st.fight) { st.fight.downed.push(String(l.text).replace(/ (falls!|goes down\.|is defeated\.)$/, "")); meta = true; }
      if (l.kind === "fightEnd") {
        const f = st.fight || { downed: [] };
        const heroes = Table.myHeroes().filter((c) => Object.values(l.end.prev.list).some((p) => p.kind === "hero" && p.name === c.identity.name)).map((c) => `${c.identity.name} ${c.state.hp}/${effHpMax(c)} HP`);
        adds.push({ kind: "fightEnd", text: l.end.victory ? "Victory! The fight is over." : "The fight is over.", mech: [`${l.end.rounds || 1} round${(l.end.rounds || 1) > 1 ? "s" : ""}`, f.downed.length ? `Defeated: ${f.downed.join(", ")}` : "", heroes.join(" · ")].filter(Boolean).join(" · "), tone: l.end.victory ? "ok" : null });
        st.fight = null; meta = true; return;
      }
      adds.push(l);
    });
    this.write(st, adds, meta);
  },
  watch() {
    this.snapAll(); this._cb = this.cbSnap();
    let t = null;
    const later = () => { clearTimeout(t); t = setTimeout(() => this.scan(), 700); };
    window.addEventListener("db:changed", later);
    setInterval(() => this.scan(), 4000); // changes that arrive from sync without a db:changed
    window.addEventListener("adv:roll", (e) => { try { this.fromRoll(e.detail || {}); } catch (_) {} });
    window.addEventListener("adv:rest", (e) => { try { this.fromRest(e.detail || {}); } catch (_) {} });
    window.addEventListener("adv:phase", (e) => { try { this.fromPhase(e.detail); } catch (_) {} });
  },
  init() { this.watch(); },

  // ---- Quests, NPCs, places ------------------------------------------------
  addThread(text) {
    text = String(text || "").trim(); if (!text) return;
    const st = this.load(); st.threads.push({ id: uid(), text, done: false, ts: Date.now() });
    this.write(st, [{ kind: "quest", text: `New quest: ${text}` }]);
    showToast("Quest added.", "success");
  },
  toggleThread(id) {
    const st = this.load(); const t = st.threads.find((x) => x.id === id); if (!t) return;
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
    this.write(st, t.done ? [{ kind: "quest", text: `Quest resolved: ${t.text}`, tone: "ok" }] : []);
  },
  removeThread(id) { const st = this.load(); st.threads = st.threads.filter((x) => x.id !== id); this.write(st); },
  addNpc(name, note) {
    name = String(name || "").trim(); if (!name) return;
    const st = this.load(); st.npcs.push({ id: uid(), name, note: String(note || "").trim(), ts: Date.now() });
    this.write(st, [{ kind: "npc", text: `Met ${name}${note ? ` — ${String(note).trim()}` : ""}.` }]);
    showToast("NPC recorded.", "success");
  },
  removeNpc(id) { const st = this.load(); st.npcs = st.npcs.filter((x) => x.id !== id); this.write(st); },
  removeEntry(id) {
    if (this.synced()) { Sync.db.ref(`campaigns/${Sync.campaign.id}/adventure/entries/${id}`).remove().catch(() => {}); return; }
    const st = this.load(); st.entries = st.entries.filter((e) => e.id !== id); this.write(st, [], true);
  },

  // ---- Fights from the feed ----------------------------------------------
  // Drop a foe (and this device's hero, or the GM's party) into the shared tracker;
  // the fight then runs on the feed's fight card. The Fight tab stays the full tracker.
  startFight(foe) {
    const h = this.hero();
    const heroes = this.synced() && Table.isGm() ? Store.list().filter((c) => c.campaignId === Sync.campaign.id) : h ? [h] : [];
    Combat.mutate((st) => {
      st.combatants.push(foe);
      heroes.forEach((c) => {
        if (st.combatants.some((x) => x.charId === c.id)) return;
        st.combatants.push({ id: uid(), name: c.identity.name, kind: "hero", charId: c.id, init: null, done: false, hp: c.state.hp, maxHp: effHpMax(c), wp: c.state.wp, maxWp: effWpMax(c), armor: heroArmor(c) });
      });
    });
    this.changed();
  },
  foeFromData(kind, id) {
    if (kind === "monster") {
      const m = (typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : []).find((x) => x.id === id); if (!m) return null;
      return { id: uid(), name: m.name, kind: "monster", monId: m.id, init: null, done: false, hp: m.hp, maxHp: m.hp, armor: m.armor, attacks: m.attacks, ferocity: m.ferocity || 1 };
    }
    const n = (typeof DRAGONBANE_NPCS !== "undefined" ? DRAGONBANE_NPCS : []).find((x) => x.id === id); if (!n) return null;
    return { id: uid(), name: n.name, kind: "npc", npcId: n.id, init: null, done: false, hp: n.hp, maxHp: n.hp, wp: n.wp || null, maxWp: n.wp || null, armor: n.armor || 0, desc: n.desc || "", weapons: n.weapons || null, spells: n.spells || null };
  },
  fightPicker() {
    const m = modal("Who do you fight?");
    const solo = Settings.soloMode() && this._tools && this._tools.foe;
    const mons = typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : [];
    const npcs = typeof DRAGONBANE_NPCS !== "undefined" ? DRAGONBANE_NPCS : [];
    const sel = el(`<select class="input u-w100-mt1" aria-label="Foe"><option value="">Choose a foe from the rulebook…</option><optgroup label="NPCs &amp; animals">${npcs.map((n) => `<option value="npc:${esc(n.id)}">${esc(n.name)} (HP ${n.hp})</option>`).join("")}</optgroup><optgroup label="Monsters">${mons.map((x) => `<option value="monster:${esc(x.id)}">${esc(x.name)} (HP ${x.hp})</option>`).join("")}</optgroup></select>`);
    const go = el(`<button class="btn block u-mt2">⚔ Start the fight</button>`);
    go.onclick = () => { if (!sel.value) { showToast("Choose a foe first.", "warn"); return; } const [k, id] = sel.value.split(":"); const f = this.foeFromData(k, id); if (!f) return; m.close(); this.startFight(f); };
    m.body.append(sel, go);
    if (solo) {
      m.body.appendChild(el(`<p class="stat-line u-mt3">…or make a quick foe:</p>`));
      this.lend(m, this._tools.foe);
    }
  },
  // Lend a tool panel to a dialog; it returns to the hidden shelf when the dialog closes.
  lend(m, node) {
    m.body.appendChild(node);
    const prev = m.back._onClose; m.back._onClose = () => { if (this._shelf) this._shelf.appendChild(node); if (prev) prev(); };
    return m;
  },
  openTool(k) {
    const t = this._tools && this._tools[k]; if (!t) return;
    const title = { ask: "Ask the oracle", inspire: "Look for trouble", twist: "Dragon / Demon twist", foe: "Foes", travel: "Journey" }[k] || k;
    const m = modal(title);
    if (k === "travel" && this.canRun()) {
      const tb = el(`<button class="btn block u-mb2">🥾 Travel one shift</button>`);
      tb.onclick = () => { this.passShift("The party travels on."); tb.disabled = true; };
      m.body.appendChild(tb);
    }
    this.lend(m, t);
    const f = t.querySelector(".oracle-q"); if (f) setTimeout(() => f.focus(), 60);
  },

  // ---- Dialogs --------------------------------------------------------------
  sceneDialog() {
    const st = this.load();
    const m = modal("New scene");
    const dl = `adv-places-${Date.now()}`;
    m.body.appendChild(el(`<label class="stat-line" for="adv-place">Where are you?</label>`));
    const place = el(`<input type="text" id="adv-place" class="input u-w100-mt1" list="${dl}" placeholder="e.g. The ruined watchtower" autocomplete="off">`);
    const list = el(`<datalist id="${dl}">${st.places.map((p) => `<option value="${esc(p.name)}">`).join("")}</datalist>`);
    m.body.append(place, list);
    m.body.appendChild(el(`<label class="stat-line u-mt2" for="adv-hook">What's going on? <small>(optional)</small></label>`));
    const hook = el(`<textarea id="adv-hook" rows="2" class="u-w100-mt1" placeholder="The hook — what you want, or what waits here"></textarea>`);
    m.body.appendChild(hook);
    const insp = typeof DRAGONBANE_SOLO !== "undefined" ? DRAGONBANE_SOLO.inspiration || [] : [];
    if (insp.length && !(this.synced() && Table.isGm())) {
      const sp = el(`<button type="button" class="btn ghost block u-mt2 adv-spark">💡 Roll a spark (Inspiration 3D20)</button>`);
      sp.onclick = () => {
        const r = [Dice.d(20), Dice.d(20), Dice.d(20)];
        const row = (n) => insp.find((x) => x.d20 === n) || insp[0];
        hook.value = `${row(r[0]).action} · ${row(r[1]).attribute} · ${row(r[2]).thing}`;
        sp.textContent = `💡 Spark (${r.join(", ")}) — roll again`;
      };
      m.body.appendChild(sp);
    }
    const passL = el(`<label class="adv-check u-mt2"><input type="checkbox" id="adv-pass"> A shift has passed (${esc(SHIFTS[(st.clock.shift + 1) % 4])})</label>`);
    m.body.appendChild(passL);
    const go = el(`<button class="btn block u-mt3" id="adv-scene-go">Begin the scene</button>`);
    go.onclick = () => { m.close(); this.startScene({ place: place.value, hook: hook.value, passShift: passL.querySelector("input").checked }); };
    place.onkeydown = (e) => { if (e.key === "Enter") go.click(); };
    m.body.appendChild(go);
    setTimeout(() => place.focus(), 60);
  },
  async endSceneDialog() {
    const st = this.load(); const sc = this.scene(st); if (!sc) return;
    const v = await promptModal(`How did it end at ${sc.place}?`, { title: "End scene", defaultValue: this.sceneStats(st, sc), okText: "End scene" });
    if (v === null) return;
    this.endScene(v);
  },
  questsDialog() {
    const m = modal("Quests");
    const box = el(`<div class="j-box"></div>`);
    const render = () => {
      const st = this.load(); box.innerHTML = "";
      if (!st.threads.length) box.append(el(`<div class="empty-illo">${illo("spool")}</div>`), el(`<p class="stat-line empty-note">No quests yet.</p>`));
      [...st.threads.filter((t) => !t.done), ...st.threads.filter((t) => t.done)].forEach((th) => {
        const row = el(`<div class="j-item"></div>`);
        const tog = el(`<button class="skill-chip ${th.done ? "picked" : ""}" aria-pressed="${!!th.done}" title="Resolved">${th.done ? "✓" : "○"}</button>`);
        tog.onclick = () => { this.toggleThread(th.id); render(); };
        const rm = el(`<button class="step rm" aria-label="Delete quest">✕</button>`); rm.onclick = () => { this.removeThread(th.id); render(); };
        row.append(tog, el(`<span class="u-f1${th.done ? " j-done" : ""}">${esc(th.text)}</span>`), rm); box.appendChild(row);
      });
      const add = el(`<div class="inv-add"><input type="text" placeholder="A new quest or open question…"><button class="btn secondary">Add</button></div>`);
      const inp = add.querySelector("input"); const go = () => { if (!inp.value.trim()) return; this.addThread(inp.value); render(); };
      add.querySelector("button").onclick = go; inp.onkeydown = (e) => { if (e.key === "Enter") go(); };
      box.appendChild(add);
    };
    render(); m.body.appendChild(box);
  },
  npcsDialog() {
    const m = modal("People met");
    const box = el(`<div class="j-box"></div>`);
    const render = () => {
      const st = this.load(); box.innerHTML = "";
      if (!st.npcs.length) box.append(el(`<div class="empty-illo">${illo("frame")}</div>`), el(`<p class="stat-line empty-note">Nobody yet.</p>`));
      st.npcs.forEach((n) => {
        const row = el(`<div class="j-item npc-card"><span class="npc-face" aria-hidden="true">${crest(n.name, "Human", ini(n.name))}</span><span class="u-f1"><b>${esc(n.name)}</b>${n.note ? `<br><small>${esc(n.note)}</small>` : ""}</span></div>`);
        const rm = el(`<button class="step rm" aria-label="Delete NPC">✕</button>`); rm.onclick = () => { this.removeNpc(n.id); render(); };
        row.appendChild(rm); box.appendChild(row);
      });
      const add = el(`<div class="inv-add"><input type="text" placeholder="Name…"><input type="text" placeholder="note (optional)…"><button class="btn secondary">Add</button></div>`);
      const [a, b] = add.querySelectorAll("input"); const go = () => { if (!a.value.trim()) return; this.addNpc(a.value, b.value); render(); };
      add.querySelector("button").onclick = go; a.onkeydown = (e) => { if (e.key === "Enter") go(); };
      box.appendChild(add);
    };
    render(); m.body.appendChild(box);
  },
  placesDialog() {
    const st = this.load(); const m = modal("Places visited");
    if (!st.places.length) { m.body.append(el(`<div class="empty-illo">${illo("dragon")}</div>`), el(`<p class="stat-line empty-note">Start a scene to name your first place.</p>`)); return; }
    const ul = el(`<ul class="adv-places"></ul>`);
    st.places.forEach((p) => ul.appendChild(el(`<li>${icon("compass", "ic")}<b>${esc(p.name)}</b>${p.count > 1 ? `<small>× ${p.count}</small>` : ""}</li>`)));
    m.body.appendChild(ul);
  },
  clockDialog() {
    const st = this.load(); const m = modal(this.clockText(st.clock));
    m.body.appendChild(el(`<div class="adv-dial">${dayDial(st.clock.shift)}</div>`));
    m.body.appendChild(el(`<p class="stat-line">A shift is about six hours. Round and stretch rests can each be taken once per shift — they come back when the clock turns. A shift rest takes a whole shift.</p>`));
    if (this.canRun()) {
      const b = el(`<button class="btn block u-mt2">⏳ Pass a shift → ${esc(SHIFTS[(st.clock.shift + 1) % 4])}</button>`);
      b.onclick = () => { m.close(); this.passShift(); };
      m.body.appendChild(b);
    } else m.body.appendChild(el(`<p class="stat-line">The GM turns the clock.</p>`));
  },
  noteDialog() {
    const m = modal("Write what happens");
    const t = el(`<textarea rows="3" class="u-w100-mt1" placeholder="What does your hero do, say or find?"></textarea>`);
    const go = el(`<button class="btn block u-mt2">Add to the story</button>`);
    go.onclick = () => { const v = t.value.trim(); if (!v) return; m.close(); const h = this.hero(); this.post({ kind: "note", text: v, hero: h ? h.identity.name : null }); };
    m.body.append(t, go); setTimeout(() => t.focus(), 60);
  },

  // ---- The screen -------------------------------------------------------------
  view() {
    const root = el(`<div class="adv"></div>`);
    root.appendChild(el(sectionTitle("Adventure")));
    const help = root.appendChild(helpBox("Adventure", [
      "Everything you do lands here as a story: rolls, damage, conditions, loot, rests and fights write themselves in.",
      "<b>Start a scene</b>: name the place (and roll a spark if you like). <b>End scene</b> writes a one-line summary.",
      "The bar at the bottom asks <b>What do you do?</b> — try a skill, ask the oracle, fight, travel, rest or write a note.",
      "In a fight, the fight card shows whose turn it is with <b>Attack · Cast · Move · Other</b>. The Fight tab is the full tracker.",
      "The clock chip shows the day and shift; round and stretch rests come back each shift. <b>End session</b> writes a recap, then advancement.",
    ]));
    const tut = el(`<button class="btn ghost block u-mb25">📘 How to Play</button>`); tut.onclick = () => { Router.go("rules"); openChapter("howtoplay"); };
    help.steps.appendChild(tut);
    const head = el(`<div class="adv-head"></div>`);
    const scene = el(`<div class="adv-scene"></div>`);
    const chips = el(`<div class="adv-chips"></div>`);
    const feed = el(`<div class="adv-feed" role="log" aria-label="The story so far" aria-live="polite"></div>`);
    const bar = el(`<div class="adv-bar"></div>`);
    const shelf = el(`<div class="solo-shelf" hidden></div>`);
    root.append(head, scene, chips, feed, bar, shelf);
    this._shelf = shelf;
    // The solo tools (Solo mode) and the journey tools (everyone) — results go into the story.
    const hero0 = this.hero();
    const all = SoloMode.buildTools({ hero: Settings.soloMode() ? hero0 : null, log: (text, kind) => this.post({ kind, text }), thread: (t) => this.addThread(t), npc: (n, note) => this.addNpc(n, note), fight: (f) => { if (Settings.soloMode() && !this.hero()) showToast("Pick who you play first."); this.startFight(f); closeAllModals(); } });
    this._tools = Settings.soloMode() ? all : { travel: all.travel };
    Object.values(this._tools).forEach((n) => n && shelf.appendChild(n));
    let shown = 80;
    this._refresh = () => {
      const atEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80;
      this.renderHead(head); this.renderScene(scene); this.renderChips(chips); this.renderFeed(feed, shown, () => { shown += 80; this._refresh(); }); this.renderBar(bar);
      if (atEnd) requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight));
    };
    this._refresh();
    setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 40);
    return root;
  },
  renderHead(head) {
    const st = this.load(); const ses = this.session(st); const h = this.hero();
    head.innerHTML = "";
    const clock = el(`<button type="button" class="adv-clock" aria-label="${esc(this.clockText(st.clock))} — the clock">${dayDial(st.clock.shift)}<span><b>${esc(SHIFTS[st.clock.shift])}</b><small>Day ${st.clock.day}${ses ? ` · Session ${ses.n}` : ""}</small></span></button>`);
    clock.onclick = () => this.clockDialog();
    const who = el(`<div class="adv-who"><span class="aw-face" aria-hidden="true">${h ? crest(h.identity.name, h.identity.kin, ini(h.identity.name)) : icon("person", "ic")}</span><span class="aw-main"><b>${h ? esc(h.identity.name) : "Who do you play?"}</b><small class="aw-vit">${h ? `${icon("heart", "ic")} ${h.state.hp}/${effHpMax(h)} ${icon("bolt", "ic")} ${h.state.wp}/${effWpMax(h)}` : ""}</small></span></div>`);
    const heroes = Settings.soloMode() ? Store.list() : Table.myHeroes();
    const sel = el(`<select class="input solo-ctx-sel adv-hero-sel" aria-label="Playing as"><option value="">${Settings.soloMode() ? "— No hero —" : "— Choose —"}</option>${heroes.map((c) => `<option value="${esc(c.id)}"${h && c.id === h.id ? " selected" : ""}>${esc(c.identity.name)}</option>`).join("")}</select>`);
    sel.onchange = () => {
      const c = sel.value ? Store.get(sel.value) : null;
      if (Settings.soloMode() && c && c.campaignId && !c.soloCopy) { SoloMode.askPartyHero(c, () => { sel.value = h ? h.id : ""; }); return; }
      this.setHero(sel.value || null); Router.go("adventure");
    };
    who.appendChild(sel);
    if (h) { const open = el(`<button type="button" class="aw-sheet" aria-label="Open ${esc(h.identity.name)}'s sheet">${icon("scroll", "ic")}</button>`); open.onclick = () => Sheet.open(h.id); who.appendChild(open); }
    head.append(clock, who);
  },
  renderScene(box) {
    const st = this.load(); const sc = this.scene(st);
    box.innerHTML = "";
    if (!sc) {
      box.className = "adv-scene empty";
      box.appendChild(el(`<div class="as-art" aria-hidden="true">${illo(st.entries.length ? "quill" : "dragon")}</div>`));
      box.appendChild(el(`<p class="as-line">${st.entries.length ? "Between scenes." : "Your adventure starts here."}</p>`));
      if (this.canRun()) { const b = el(`<button class="btn block adv-start">${icon("compass", "ic")} Start a scene</button>`); b.onclick = () => this.sceneDialog(); box.appendChild(b); }
      else box.appendChild(el(`<p class="stat-line">The GM sets the scene.</p>`));
      return;
    }
    box.className = "adv-scene";
    box.innerHTML = `<span class="as-kicker">${icon("compass", "ic")} Day ${sc.day} · ${esc(SHIFTS[sc.shift] || "")}</span><h3 class="as-place">${esc(sc.place)}</h3>${sc.hook ? `<p class="as-hook">${esc(sc.hook)}</p>` : ""}`;
    if (this.canRun()) { const b = el(`<button type="button" class="btn ghost as-end">End scene</button>`); b.onclick = () => this.endSceneDialog(); box.appendChild(b); }
  },
  renderChips(box) {
    const st = this.load(); box.innerHTML = "";
    const open = st.threads.filter((t) => !t.done).length;
    [["quests", "thread", "Quests", open, () => this.questsDialog()], ["npcs", "people", "People", st.npcs.length, () => this.npcsDialog()], ["places", "compass", "Places", st.places.length, () => this.placesDialog()]].forEach(([k, ic, label, n, fn]) => {
      const b = el(`<button type="button" class="solo-chip adv-chip" data-chip="${k}">${icon(ic, "ic")} ${label} <b>${n}</b></button>`); b.onclick = fn; box.appendChild(b);
    });
  },
  entryNode(e) {
    const when = e.ts ? new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    if (e.kind === "session" || e.kind === "time" || e.kind === "round") return el(`<div class="ae-div k-${esc(e.kind)}"><span>${esc(e.text)}</span>${e.mech ? `<small>${esc(e.mech)}</small>` : ""}</div>`);
    if (e.kind === "scene") return el(`<div class="ae-scene"><span class="aes-k">${icon("compass", "ic")} New scene</span><b class="aes-place">${esc(e.text)}</b>${e.mech ? `<p class="aes-hook">${esc(e.mech)}</p>` : ""}</div>`);
    if (e.kind === "sceneEnd" || e.kind === "sessionEnd" || e.kind === "fightEnd") return el(`<div class="ae-card k-${esc(e.kind)}${e.tone ? " tone-" + esc(e.tone) : ""}"><span class="aec-k">${icon(e.kind === "fightEnd" ? "swords" : e.kind === "sessionEnd" ? "medal" : "check", "ic")} ${e.kind === "sceneEnd" ? "Scene ends" : e.kind === "sessionEnd" ? "Recap" : "After the fight"}</span><b>${esc(e.text)}</b>${e.mech ? `<p>${esc(e.mech)}</p>` : ""}</div>`);
    const row = el(`<div class="ae k-${esc(e.kind)}${e.tone ? " tone-" + esc(e.tone) : ""}"><span class="ae-ic" aria-hidden="true">${icon(ENTRY_IC[e.kind] || "journal", "ic")}</span><span class="ae-body"><span class="ae-txt">${esc(e.text)}</span>${e.mech ? `<small class="ae-mech">${esc(e.mech)}</small>` : ""}</span><span class="ae-time">${esc(when)}</span></div>`);
    if (e.kind === "note" && (!this.synced() || e.by === Sync.uid || Table.isGm())) {
      const x = el(`<button class="step rm ae-rm" aria-label="Delete note">✕</button>`); x.onclick = () => this.removeEntry(e.id); row.appendChild(x);
    }
    return row;
  },
  renderFeed(feed, shown, more) {
    const st = this.load(); feed.innerHTML = "";
    const list = st.entries.slice(-shown);
    if (st.entries.length > list.length) { const b = el(`<button class="btn ghost block adv-more">Show earlier</button>`); b.onclick = more; feed.appendChild(b); }
    if (!list.length) { feed.appendChild(el(`<p class="stat-line empty-note">Rolls, wounds, loot and fights will write themselves here.</p>`)); return; }
    list.forEach((e) => feed.appendChild(this.entryNode(e)));
  },
  // The prompt bar: "What do you do?" with chips that fit the moment; a pinned fight card in a fight.
  renderBar(bar) {
    bar.innerHTML = "";
    const cs = Combat.load();
    if (cs.round && cs.combatants.length) { bar.className = "adv-bar fighting"; bar.appendChild(this.fightCard(cs)); return; }
    bar.className = "adv-bar";
    const st = this.load(); const sc = this.scene(st); const h = this.hero(); const solo = Settings.soloMode();
    bar.appendChild(el(`<p class="ab-q">${sc ? "What do you do?" : "Where does the story go?"}</p>`));
    const row = el(`<div class="ab-chips" role="toolbar" aria-label="What do you do?"></div>`);
    const chip = (k, ic, label, fn, primary) => { const b = el(`<button type="button" class="ab-chip${primary ? " primary" : ""}" data-act="${k}">${icon(ic, "ic")}<span>${label}</span></button>`); b.onclick = fn; row.appendChild(b); };
    const needHero = (fn) => () => { const x = this.hero(); if (!x) { showToast("Choose who you play first (top of the screen).", "warn"); return; } fn(x); };
    if (!sc && this.canRun()) chip("scene", "compass", "Start scene", () => this.sceneDialog(), true);
    chip("try", "dice", "Try something", needHero((x) => Action.rollPicker(x)), !!sc);
    if (solo && this._tools.ask) chip("ask", "orb", "Ask", () => this.openTool("ask"));
    if (solo && this._tools.inspire) chip("inspire", "bulb", "Look for trouble", () => this.openTool("inspire"));
    if (solo && this._tools.twist) chip("twist", "dragon", "Twist", () => this.openTool("twist"));
    if (this.canRun()) chip("fight", "swords", "Fight", () => this.fightPicker());
    chip("travel", "tree", "Travel", () => this.openTool("travel"));
    chip("rest", "tent", "Rest", needHero((x) => this.restPicker(x)));
    chip("note", "journal", "Note", () => this.noteDialog());
    if (sc && this.canRun()) chip("endscene", "check", "End scene", () => this.endSceneDialog());
    if (solo && h) chip("mission", "medal", "Mission +5", () => { Sheet.use(h.id); Sheet.soloMissionMarks(); });
    if (this.canRun() && st.sessions.length) chip("endsession", "medal", "End session", () => this.endSession());
    bar.appendChild(row);
  },
  restPicker(h) {
    const m = modal(`Rest — ${h.identity.name}`);
    const row = el(`<div class="rest-pick"></div>`);
    [["round", "Round", "+D6 WP", h.state.roundRestUsed], ["stretch", "Stretch", "HP · WP · 1 condition", h.state.stretchRestUsed], ["shift", "Shift", "Everything · takes a shift", false]].forEach(([k, l, s, used]) => {
      const b = el(`<button type="button" class="rp-btn"${used ? " disabled" : ""}>${icon(k === "shift" ? "bed" : "tent", "ic rp-ic")}<b>${l}</b><small>${used ? "used this shift" : s}</small></button>`);
      b.onclick = () => { m.close(); Sheet.use(h.id); Sheet.rest(k); };
      row.appendChild(b);
    });
    m.body.appendChild(row);
  },
  fightCard(cs) {
    const card = el(`<div class="adv-fight" role="region" aria-label="The fight"></div>`);
    const ord = Combat.ordered(cs).filter((c) => c.init != null);
    const cur = ord.find((c) => !c.done);
    const top = el(`<div class="af-top"><b>${icon("swords", "ic")} Round ${cs.round}</b></div>`);
    const full = el(`<button type="button" class="link-btn af-full">Full tracker →</button>`); full.onclick = () => Router.go("party");
    top.appendChild(full); card.appendChild(top);
    const strip = el(`<div class="af-strip" role="list"></div>`);
    ord.forEach((c) => {
      const pct = c.maxHp ? Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100)) : 100;
      strip.appendChild(el(`<span role="listitem" class="af-f${c === cur ? " now" : ""}${c.done ? " done" : ""}${c.hp != null && c.hp <= 0 ? " down" : ""} k-${esc(c.kind)}"><i class="af-card">${c.init}</i><span class="af-n">${esc(c.name)}</span><i class="af-hp" style="width:${pct}%"></i></span>`));
    });
    card.appendChild(strip);
    const mine = new Set(Table.myHeroes().map((x) => x.id));
    const body = el(`<div class="af-body"></div>`);
    const gm = !this.synced() || Table.isGm();
    if (!cur) body.appendChild(el(`<p class="stat-line">Everyone has acted.</p>`));
    else if (cur.kind === "hero" && cur.charId && (mine.has(cur.charId) || gm)) {
      const h = Store.get(cur.charId);
      if (h) {
        body.appendChild(el(`<p class="af-who"><b>${esc(h.identity.name)}'s turn</b> — a move and one action.</p>`));
        if (h.state.hp <= 0) { const d = el(`<button class="btn block danger-ghost">${icon("skull", "ic")} Death roll</button>`); d.onclick = () => Sheet.deathRollModal(h.id); body.appendChild(d); }
        else body.appendChild(Combat.turnActions(cur, h));
        const end = el(`<button type="button" class="btn block af-end">✓ End turn</button>`); end.onclick = () => Combat.endTurn(cur.id); body.appendChild(end);
      }
    } else if (cur.kind !== "hero" && gm) {
      body.appendChild(el(`<p class="af-who"><b>${esc(cur.name)}</b> acts.</p>`));
      const acts = el(`<div class="af-acts"></div>`);
      if (cur.hp != null && cur.hp <= 0) acts.appendChild(el(`<span class="stat-line">Down.</span>`));
      else if (cur.kind === "monster" && (cur.attacks || []).length) { const b = el(`<button class="btn">🎲 ${esc(cur.name)} attacks${(cur.ferocity || 1) > 1 ? ` ×${cur.ferocity}` : ""}</button>`); b.onclick = () => Roller.monsterTableRoll(cur); acts.appendChild(b); }
      else (cur.weapons || []).slice(0, 2).forEach((w) => { const b = el(`<button class="btn">⚔ ${esc(w.name)}</button>`); b.onclick = () => Roller.npcAttack(cur.name, w, cur.id); acts.appendChild(b); });
      const nx = el(`<button class="btn secondary af-next">Next turn</button>`); nx.onclick = () => Combat.nextTurn(); acts.appendChild(nx);
      body.appendChild(acts);
    } else body.appendChild(el(`<p class="af-who">Waiting for <b>${esc(cur.name)}</b>.</p>`));
    card.appendChild(body);
    if (gm) {
      const endF = el(`<button type="button" class="btn danger-ghost af-stop">End fight</button>`);
      endF.onclick = async () => { if (await confirmModal("End the fight and clear the tracker?", { title: "End fight", okText: "End fight", danger: true })) { Combat.mutate((st) => { st.round = 0; st.combatants = []; }); if (Table.phase() && Table.phase().key === "combat") Table.setPhase("explore"); } };
      card.appendChild(endF);
    }
    return card;
  },
};
