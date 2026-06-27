/* gm.js — Dragonbane Player (Phase 21).
   The GM dashboard: a live party panel, peek-any-sheet, drop monsters/NPCs into
   the shared combat tracker, and "hand out" damage / conditions / fear attacks —
   plus glanceable GM reference tables (the official GM-screen aids: NPC quick
   stats, Demon fumble tables, fear table, leaving-a-site). Gated behind the
   "GM Screen" setting (or an actual campaign GM). Strictly additive — invisible
   to plain players. Rules numbers all come from the data libraries (§9). */
import { $, DB, Dice, el, esc, sectionTitle, uid } from './core.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Settings } from './settings.js';
import { modal, showToast, promptModal, confirmModal } from './ui.js';
import { effHpMax, effWpMax } from './derived.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';

export const GM = {
    // Show the GM surface when the user has turned it on, or is the GM of a synced campaign.
    enabled() { return Settings.gmScreen() || (Sync && Sync.campaign && Sync.campaign.role === "gm"); },

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

    view() {
      const root = el(`<div class="screen-gm"></div>`);
      root.appendChild(el(sectionTitle("🎲 GM Screen")));

      // ---- Party panel -------------------------------------------------
      const party = this.party();
      const pPanel = el(`<div class="panel"><h3>Party</h3></div>`);
      if (!party.length) {
        pPanel.appendChild(el(`<p class="stat-line">No characters yet. Create heroes (or join a campaign) and they'll appear here.</p>`));
      }
      party.forEach((c) => {
        const conds = this.heldConditions(c);
        const dying = (c.state && c.state.hp <= 0);
        const row = el(`<div class="gm-row" style="border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px"></div>`);
        row.appendChild(el(`<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b>${esc(c.identity.name)}</b>
          <span class="stat-line">${esc(c.identity.kin || "")} ${esc(c.identity.profession || "")}</span>
        </div>`));
        row.appendChild(el(`<div class="stat-line" style="margin:4px 0">
          HP <b style="color:${dying ? "var(--bad)" : "inherit"}">${c.state ? c.state.hp : "?"}</b>/${effHpMax(c)}
          · WP <b>${c.state ? c.state.wp : "?"}</b>/${effWpMax(c)}
          ${dying ? ' · <b style="color:var(--bad)">🩸 DYING</b>' : ""}
          ${conds.length ? ` · <span style="color:var(--bad)">${conds.map(esc).join(", ")}</span>` : ""}
        </div>`));
        const actions = el(`<div style="display:flex;gap:6px;flex-wrap:wrap"></div>`);
        const open = el(`<button class="btn ghost" style="flex:1;min-width:90px">Open sheet ↗</button>`);
        open.onclick = () => Sheet.open(c.id);
        const dmg = el(`<button class="btn ghost" style="flex:1;min-width:90px">− Damage</button>`);
        dmg.onclick = () => this.handDamage(c.id);
        const cond = el(`<button class="btn ghost" style="flex:1;min-width:90px">+ Condition</button>`);
        cond.onclick = () => this.handCondition(c.id);
        const fear = el(`<button class="btn ghost" style="flex:1;min-width:90px;border-color:var(--bad)">😱 Fear</button>`);
        fear.onclick = () => this.handFear(c.id);
        actions.append(open, dmg, cond, fear);
        row.appendChild(actions);
        pPanel.appendChild(row);
      });
      root.appendChild(pPanel);

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
            ? { id: uid(), name: m.name, kind: "monster", monId: m.id, init: null, done: false, hp: m.hp, maxHp: m.hp, armor: m.armor, attacks: m.attacks }
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
          const clear = el(`<button class="btn ghost" style="margin-top:6px">Clear feed (${Sync.broadcast.length})</button>`);
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
          out.appendChild(el(`<p class="outcome" style="margin:4px 0;font-size:1.05rem"><b>D6: ${r}</b> — ${esc(row.effect || "")}</p>`));
          if (Sync.isGm()) {
            const push = el(`<button class="btn ghost" style="border-color:var(--accent)">📢 Push to players</button>`);
            push.onclick = () => Sync.pushBroadcast(`${title} (D6: ${r}) — ${row.effect || ""}`);
            out.appendChild(push);
          }
        };
        inner.append(rollBtn, out);
        (rows || []).forEach((x) => inner.appendChild(el(`<p class="stat-line" style="margin:2px 0"><b>${x.d6}</b> — ${esc(x.effect)}</p>`)));
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
        Store.update(id, (ch) => { ch.state.conditions.scared = true; });
        out.innerHTML = `<p class="outcome bad">${r} vs WIL ${c.attributes.WIL} — fails! Becomes Scared.</p><p class="stat-line" style="margin-top:6px"><b>Fear table (D6: ${fr})</b> — ${esc(row.effect || "")}</p>`;
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
