/* table.js — group play at a real table (GM tells the story, players track on phones).
   Shared "table" state lives at campaigns/{id}/table (GM-write) and a shared roll log
   at campaigns/{id}/rolls (member-write); without a synced campaign both fall back
   to localStorage so one device (or a passed-around phone) works the same way.
     • Phase banner + phase tools (GM sets Exploring / Combat / Travel / Rest / Downtime / Session end)
     • Roll requests ("GM asks: roll Awareness") with results back to the GM
     • Shared party roll log
     • Party actions the GM triggers (rests, end session)
     • "Your turn" card with a beginner-friendly action menu, plus Parry/Dodge
     • Pre-generated heroes the GM hands to a player
     • Beginner mode (plain-words roll explanations, advanced panels hidden) */
import { $, DB, el, esc, uid } from './core.js';
import { modal, showToast } from './ui.js';
import { Settings } from './settings.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Combat } from './combat.js';
import { Roller } from './roller.js';
import { Sheet } from './sheet.js';
import { Router } from './router.js';
import { resolveEquippedWeapons } from './rules.js';
import { illo } from './graphics.js';

export const PHASES = [
  { key: "explore", icon: "🧭", label: "Exploring", hint: "Listen to the GM. When your hero tries something risky, tap a skill on your sheet to roll.", btn: "My sheet" },
  { key: "combat", icon: "⚔", label: "Combat", hint: "Wait for your initiative card. On your turn you get a move and one action.", btn: "Combat" },
  { key: "travel", icon: "🌲", label: "Travelling", hint: "Time passes in shifts (~6 hours). The GM may ask for Bushcraft or Awareness rolls.", btn: "My sheet" },
  { key: "rest", icon: "⛺", label: "Resting", hint: "Round rest +D6 WP · Stretch rest heals HP/WP and one condition · Shift rest restores everything.", btn: "Rest" },
  { key: "downtime", icon: "🏠", label: "Downtime", hint: "Shop, train, heal up, and update your notes and inventory.", btn: "My sheet" },
  { key: "end", icon: "🏅", label: "Session end", hint: "Answer the five advancement questions, then roll for each marked skill.", btn: "Advancement" },
];
const ACTIONS = {
  round: { icon: "⛺", label: "Round rest", verb: "Take a round rest" },
  stretch: { icon: "⛺", label: "Stretch rest", verb: "Take a stretch rest" },
  shift: { icon: "🛌", label: "Shift rest", verb: "Take a shift rest" },
  endSession: { icon: "🏅", label: "End of session", verb: "Roll advancement" },
};

