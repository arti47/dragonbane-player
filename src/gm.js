/* gm.js — Dragonbane Player (Phase 21).
   The GM dashboard: a live party panel, peek-any-sheet, drop monsters/NPCs into
   the shared combat tracker, and "hand out" damage / conditions / fear attacks —
   plus glanceable GM reference tables (the official GM-screen aids: NPC quick
   stats, Demon fumble tables, fear table, leaving-a-site). Gated behind the
   "GM Screen" setting (or an actual campaign GM). Strictly additive — invisible
   to plain players. Rules numbers all come from the data libraries (§9). */
import { $, DB, Dice, el, esc, helpBox, sectionTitle, uid } from './core.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Settings } from './settings.js';
import { modal, showToast, promptModal, confirmModal } from './ui.js';
import { applyInvoluntaryConditionTo, effHpMax, effWpMax } from './derived.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';
import { Table, PHASES } from './table.js';
import { Pregens } from './wizard.js';

export const GM = {
    // Show the GM surface based on the user's explicit toggle when they've set one;
    // otherwise default to on for the GM of a synced campaign, off for everyone else.
    // (Tri-state so a campaign GM can still turn the tab OFF — an explicit choice wins.)
    enabled() {
      const s = Settings.get("gmScreen");
      if (s === true || s === false) return s; // explicit user choice wins
      return !!(Sync && Sync.campaign && Sync.campaign.role === "gm"); // default for a campaign GM
    },

    // Characters the GM manages: the campaign party when synced, else all local heroes.
    party() {
      const all = Store.list();
      if (Sync && Sync.campaign && Sync.campaign.id) return all.filter((c) => c.campaignId === Sync.campaign.id);
      return all;
    },

    heldConditions(c) {
      const conds = (c.state && c.state.conditions) || {};
      return (DB.conditions || []).filter((cn) => conds[cn.key]).map((cn) => cn.name);
    },

    // ---- Running the table: phase, roll requests, party actions, roll log, pre-gens ----
    tablePanel() {
      const wrap = el(`<div class="gm-table"></div>`);
      const party = this.party();
      // Phase
      const ph = el(`<div class="panel"><h3>🎬 Game phase</h3><p class="stat-line">Shown on every player's phone with the right tools (and a plain-words hint in beginner mode).</p></div>`);
      const seg = el(`<div class="phase-seg" role="group" aria-label="Game phase"></div>`);
      const cur = Table.phase();
      PHASES.forEach((p) => { const b = el(`<button type="button" class="phase-btn" aria-pressed="${cur && cur.key === p.key ? "true" : "false"}">${p.icon} ${esc(p.label)}</button>`); b.onclick = () => Table.setPhase(p.key); seg.appendChild(b); });
      const off = el(`<button type="button" class="phase-btn" aria-pressed="${cur ? "false" : "true"}">— None</button>`); off.onclick = () => Table.setPhase(null); seg.appendChild(off);
      ph.appendChild(seg); wrap.appendChild(ph);

      // Ask for a roll
      const rq = el(`<div class="panel"><h3>🎲 Ask for a roll</h3></div>`);
      const skills = (DB.skills || []).map((x) => x.name).sort();
      const row = el(`<div class="inv-add"></div>`);
      const sel = el(`<select aria-label="Skill to roll">${skills.map((n) => `<option${n === (this._lastSkill || "Awareness") ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>`);
      const ask = el(`<button class="btn">Ask</button>`);
      row.append(sel, ask); rq.appendChild(row);
      const who = el(`<div class="rl-chips gm-who"></div>`);
      const picked = new Set(party.map((c) => c.id));
      party.forEach((c) => { const b = el(`<button type="button" class="skill-chip on" aria-pressed="true">${esc(c.identity.name)}</button>`); b.onclick = () => { const on = !picked.has(c.id); on ? picked.add(c.id) : picked.delete(c.id); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }; who.appendChild(b); });
      if (party.length) rq.appendChild(el(`<p class="stat-line u-mb1only">Who rolls (tap to toggle):</p>`));
      rq.appendChild(who);
      ask.onclick = () => { this._lastSkill = sel.value; Table.requestRoll(sel.value, picked.size === party.length ? null : [...picked]); };
      const req = Table.state.request;
      if (req) {
        const res = el(`<div class="gm-req"><p class="stat-line u-mt2"><b>Latest request: ${esc(req.skill)}</b></p></div>`);
        const ids = Table.targets(req);
        const list = el(`<ul class="tl-log"></ul>`);
        ids.forEach((id) => {
          const c = Store.get(id); if (!c) return;
          const e = [...Table.log].reverse().find((x) => x.reqId === req.id && x.charId === id);
          list.appendChild(el(`<li><span>${e ? Table.logLine(e) : `<b>${esc(c.identity.name)}</b> — <i>waiting…</i>`}</span></li>`));
        });
        const clr = el(`<button class="btn ghost u-mt15">Clear request</button>`); clr.onclick = () => Table.clearRequest();
        res.append(list, clr); rq.appendChild(res);
      }
      wrap.appendChild(rq);

      // Party actions
      const pa = el(`<div class="panel"><h3>⛺ Party actions</h3><p class="stat-line">Each player's phone gets a prompt to take it with their own hero.</p></div>`);
      const grid = el(`<div class="grid-2"></div>`);
      [["round", "Round rest"], ["stretch", "Stretch rest"], ["shift", "Shift rest"], ["endSession", "🏅 End session"]].forEach(([k, l]) => { const b = el(`<button class="btn ghost">${l}</button>`); b.onclick = () => Table.partyAction(k); grid.appendChild(b); });
      pa.appendChild(grid); wrap.appendChild(pa);

      // Roll log
      const lg = el(`<div class="panel"><h3>📜 Party roll log</h3></div>`);
      lg.appendChild(Table.logList(10));
      const all = el(`<button class="btn ghost u-mt15">Open full log</button>`); all.onclick = () => Table.openLog();
      lg.appendChild(all); wrap.appendChild(lg);

      // Hand out pre-gens
      const pg = el(`<div class="panel"><h3>🎁 Hand out a pre-generated hero</h3></div>`);
      const pregens = window.DRAGONBANE_PREGENS || [];
      const players = Table.players();
      if (!Table.synced()) pg.appendChild(el(`<p class="stat-line">Needs a synced campaign (About → Create campaign). On one device, use <b>Heroes → Use a pre-generated hero</b>.</p>`));
      else if (!players.length) pg.appendChild(el(`<p class="stat-line">No players have joined yet — share the join code <b>${esc(Sync.campaign.joinCode)}</b>.</p>`));
      else {
        const r = el(`<div class="inv-add"></div>`);
        const ps = el(`<select aria-label="Player">${players.map((p) => `<option value="${esc(p.uid)}">${esc(p.name)}</option>`).join("")}</select>`);
        const hs = el(`<select aria-label="Pre-generated hero">${pregens.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("")}</select>`);
        const give = el(`<button class="btn secondary">Give</button>`);
        give.onclick = () => Table.assignPregen(pregens[+hs.value], ps.value, (p) => Pregens.instantiate(p));
        r.append(ps, hs, give); pg.appendChild(r);
      }
      wrap.appendChild(pg);
      return wrap;
    },

    view() {
      const root = el(`<div class="screen-gm"></div>`);
      root.appendChild(el(sectionTitle("GM Screen")));
      root.appendChild(helpBox("GM Screen", [
        "<b>Party</b>: glance at each hero's HP/WP/conditions; use <b>Open sheet</b>, <b>− Damage</b>, <b>+ Condition</b>, <b>😱 Fear</b>.",
        "<b>Drop into combat</b>: add a Bestiary monster or rulebook NPC straight to the shared tracker.",
        "<b>Message players</b>: broadcast a note to everyone (synced campaign GM).",
        "<b>GM reference</b>: roll fumble / fear / leaving-site tables privately, then <b>📢 Push</b> to reveal.",
        "Turn this tab off anytime with the <b>GM Screen</b> toggle in About."
      ]));

      // ---- Party panel -------------------------------------------------
      const party = this.party();
      const pPanel = el(`<div class="panel"><h3>Party</h3></div>`);
      if (!party.length) {
        pPanel.appendChild(el(`<p class="stat-line">No characters yet. Create heroes (or join a campaign) and they'll appear here.</p>`));
      }
      party.forEach((c) => {
        const conds = this.heldConditions(c);
        const dying = (c.state && c.state.hp <= 0);
        const row = el(`<div class="gm-row"></div>`);
        row.appendChild(el(`<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b>${esc(c.identity.name)}</b>
          <span class="stat-line">${esc(c.identity.kin || "")} ${esc(c.identity.profession || "")}</span>
        </div>`));
        row.appendChild(el(`<div class="stat-line u-my1">
          HP <b style="color:${dying ? "var(--bad)" : "inherit"}">${c.state ? c.state.hp : "?"}</b>/${effHpMax(c)}
          · WP <b>${c.state ? c.state.wp : "?"}</b>/${effWpMax(c)}
          ${dying ? ' · <b class="u-bad">🩸 DYING</b>' : ""}
          ${conds.length ? ` · <span class="u-bad">${conds.map(esc).join(", ")}</span>` : ""}
        </div>`));
        const actions = el(`<div class="gm-tools"></div>`);
        const open = el(`<button class="btn ghost">Open sheet ↗</button>`);
        open.onclick = () => Sheet.open(c.id);
        const dmg = el(`<button class="btn ghost">− Damage</button>`);
        dmg.onclick = () => this.handDamage(c.id);
        const cond = el(`<button class="btn ghost">+ Condition</button>`);
        cond.onclick = () => this.handCondition(c.id);
        const fear = el(`<button class="btn ghost gm-fear">😱 Fear</button>`);
        fear.onclick = () => this.handFear(c.id);
        actions.append(open, dmg, cond, fear);
        row.appendChild(actions);
        pPanel.appendChild(row);
      });
      root.appendChild(pPanel);
      root.appendChild(this.tablePanel());
      if (!this._tableHook) {
        this._tableHook = true;
        window.addEventListener("table:changed", () => { const old = document.querySelector("#screen .gm-table"); if (old) old.replaceWith(this.tablePanel()); });
      }

      // ---- Drop into combat -------------------------------------------
      const dPanel = el(`<div class="panel"><h3>Drop into combat</h3><p class="stat-line">Adds a combatant to the shared Combat tracker.</p></div>`);
      const monsters = typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : [];
      const npcs = typeof DRAGONBANE_NPCS !== "undefined" ? DRAGONBANE_NPCS : [];
      const addRow = (label, list, kind) => {
        if (!list.length) return;
        const r = el(`<div class="inv-add"></div>`);
        const sel = el(`<select aria-label="${esc(label)}"><option value="">${esc(label)}…</option></select>`);
        list.forEach((m) => sel.appendChild(el(`<option value="${esc(m.id)}">${esc(m.name)} (HP ${m.hp})</option>`)));
        const add = el(`<button class="btn secondary">Add</button>`);
        add.onclick = () => {
          if (!sel.value) return;
          const m = list.find((x) => x.id === sel.value);
          Combat.mutate((st) => st.combatants.push(kind === "monster"
            ? { id: uid(), name: m.name, kind: "monster", monId: m.id, init: null, done: false, hp: m.hp, maxHp: m.hp, armor: m.armor, attacks: m.attacks, ferocity: m.ferocity || 1 }
            : { id: uid(), name: m.name, kind: "npc", npcId: m.id, init: null, done: false, hp: m.hp, maxHp: m.hp, wp: m.wp || null, maxWp: m.wp || null, armor: m.armor || 0, desc: m.desc || "", weapons: m.weapons || null, spells: m.spells || null }));
          showToast(`Added ${m.name} to combat.`, "success");
          sel.value = "";
        };
        r.append(sel, add); dPanel.appendChild(r);
      };
      addRow("Bestiary monster", monsters, "monster");
      addRow("Rulebook NPC / animal", npcs, "npc");
      root.appendChild(dPanel);

      // ---- Broadcast to players ---------------------------------------
      const bPanel = el(`<div class="panel"><h3>📢 Message players</h3></div>`);
      if (Sync.isGm()) {
        const ta = el(`<textarea class="modal-input" rows="2" placeholder="Type a message to push to all players…" aria-label="Message to players"></textarea>`);
        const send = el(`<button class="btn block">Send to players</button>`);
        send.onclick = () => { if (Sync.pushBroadcast(ta.value)) ta.value = ""; };
        bPanel.append(ta, send);
        if ((Sync.broadcast || []).length) {
          const clear = el(`<button class="btn ghost u-mt15">Clear feed (${Sync.broadcast.length})</button>`);
          clear.onclick = async () => { if (await confirmModal("Clear the GM message feed for all players?", { title: "Clear feed", okText: "Clear", danger: true })) Sync.clearBroadcast(); };
          bPanel.appendChild(clear);
        }
      } else {
        bPanel.appendChild(el(`<p class="stat-line">Create or join a campaign as the GM (Settings → Multiplayer) to push messages and table rolls to players' devices.</p>`));
      }
      root.appendChild(bPanel);

      // ---- GM reference (the official screen's aids) -------------------
      const ref = el(`<div class="panel"><h3>GM reference</h3><p class="stat-line">Roll a table privately; “📢 Push” reveals the result to players (synced GM only).</p></div>`);
      const d6Table = (title, rows) => {
        const d = el(`<details class="rule-accordion"><summary>${esc(title)}</summary></details>`);
        const inner = el(`<div style="padding:6px 2px"></div>`);
        const rollBtn = el(`<button class="btn secondary" style="margin-bottom:6px">🎲 Roll</button>`);
        const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
        rollBtn.onclick = () => {
          const r = Dice.d(6);
          const row = (rows || []).find((x) => x.d6 === r) || {};
          out.innerHTML = "";
          out.appendChild(el(`<div class="outcome gm-roll-out"><b class="gro-die">D6: ${r}</b><span class="gro-text">${esc(row.effect || "")}</span></div>`));
          inner.querySelectorAll(".d6-row").forEach((p) => p.classList.toggle("hit", +p.dataset.d6 === r));
          if (Sync.isGm()) {
            const push = el(`<button class="btn ghost u-bd-accent">📢 Push to players</button>`);
            push.onclick = () => Sync.pushBroadcast(`${title} (D6: ${r}) — ${row.effect || ""}`);
            out.appendChild(push);
          }
        };
        inner.append(rollBtn, out);
        const list = el(`<div class="d6-list"></div>`);
        (rows || []).forEach((x) => list.appendChild(el(`<p class="stat-line d6-row" data-d6="${x.d6}"><b class="d6-face">${x.d6}</b><span>${esc(x.effect)}</span></p>`)));
        inner.appendChild(list);
        d.appendChild(inner); return d;
      };
      ref.appendChild(d6Table("Demon fumble — melee (D6)", DB.demonMelee));
      ref.appendChild(d6Table("Demon fumble — ranged (D6)", DB.demonRanged));
      ref.appendChild(d6Table("Fear table (D6)", DB.fearTable));
      ref.appendChild(d6Table("Leaving the adventure site (D6)", DB.leavingSite));
      root.appendChild(ref);

      return root;
    },

    // ---- Hand-out actions (write through the normal Store path) --------
    handDamage(id) {
      const c = Store.get(id); if (!c) return;
      promptModal(`Damage to deal to ${c.identity.name}?`, { title: "Deal damage", inputType: "number", placeholder: "HP", okText: "Apply" }).then((raw) => {
        if (raw == null) return;
        const n = parseInt(raw, 10); if (isNaN(n) || n <= 0) return;
        Store.update(id, (ch) => { ch.state.hp = Math.max(0, (ch.state.hp || 0) - n); });
        showToast(`${c.identity.name} takes ${n} damage.`, "warn");
        this.refresh();
      });
    },

    handCondition(id) {
      const c = Store.get(id); if (!c) return;
      const m = modal(`Apply a condition — ${c.identity.name}`);
      const cw = el(`<div class="chip-wrap" style="display:flex;flex-wrap:wrap;gap:6px"></div>`);
      (DB.conditions || []).forEach((cn) => {
        const on = c.state && c.state.conditions && c.state.conditions[cn.key];
        const chip = el(`<button class="skill-chip ${on ? "cond-on" : ""}">${esc(cn.name)} <span class="stat-line">${cn.attribute}</span></button>`);
        chip.onclick = () => {
          Store.update(id, (ch) => { ch.state.conditions[cn.key] = !ch.state.conditions[cn.key]; });
          showToast(`${c.identity.name}: ${cn.name} ${on ? "cleared" : "applied"}.`);
          m.close(); this.refresh();
        };
        cw.appendChild(chip);
      });
      m.body.append(el(`<p class="modal-msg">Toggle a condition on this character.</p>`), cw);
    },

    handFear(id) {
      const c = Store.get(id); if (!c) return;
      const m = modal(`Fear attack — ${c.identity.name}`);
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      const fearless = (c.abilities || []).some((a) => a.name === "Fearless");
      const b = el(`<button class="btn block">Roll WIL ${c.attributes.WIL} to resist</button>`);
      b.onclick = () => {
        b.disabled = true; b.style.opacity = "0.4";
        if (fearless) { out.innerHTML = `<p class="outcome ok">Fearless — automatically resists.</p>`; return; }
        const r = Dice.d(20); const ok = r <= c.attributes.WIL;
        if (ok) { out.innerHTML = `<p class="outcome ok">${r} vs WIL ${c.attributes.WIL} — resisted.</p>`; return; }
        const fr = Dice.d(6); const row = (DB.fearTable || []).find((x) => x.d6 === fr) || {};
        let label = "";
        Store.update(id, (ch) => { label = applyInvoluntaryConditionTo(ch, "scared"); });
        out.innerHTML = `<p class="outcome bad">${r} vs WIL ${c.attributes.WIL} — fails! ${esc(label)}.</p><p class="stat-line u-mt15"><b>Fear table (D6: ${fr})</b> — ${esc(row.effect || "")}</p>`;
        this.refresh();
      };
      m.body.append(el(`<p class="modal-msg">Force ${esc(c.identity.name)} to resist a fear attack (WIL roll). On a failure they gain Scared and a fear-table result.</p>`), b, out);
    },

    // Re-render the GM screen if it is the one currently mounted.
    refresh() {
      if ($("#screen") && $("#screen .screen-gm")) {
        const s = $("#screen"); s.innerHTML = ""; s.appendChild(this.view());
      }
    },
  };