export const Table = {
  LOCAL_KEY: "dragonbane.table",
  LOG_KEY: "dragonbane.rollLog",
  SEEN_KEY: "dragonbane.tableSeen",
  state: {},          // { phase, request, action }
  log: [],            // newest last
  members: {},        // uid → { displayName, role }
  refs: [],

  // ---- Where state lives -------------------------------------------------
  synced() { return !!(Sync && Sync.enabled && Sync.db && Sync.campaign); },
  isGm() { return Combat.isGm(); },
  beginner() { return Settings.level() === "beginner"; },
  seen() { try { return JSON.parse(localStorage.getItem(this.SEEN_KEY)) || {}; } catch (_) { return {}; } },
  markSeen(k, v) { const s = this.seen(); s[k] = v; localStorage.setItem(this.SEEN_KEY, JSON.stringify(s)); },
  loadLocal() {
    try { this.state = JSON.parse(localStorage.getItem(this.LOCAL_KEY)) || {}; } catch (_) { this.state = {}; }
    try { this.log = JSON.parse(localStorage.getItem(this.LOG_KEY)) || []; } catch (_) { this.log = []; }
  },
  writeState(patch) {
    this.state = { ...this.state, ...patch };
    Object.keys(patch).forEach((k) => { if (patch[k] == null) delete this.state[k]; });
    if (this.synced()) Sync.db.ref(`campaigns/${Sync.campaign.id}/table`).update(patch).catch(() => {});
    else localStorage.setItem(this.LOCAL_KEY, JSON.stringify(this.state));
    this.changed();
  },

  // Called by Sync.attachListeners / detachListeners.
  attach() {
    this.detach();
    if (!this.synced()) return;
    const base = `campaigns/${Sync.campaign.id}`;
    const t = Sync.db.ref(`${base}/table`);
    t.on("value", (s) => { this.state = s.val() || {}; this.changed(); });
    const r = Sync.db.ref(`${base}/rolls`).limitToLast(40);
    r.on("value", (s) => { const l = []; s.forEach((x) => { l.push({ id: x.key, ...x.val() }); }); l.sort((a, b) => a.ts - b.ts); this.log = l; this.changed(); });
    const m = Sync.db.ref(`${base}/members`);
    m.on("value", (s) => { this.members = s.val() || {}; this.changed(); });
    this.refs = [t, r, m];
  },
  detach() { this.refs.forEach((x) => x.off()); this.refs = []; this.members = {}; this.loadLocal(); },

  // ---- GM controls ---------------------------------------------------------
  setPhase(key) { this.writeState({ phase: key ? { key, ts: Date.now() } : null }); },
  phase() { const k = this.state.phase && this.state.phase.key; return PHASES.find((p) => p.key === k) || null; },
  requestRoll(skill, charIds) {
    const req = { id: uid(), skill, charIds: charIds && charIds.length ? charIds : null, ts: Date.now() };
    this.writeState({ request: req });
    showToast(`Asked for a ${skill} roll.`, "success");
    return req;
  },
  clearRequest() { this.writeState({ request: null }); },
  partyAction(kind) { this.writeState({ action: { id: uid(), kind, ts: Date.now() } }); showToast(`${ACTIONS[kind].label} called for the party.`, "success"); },

  // ---- Roll log ------------------------------------------------------------
  logRoll(entry) {
    const c = entry.charId ? Store.get(entry.charId) : null;
    if (!c && entry.kind !== "solo") return;
    // Only log heroes this device is playing (never a GM's peek at someone else's sheet).
    if (c && this.synced() && c.owner && c.owner !== Sync.uid && !this.isGm()) return;
    const req = this.state.request;
    const e = {
      ts: Date.now(), uid: (Sync && Sync.uid) || "local", charId: entry.charId || null,
      hero: c ? c.identity.name : (entry.hero || ""), kind: entry.kind || "skill", label: entry.label || "",
      target: entry.target ?? null, roll: entry.roll ?? null, success: !!entry.success,
      dragon: !!entry.dragon, demon: !!entry.demon, pushed: entry.pushed || null, text: entry.text || null,
      reqId: req && entry.kind === "skill" && req.skill === entry.label && this.targets(req).includes(entry.charId) ? req.id : null,
    };
    Object.keys(e).forEach((k) => e[k] == null && delete e[k]);
    if (this.synced()) Sync.db.ref(`campaigns/${Sync.campaign.id}/rolls`).push(e).catch(() => {});
    else { this.log.push({ id: uid(), ...e }); this.log = this.log.slice(-40); localStorage.setItem(this.LOG_KEY, JSON.stringify(this.log)); this.changed(); }
  },
  logLine(e) {
    if (e.kind === "solo") return `🧭 ${esc(e.hero)}: ${esc(e.text || "")}`;
    const res = e.dragon ? "🐉 Dragon!" : e.demon ? "👹 Demon!" : e.success ? "✓ success" : "✗ failure";
    return `<b>${esc(e.hero)}</b> — ${esc(e.label)} ${e.roll != null ? `<span class="tl-roll">${e.roll}${e.target != null ? ` vs ${e.target}` : ""}</span>` : ""} <span class="${e.success ? "tl-ok" : "tl-bad"}">${res}</span>${e.pushed ? ` <i>(pushed)</i>` : ""}`;
  },
  logList(limit = 20) {
    const items = this.log.slice(-limit).reverse();
    if (!items.length) return el(`<div><div class="empty-illo">${illo("die")}</div><p class="stat-line empty-note">No rolls yet this session.</p></div>`);
    const ul = el(`<ul class="tl-log"></ul>`);
    items.forEach((e) => ul.appendChild(el(`<li><span class="tl-time">${new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><span>${this.logLine(e)}</span></li>`)));
    return ul;
  },
  openLog() { const m = modal("📜 Party roll log"); m.body.appendChild(this.logList(40)); },

  // ---- Who am I playing? ---------------------------------------------------
  // Synced: the heroes this player owns in the campaign. Local: every hero (one device).
  myHeroes() {
    const all = Store.list();
    if (this.synced()) return all.filter((c) => c.campaignId === Sync.campaign.id && c.owner === Sync.uid);
    return all;
  },
  targets(req) { return req.charIds || this.partyIds(); },
  partyIds() { return (this.synced() ? Store.list().filter((c) => c.campaignId === Sync.campaign.id) : Store.list()).map((c) => c.id); },

  // ---- Player prompts --------------------------------------------------------
  pendingRequests() {
    const req = this.state.request; if (!req) return [];
    const mine = this.myHeroes().filter((c) => this.targets(req).includes(c.id));
    return mine.filter((c) => !this.log.some((e) => e.reqId === req.id && e.charId === c.id) && !(this.seen()["req:" + req.id + ":" + c.id]));
  },
  pendingAction() {
    const a = this.state.action; if (!a || this.seen().action === a.id) return null;
    if (Date.now() - (a.ts || 0) > 6 * 3600 * 1000) return null; // stale
    return this.isGm() && this.synced() ? null : a;
  },
  assignedToMe() {
    if (!this.synced()) return [];
    const seen = this.seen().assigned || [];
    return this.myHeroes().filter((c) => c.assignedBy && !seen.includes(c.id));
  },
  runRequest(c, req) {
    const sk = c.skills[req.skill];
    if (!sk) { showToast(`${c.identity.name} has no ${req.skill} skill — tell the GM.`, "warn"); this.markSeen("req:" + req.id + ":" + c.id, 1); this.render(); return; }
    Roller.skill(c.id, req.skill);
  },
  runAction(a, c) {
    this.markSeen("action", a.id);
    Sheet.open(c.id);
    if (a.kind === "endSession") Sheet.endSession(); else Sheet.rest(a.kind);
    this.render();
  },
  phaseGo(p) {
    const heroes = this.myHeroes();
    const c = heroes.find((h) => h.id === window.activeCharacterId) || heroes[0];
    if (p.key === "combat") { Router.go("party"); return; }
    if (!c) { Router.go("home"); return; }
    if (p.key === "end") { Sheet.open(c.id); Sheet.endSession(); return; }
    if (p.key === "downtime") { try { localStorage.setItem("dragonbane.sheetTab", "gear"); } catch (_) {} }
    else { try { localStorage.setItem("dragonbane.sheetTab", "overview"); } catch (_) {} }
    Sheet.open(c.id);
    if (p.key === "rest") setTimeout(() => { const r = document.querySelector(".hero-top .rest-row"); if (r) { r.scrollIntoView({ behavior: "smooth", block: "center" }); r.classList.add("tl-glow"); } }, 60);
  },

  // ---- The bar under the app header ------------------------------------------
  bar() {
    let b = $("#table-bar");
    if (!b) { const h = $(".app-header"); if (!h) return null; b = el(`<div id="table-bar" class="table-bar" aria-live="polite"></div>`); h.appendChild(b); }
    return b;
  },
  render() {
    const b = this.bar(); if (!b) return;
    b.innerHTML = "";
    const p = this.phase();
    const show = this.synced() || p || this.state.request || this.state.action;
    if (p) {
      const row = el(`<div class="tb-row tb-phase"><span class="tb-chip">${p.icon} ${esc(p.label)}</span></div>`);
      if (!(this.isGm() && this.synced())) { const go = el(`<button type="button" class="tb-btn">${esc(p.btn)} →</button>`); go.onclick = () => this.phaseGo(p); row.appendChild(go); }
      b.appendChild(row);
      if (this.beginner()) b.appendChild(el(`<p class="tb-hint">${esc(p.hint)}</p>`));
    }
    const req = this.state.request;
    this.pendingRequests().forEach((c) => {
      const row = el(`<div class="tb-row tb-alert"><span class="tb-txt">🎲 GM asks${this.myHeroes().length > 1 ? ` ${esc(c.identity.name)}` : ""}: roll <b>${esc(req.skill)}</b></span></div>`);
      const go = el(`<button type="button" class="tb-btn tb-primary">Roll now</button>`); go.onclick = () => this.runRequest(c, req);
      row.appendChild(go); b.appendChild(row);
    });
    const a = this.pendingAction();
    if (a && ACTIONS[a.kind]) {
      const heroes = this.myHeroes();
      const row = el(`<div class="tb-row tb-alert"><span class="tb-txt">${ACTIONS[a.kind].icon} GM calls: <b>${esc(ACTIONS[a.kind].label)}</b></span></div>`);
      heroes.slice(0, 3).forEach((c) => { const go = el(`<button type="button" class="tb-btn tb-primary">${esc(ACTIONS[a.kind].verb)}${heroes.length > 1 ? ` (${esc(c.identity.name)})` : ""}</button>`); go.onclick = () => this.runAction(a, c); row.appendChild(go); });
      const skip = el(`<button type="button" class="tb-x" aria-label="Dismiss">✕</button>`); skip.onclick = () => { this.markSeen("action", a.id); this.render(); };
      row.appendChild(skip); b.appendChild(row);
    }
    this.assignedToMe().forEach((c) => {
      const row = el(`<div class="tb-row tb-alert"><span class="tb-txt">🎁 The GM gave you <b>${esc(c.identity.name)}</b></span></div>`);
      const go = el(`<button type="button" class="tb-btn tb-primary">Open</button>`);
      go.onclick = () => { this.markSeen("assigned", [...(this.seen().assigned || []), c.id]); Sheet.open(c.id); this.render(); };
      row.appendChild(go); b.appendChild(row);
    });
    if (show && (this.log.length || this.synced())) {
      const lg = el(`<button type="button" class="tb-log" aria-label="Party roll log">📜 Log${this.log.length ? ` <span class="tb-n">${Math.min(this.log.length, 99)}</span>` : ""}</button>`);
      lg.onclick = () => this.openLog();
      (b.querySelector(".tb-phase") || b.appendChild(el(`<div class="tb-row tb-phase"></div>`))).appendChild(lg);
    }
    b.hidden = !b.children.length;
    if (this.pendingRequests().length && this._buzzReq !== (req && req.id)) { this._buzzReq = req && req.id; try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (_) {} }
    this.renderTurn();
  },

  // ---- "Your turn" card ----------------------------------------------------------
  myCombatant() {
    const s = Combat.load(); if (!s.round || !s.combatants.length) return {};
    const ord = Combat.ordered(s).filter((c) => c.init != null);
    const cur = ord.find((c) => !c.done);
    const mine = new Set(this.myHeroes().map((c) => c.id));
    if (this.synced() && this.isGm()) return {};
    // One shared device (no campaign): only in beginner mode, so a GM's own tracker stays uncluttered.
    if (!this.synced() && !this.beginner()) return {};
    const myCbs = s.combatants.filter((c) => c.kind === "hero" && mine.has(c.charId));
    return { s, cur, isMine: !!(cur && cur.kind === "hero" && mine.has(cur.charId)), myCbs };
  },
  turnDock() {
    let d = $("#turn-dock");
    if (!d) { d = el(`<div id="turn-dock" class="turn-dock" hidden></div>`); document.body.appendChild(d); }
    return d;
  },
  renderTurn() {
    const d = this.turnDock();
    requestAnimationFrame(() => document.documentElement.style.setProperty("--dock-h", d.hidden ? "0px" : d.offsetHeight + "px"));
    const { s, cur, isMine, myCbs } = this.myCombatant();
    d.innerHTML = "";
    if (!s) { d.hidden = true; return; }
    if (isMine) {
      const c = Store.get(cur.charId); if (!c) { d.hidden = true; return; }
      const key = `${s.round}:${cur.id}`;
      if (this._buzzTurn !== key) { this._buzzTurn = key; this._turnOpen = true; try { navigator.vibrate && navigator.vibrate([60, 80, 60]); } catch (_) {} }
      const beg = this.beginner();
      const card = el(`<div class="turn-card${this._turnOpen ? " open" : ""}" role="region" aria-label="Your turn">
        <button type="button" class="tc-head" aria-expanded="${this._turnOpen ? "true" : "false"}"><span class="tc-title">⚔ Your turn, ${esc(c.identity.name)}!</span><span class="tc-sub">Round ${s.round} · a move + one action</span><span class="chev" aria-hidden="true"></span></button>
        <div class="tc-body"></div></div>`);
      card.querySelector(".tc-head").onclick = () => { this._turnOpen = !this._turnOpen; this.renderTurn(); };
      const body = card.querySelector(".tc-body");
      const w = resolveEquippedWeapons(c.inventory && c.inventory.items)[0];
      const hasMagic = ((c.spells && c.spells.known) || []).length + ((c.spells && c.spells.tricks) || []).length > 0;
      const acts = [
        ["⚔", "Attack", w ? `Swing or shoot your ${w.name}: roll ${w.skill}, then roll damage.` : "You have no weapon equipped — equip one on the Gear tab.", () => w ? Roller.heroWeaponAttack(c.id, w, cur.id) : showToast("Equip a weapon on the Gear tab first.", "warn")],
        ["✨", "Cast", hasMagic ? "Cast a spell or trick — it costs WP." : "Your hero knows no magic.", () => { if (!hasMagic) { showToast("Your hero knows no spells.", "warn"); return; } try { localStorage.setItem("dragonbane.sheetTab", "magic"); } catch (_) {} Sheet.open(c.id); }],
        ["🏃", "Move", "Move up to your movement in metres (free, besides your action).", () => { const m = modal(`${c.identity.name}: Movement`); const refresh = () => { m.body.innerHTML = ""; m.body.appendChild(Sheet.buildMovementDOM(Store.get(c.id), refresh)); }; refresh(); }],
        ["💨", "Dash", "Use your action to move again — double movement this turn.", () => { Store.update(c.id, (ch) => { ch.state.isDashing = true; }); showToast("Dash: your movement is doubled this turn (no other action).", "success"); }],
        ["🤝", "Help / Rally", "Rally a fallen friend with PERSUASION, or help an ally (they get a boon).", () => c.skills.Persuasion ? Roller.skill(c.id, "Persuasion") : showToast("Tell the GM how you help.")],
        ["💬", "Something else", "Use an item, open a door, talk, or anything else — tell the GM.", () => showToast("Tell the GM what your hero does.")],
      ];
      const grid = el(`<div class="tc-acts"></div>`);
      acts.forEach(([ic, label, tip, fn]) => { const bt = el(`<button type="button" class="tc-act">${ic} <b>${esc(label)}</b>${beg ? `<small>${esc(tip)}</small>` : ""}</button>`); if (!beg) bt.title = tip; bt.onclick = fn; grid.appendChild(bt); });
      body.appendChild(grid);
      const done = el(`<button type="button" class="btn block tc-done">✓ End my turn</button>`);
      done.onclick = () => { const st = Combat.load(); const ref = st.combatants.find((x) => x.id === cur.id); if (ref) { ref.done = true; ref.acted = true; } Combat.save(st); if ($("#screen .combat-row")) Combat.rerender(); this.render(); };
      body.appendChild(done);
      d.appendChild(card);
      d.hidden = false;
      return;
    }
    // Not my turn: a slim reaction strip so a player can parry/dodge when a foe attacks.
    const ready = (myCbs || []).filter((x) => !x.done && !x.acted);
    if (ready.length && !(this.synced() && this.isGm())) {
      const x = ready[0];
      const strip = el(`<div class="react-strip"><span>${cur ? `Now: <b>${esc(cur.name)}</b>` : "Waiting…"}</span><span class="rs-q">Attacked?</span></div>`);
      const pb = el(`<button type="button" class="tb-btn">🛡 Parry</button>`); pb.onclick = () => Combat.reaction(x.id, "parry");
      const db = el(`<button type="button" class="tb-btn">🤸 Dodge</button>`); db.onclick = () => Combat.reaction(x.id, "dodge");
      strip.append(pb, db);
      if (this.beginner()) strip.appendChild(el(`<small class="rs-tip">Parrying or dodging uses up your next action.</small>`));
      d.appendChild(strip); d.hidden = false; return;
    }
    d.hidden = true;
  },

  // ---- Beginner mode: explain a roll in plain words -------------------------
  explain(used, target, success, dragon, demon) {
    if (!this.beginner() || target == null || typeof target !== "number") return "";
    if (dragon) return `You rolled a 1 — a <b>Dragon</b>! The best possible result: it succeeds brilliantly, and the skill gets an advancement mark.`;
    if (demon) return `You rolled a 20 — a <b>Demon</b>. Something goes badly wrong, and you can't push this roll. The skill still gets an advancement mark.`;
    if (success) return `You needed <b>${target} or lower</b> and rolled <b>${used}</b> — it works!`;
    return `You needed <b>${target} or lower</b> but rolled <b>${used}</b> — it doesn't work. You may <b>push</b>: take a condition (it makes rolls with that attribute harder) and roll once more.`;
  },
  applyBeginner() {
    const l = Settings.level();
    document.body.classList.toggle("beginner", l === "beginner");
    ["beginner", "standard", "expert"].forEach((k) => document.body.classList.toggle("lvl-" + k, l === k));
  },

  // ---- Foe HP for players: bands instead of numbers ---------------------------
  hideFoeHp(cb) { return cb.kind !== "hero" && !this.isGm(); },
  band(cb) {
    const max = cb.maxHp || cb.hp || 1, pct = (cb.hp || 0) / max;
    return cb.hp <= 0 ? "Down" : pct > 0.75 ? "Healthy" : pct > 0.4 ? "Hurt" : "Badly hurt";
  },

  // ---- Pre-gens the GM hands to a player ---------------------------------------
  assignPregen(pregen, memberUid, instantiate) {
    if (!this.synced()) { showToast("Handing out heroes needs a synced campaign.", "warn"); return null; }
    const ch = instantiate(pregen);
    ch.campaignId = Sync.campaign.id; ch.owner = memberUid; ch.assignedBy = Sync.uid;
    const list = Store.list(); list.push(ch); Store.save(list);
    const who = (this.members[memberUid] || {}).displayName || "player";
    showToast(`${ch.identity.name} handed to ${who}.`, "success");
    return ch;
  },
  players() { return Object.entries(this.members || {}).filter(([, m]) => m && m.role !== "gm").map(([k, m]) => ({ uid: k, name: m.displayName || "Player" })); },

  // ---- Wiring ----------------------------------------------------------------------
  changed() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0; this.render();
      try { window.dispatchEvent(new Event("table:changed")); } catch (_) {}
    });
  },
  init() {
    if (!this.refs.length) this.loadLocal();
    this.applyBeginner();
    window.addEventListener("db:changed", () => this.changed());
    window.addEventListener("storage", (e) => { if (e.key === this.LOCAL_KEY || e.key === this.LOG_KEY || e.key === "dragonbane.combat") { this.loadLocal(); this.changed(); } });
    this.render();
  },
};
