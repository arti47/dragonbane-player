/* combat.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, Dice, el, esc, sectionTitle, uid } from './core.js';
import { confirmModal, modal, showToast } from './ui.js';
import { resolveEquippedWeapons } from './rules.js';
import { effHpMax, effWpMax, equippedArmor } from './derived.js';
import { Settings } from './settings.js';
import { Store } from './store.js';
import { Sync } from './sync.js';
import { Roller } from './roller.js';
import { Sheet } from './sheet.js';
import { renderPartyBanner } from './screens.js';
import { init } from './main.js';

export const Combat = {
    KEY: "dragonbane.combat",
    isGm() {
      return typeof Sync === "undefined" || !Sync.enabled || !Sync.campaign || Sync.campaign.role === "gm";
    },
    guardGm(fn) {
      if (!this.isGm()) {
        showToast("🛡️ GM Locked: Only the Campaign Game Master can manage combat turns or advance rounds.", "error");
        return;
      }
      fn();
    },
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(this.KEY));
        return { round: raw?.round || 0, combatants: Array.isArray(raw?.combatants) ? raw.combatants : [] };
      } catch (_) {
        return { round: 0, combatants: [] };
      }
    },
    save(s) {
      localStorage.setItem(this.KEY, JSON.stringify(s));
      if (typeof Sync !== "undefined" && Sync.enabled && Sync.campaign) {
        Sync.pushCombat(s);
      }
    },
    rerender() { const y = window.scrollY; const sc = $("#screen"); sc.innerHTML = ""; sc.appendChild(this.view()); window.scrollTo(0, y); },
    mutate(fn) {
      const s = this.load();
      fn(s);
      if (s.combatants && s.combatants.length > 0) {
        if (!s.round || s.combatants.some(c => c.init == null)) {
          this.draw(s);
          s.round = s.round || 1;
        }
        s.combatants.sort((a, b) => (a.init == null ? 99 : a.init) - (b.init == null ? 99 : b.init));
      }
      this.save(s);
      this.rerender();
    },
    advanceTurn(combatantId) {
      this.mutate(st => {
        if (combatantId) {
          const ref = st.combatants.find(c => c.id === combatantId);
          if (ref) { ref.done = true; ref.acted = true; }
        }
        const enemies = st.combatants.filter(c => c.kind === "monster" || (c.kind === "npc" && !c.isCompanion));
        const allEnemiesDead = enemies.length > 0 && enemies.every(c => c.hp != null && c.hp <= 0);
        if (allEnemiesDead) {
          st.round = 0;
          st.combatants = st.combatants.filter(c => c.kind === "hero");
          setTimeout(() => showToast("🎉 VICTORY! All enemies defeated! Battle concluded.", "success"), 50);
          return;
        }
        const active = st.combatants.filter(c => c.hp == null || c.hp > 0);
        if (active.length > 0 && active.every(c => c.done)) {
          this.draw(st);
          st.round = (st.round || 1) + 1;
          st.combatants.forEach(c => { c.done = false; c.acted = false; });
          setTimeout(() => showToast("⚔️ Round " + st.round + "! Initiative redrawn."), 50);
        }
      });
    },
    draw(s) {
      s.combatants = (s.combatants || []).filter(c => !c.isArmyOfOneSecondary);
      const cards = [1,2,3,4,5,6,7,8,9,10];
      for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
      let idx = 0;
      const nextCard = () => idx < 10 ? cards[idx++] : Dice.d(10);
      const heroAbil = (cb) => (cb.kind === "hero" && cb.charId) ? (Store.get(cb.charId)?.abilities || []) : [];
      const has = (cb, name) => heroAbil(cb).some(a => a.name === name);
      const extras = [];
      s.combatants.forEach((cb) => {
        const previousInit = cb.init;
        if (has(cb, "Veteran") && previousInit != null) {
          // Veteran — retain last round's card instead of drawing a new one.
          cb.init = previousInit;
        } else if (has(cb, "Lightning Fast")) {
          // Lightning Fast — draw two cards and keep the lower (acts earlier).
          cb.init = Math.min(nextCard(), nextCard());
        } else {
          cb.init = nextCard();
        }
        cb.done = false; cb.acted = false;
        cb.prevInit = cb.init; // remembered for a Veteran retain next round
        if (cb.kind === "hero" && cb.charId && has(cb, "Army of One")) {
          extras.push({ ...cb, id: uid(), init: nextCard(), done: false, acted: false, prevInit: null, name: `${cb.name} (Turn 2)`, isArmyOfOneSecondary: true });
        }
      });
      s.combatants.push(...extras);
    },
    ordered(s) { return [...s.combatants].sort((a, b) => (a.init == null ? 99 : a.init) - (b.init == null ? 99 : b.init)); },
    // Voluntarily wait / swap turn order: exchange initiative cards with another
    // willing combatant. GM-guarded.
    swapInit(combatantId) {
      this.guardGm(() => {
        const s = this.load();
        const me = s.combatants.find(c => c.id === combatantId);
        if (!me) return;
        const others = s.combatants.filter(c => c.id !== combatantId);
        if (!others.length) { showToast("No other combatants to swap with.", "error"); return; }
        const m = modal(`Wait / swap — ${me.name}`);
        const sel = el(`<select class="input" style="width:100%;margin-bottom:10px"></select>`);
        others.forEach(o => sel.appendChild(el(`<option value="${esc(o.id)}">${esc(o.name)} (init ${o.init == null ? "–" : o.init})</option>`)));
        const btn = el(`<button class="btn block">Swap initiative cards</button>`);
        btn.onclick = () => {
          this.mutate(st => {
            const a = st.combatants.find(c => c.id === combatantId);
            const b = st.combatants.find(c => c.id === sel.value);
            if (a && b) { const t = a.init; a.init = b.init; b.init = t; a.done = false; b.done = false; }
          });
          m.close();
        };
        m.body.append(el(`<p class="stat-line">Exchange turn order (initiative card) with:</p>`), sel, btn);
      });
    },
    // Parry / Dodge reaction: rolls the skill, consumes the turn (flips the
    // initiative card), and on a successful dodge offers a free 2 m move.
    reaction(combatantId, kind) {
      const s = this.load();
      const cb = s.combatants.find((c) => c.id === combatantId);
      if (!cb || cb.kind !== "hero" || !cb.charId) return;
      const ch = Store.get(cb.charId); if (!ch) return;
      let skillName = "Evade";
      if (kind === "parry") { const w = resolveEquippedWeapons(ch.inventory && ch.inventory.items)[0]; skillName = (w && w.skill) || "Evade"; }
      const sk = ch.skills[skillName] || { level: 5 };
      const m = modal(`${cb.name}: ${kind === "parry" ? "Parry" : "Dodge"} (reaction)`);
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      const btn = el(`<button class="btn block">Roll ${esc(skillName)} ≤ ${sk.level}</button>`);
      btn.onclick = () => {
        btn.disabled = true; btn.style.opacity = "0.4";
        const r = Dice.d(20), ok = r <= sk.level;
        this.mutate((st) => { const ref = st.combatants.find((c) => c.id === combatantId); if (ref) { ref.acted = true; ref.done = true; } });
        out.innerHTML = `<p class="outcome ${ok ? "ok" : "bad"}">${r} vs ${sk.level} — ${ok ? "Success" : "Failure"}! (the reaction consumes your upcoming action)</p>`;
        if (ok && kind === "dodge") {
          const mv = el(`<button class="btn secondary block" style="margin-top:8px">+2 m free move (successful dodge)</button>`);
          mv.onclick = () => { Store.update(cb.charId, (c2) => { c2.state.moveSpent = Math.max(0, (c2.state.moveSpent || 0) - 2); }); mv.disabled = true; mv.textContent = "✓ +2 m granted"; };
          out.appendChild(mv);
        }
      };
      m.body.append(el(`<p class="stat-line">A reaction (parry/dodge) consumes your upcoming action — it flips your initiative card. You can't parry and dodge the same attack.</p>`), btn, out);
    },
    view() {
      const s = this.load();
      const root = el(`<div></div>`);
      if (typeof renderPartyBanner === "function") { const pb = renderPartyBanner(); if (pb) root.appendChild(pb); }
      root.appendChild(el(sectionTitle("Combat tracker")));
      root.appendChild(el(`<p class="stat-line">An all-in-one tabletop dashboard: track initiative order, step HP/WP vitals (+/−), and roll monster auto-hits or hero attacks inline.</p>`));

      // Add controls panel
      const addPanel = el(`<div class="panel"></div>`);
      window._combatAddSelections = window._combatAddSelections || {};
      const inPartyCamp = typeof Sync !== "undefined" && Sync.enabled && Sync.campaign;
      const isGm = inPartyCamp && Sync.campaign.role === "gm";
      const heroes = inPartyCamp
        ? Store.list().filter(h => h.campaignId === Sync.campaign.id && (isGm || !h.owner || h.owner === Sync.uid))
        : Store.list();
      if (heroes.length) {
        const heroRow = el(`<div class="inv-add"></div>`);
        const sel = el(`<select></select>`); sel.appendChild(el(`<option value="">Add a hero…</option>`));
        heroes.forEach((h) => sel.appendChild(el(`<option value="${esc(h.id)}">${esc(h.identity.name)}</option>`)));
        if (window._combatAddSelections.hero) sel.value = window._combatAddSelections.hero;
        sel.onchange = () => { window._combatAddSelections.hero = sel.value; };
        const add = el(`<button class="btn secondary">Add</button>`);
        add.onclick = () => {
          if (!sel.value) return; const h = Store.get(sel.value);
          window._combatAddSelections.hero = "";
          const hArmor = equippedArmor(h);
          this.mutate((st) => st.combatants.push({
            id: uid(), name: h.identity.name, kind: "hero", charId: h.id, init: null, done: false,
            hp: h.state.hp, maxHp: effHpMax(h), wp: h.state.wp, maxWp: effWpMax(h),
            armor: hArmor ? hArmor.rating : 0
          }));
        };
        heroRow.append(sel, add); addPanel.appendChild(heroRow);
      }

      // Bestiary monsters
      const monsters = typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : [];
      if (monsters.length) {
        const monRow = el(`<div class="inv-add"></div>`);
        const monSel = el(`<select></select>`); monSel.appendChild(el(`<option value="">Add Bestiary monster…</option>`));
        monsters.forEach((m) => monSel.appendChild(el(`<option value="${esc(m.id)}">${esc(m.name)} (HP ${m.hp})</option>`)));
        if (window._combatAddSelections.monster) monSel.value = window._combatAddSelections.monster;
        monSel.onchange = () => { window._combatAddSelections.monster = monSel.value; };
        const monAdd = el(`<button class="btn secondary">Add</button>`);
        monAdd.onclick = () => {
          if (!monSel.value) return; const m = monsters.find(x => x.id === monSel.value);
          window._combatAddSelections.monster = "";
          this.mutate((st) => st.combatants.push({
            id: uid(), name: m.name, kind: "monster", monId: m.id, init: null, done: false,
            hp: m.hp, maxHp: m.hp, armor: m.armor, attacks: m.attacks
          }));
        };
        monRow.append(monSel, monAdd); addPanel.appendChild(monRow);
      }

      // Rulebook NPCs & Animals
      const npcs = typeof DRAGONBANE_NPCS !== "undefined" ? DRAGONBANE_NPCS : [];
      if (npcs.length) {
        const rNpcRow = el(`<div class="inv-add"></div>`);
        const rNpcSel = el(`<select></select>`); rNpcSel.appendChild(el(`<option value="">Add Rulebook NPC / Animal…</option>`));
        npcs.forEach((n) => rNpcSel.appendChild(el(`<option value="${esc(n.id)}">${esc(n.name)} (HP ${n.hp})</option>`)));
        if (window._combatAddSelections.npc) rNpcSel.value = window._combatAddSelections.npc;
        rNpcSel.onchange = () => { window._combatAddSelections.npc = rNpcSel.value; };
        const rNpcAdd = el(`<button class="btn secondary">Add</button>`);
        rNpcAdd.onclick = () => {
          if (!rNpcSel.value) return; const n = npcs.find(x => x.id === rNpcSel.value);
          window._combatAddSelections.npc = "";
          this.mutate((st) => st.combatants.push({
            id: uid(), name: n.name, kind: "npc", npcId: n.id, init: null, done: false,
            hp: n.hp, maxHp: n.hp, wp: n.wp || null, maxWp: n.wp || null, armor: n.armor || 0, desc: n.desc || "", weapons: n.weapons || null, spells: n.spells || null
          }));
        };
        rNpcRow.append(rNpcSel, rNpcAdd); addPanel.appendChild(rNpcRow);
      }

      // Custom NPC
      const npcRow = el(`<div class="inv-add"></div>`);
      const npcName = el(`<input type="text" placeholder="Add custom humanoid NPC…">`);
      if (window._combatAddSelections.custom) npcName.value = window._combatAddSelections.custom;
      npcName.oninput = () => { window._combatAddSelections.custom = npcName.value; };
      const npcAdd = el(`<button class="btn secondary">Add</button>`);
      const doNpc = () => {
        const n = npcName.value.trim(); if (!n) return;
        window._combatAddSelections.custom = "";
        this.mutate((st) => st.combatants.push({ id: uid(), name: n, kind: "npc", init: null, done: false, hp: 10, maxHp: 10, armor: 0 }));
      };
      npcAdd.onclick = doNpc; npcName.onkeydown = (e) => { if (e.key === "Enter") doNpc(); };
      npcRow.append(npcName, npcAdd); addPanel.appendChild(npcRow);
      root.appendChild(addPanel);

      if (!s.combatants.length) { root.appendChild(el(`<div class="empty"><div class="big">⚔</div><p class="stat-line">Add combatants to begin.</p></div>`)); return root; }

      // Round controls
      const ctrl = el(`<div class="panel"></div>`);
      ctrl.appendChild(el(`<p><b>${s.round ? "Round " + s.round : "Not started"}</b></p>`));
      const btns = el(`<div class="rest-row"></div>`);
      const drawBtn = el(`<button class="btn">${s.round ? "Re-draw" : "Draw initiative"}</button>`);
      drawBtn.onclick = () => this.guardGm(() => this.mutate((st) => { this.draw(st); if (!st.round) st.round = 1; }));
      const nextTurn = el(`<button class="btn ghost">Next turn</button>`);
      nextTurn.onclick = () => this.guardGm(() => this.mutate((st) => { const ord = this.ordered(st).filter((c) => c.init != null); const cur = ord.find((c) => !c.done); if (cur) { const ref = st.combatants.find((c) => c.id === cur.id); ref.done = true; } }));
      const nextRound = el(`<button class="btn ghost">Next round</button>`);
      nextRound.onclick = () => this.guardGm(() => this.mutate((st) => { this.draw(st); st.round = (st.round || 0) + 1; st.combatants.forEach(c => { c.done = false; c.acted = false; }); }));
      const resetTurns = el(`<button class="btn ghost">Reset Turns</button>`);
      resetTurns.onclick = () => this.guardGm(() => this.mutate((st) => { st.combatants.forEach(c => { c.done = false; c.acted = false; }); }));
      const end = el(`<button class="btn ghost">End combat</button>`);
      end.onclick = () => this.guardGm(async () => { if (await confirmModal("End combat and clear all combatants?", { title: "End combat", okText: "End combat", danger: true })) this.mutate((st) => { st.round = 0; st.combatants = []; }); });
      const fleeBtn = el(`<button class="btn ghost" style="border:1px dashed var(--bad);color:var(--bad)">🏃 Flee Close Combat</button>`);
      fleeBtn.onclick = () => {
        const d = Dice.d(20);
        if (d <= 5) {
          showToast(`🏃 Evade Roll: ${d} ≤ 5 → Success!\nYou successfully flee close combat without provoking a Free Attack.`);
        } else {
          const fm = modal("Evade Failed! Free Attack Triggered");
          const freeBtn = el(`<button class="btn block" style="background:var(--bad);color:#fff">🎲 Roll Enemy Free Attack</button>`);
          freeBtn.onclick = () => { freeBtn.disabled = true; showToast("🎲 GM rolls Enemy Free Attack! Apply damage as usual.", "warn"); };
          fm.body.append(
            el(`<p class="outcome bad" style="font-size:1.4rem">Rolled ${d} (Failed Evade)</p>`),
            el(`<p class="stat-line">You fail to break away cleanly. The engaged enemy gets an immediate Free Attack against you!</p>`),
            freeBtn
          );
        }
      };
      btns.append(drawBtn, nextTurn, nextRound, resetTurns, fleeBtn, end); ctrl.appendChild(btns);
      root.appendChild(ctrl);

      // Combatant list (ordered accordions)
      const list = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
      const ord = this.ordered(s);
      const currentId = (ord.find((c) => c.init != null && !c.done) || {}).id;
      ord.forEach((cb) => {
        const isCur = cb.id === currentId;
        const isDyingHero = cb.kind === "hero" && cb.hp != null && cb.hp <= 0 && !cb.defeated;
        const isDefeated = cb.defeated || (cb.hp != null && cb.hp <= 0 && !isDyingHero);
        const card = el(`<div class="panel ${isCur ? "current" : ""} ${cb.done || cb.acted ? "done" : ""}" style="margin:0;padding:0;overflow:hidden;border:1px solid ${isCur ? "var(--accent)" : "var(--border)"};opacity:${isDefeated ? "0.55" : "1"}"></div>`);
        
        const head = el(`<div class="combat-row" style="display:flex;flex-direction:column;padding:10px 12px;cursor:pointer;gap:8px;${isDefeated ? "text-decoration:line-through;background:rgba(0,0,0,0.15)" : ""}">
          <div style="display:flex;align-items:center;gap:10px;width:100%">
            <span class="init-card" style="margin:0;flex-shrink:0">${cb.init == null ? "–" : cb.init}</span>
            <span class="cb-name" style="font-weight:bold;font-size:1.3rem;color:var(--ink);word-break:break-word">${esc(cb.name)}</span>
            <div class="row-top-actions" style="display:flex;align-items:center;gap:4px;margin-left:auto"></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;width:100%;flex-wrap:wrap">
            <span class="tag">${cb.kind === "hero" ? "Hero" : cb.kind === "monster" ? "Monster" : "NPC"}</span>
            ${isCur && !isDefeated ? '<span class="tag" style="background:var(--accent);color:#f7eed6;border-color:var(--accent)">now</span>' : ""}
            ${isDefeated ? '<span class="tag" style="background:var(--bad);color:#fff">💀 DEFEATED</span>' : ""}
            ${isDyingHero ? '<span class="tag" style="background:var(--bad);color:#fff">🩸 DYING (0 HP)</span>' : ""}
            <div class="quick-attacks" style="display:flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap;justify-content:flex-end"></div>
            <span style="font-weight:bold;font-size:1.15rem;color:${isDefeated || isDyingHero ? "var(--bad)" : "inherit"};padding-left:4px">${cb.hp != null ? `HP ${cb.hp}/${cb.maxHp || cb.hp}` : ""}</span>
          </div>
        </div>`);

        const quickWrap = head.querySelector(".quick-attacks");
        if (!isDefeated) {
          if (cb.kind === "monster" && cb.attacks && cb.attacks.length) {
            const d6Quick = el(`<button class="skill-chip quick-chip" style="background:var(--ok);color:#fff;border:none" title="Roll monster attack">🎲 Atk</button>`);
            d6Quick.onclick = (e) => {
              e.stopPropagation();
              const d6 = Dice.d(6);
              const idx = Math.min(cb.attacks.length - 1, Math.floor((d6 - 1) / (6 / cb.attacks.length)));
              const chosen = cb.attacks[idx] || cb.attacks[0];
              Roller.monsterAttack(cb.name, chosen, d6, cb.id);
            };
            quickWrap.appendChild(d6Quick);
          } else if (isDyingHero) {
            const drBtn = el(`<button class="skill-chip quick-chip" style="border-color:var(--bad);color:var(--bad)" title="Make Death Roll">💀 Roll</button>`);
            drBtn.onclick = (e) => { e.stopPropagation(); Sheet.deathRollModal(cb.charId); };
            quickWrap.appendChild(drBtn);
          } else if (cb.kind === "hero" && cb.charId) {
            const h = Store.get(cb.charId);
            if (h) {
              const baseMv = h.derived?.movement || 10;
              const maxMv = (h.state?.isMounted ? 20 : baseMv) * (h.state?.isDashing ? 2 : 1) * (h.abilities?.some(x=>x.name==="Longstrider")?2:1);
              const remMv = Math.max(0, maxMv - (h.state?.moveSpent || 0));
              const mvBtn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent);color:var(--accent)" title="Movement: ${remMv}m / ${maxMv}m (click to manage)">🏃 ${remMv}m</button>`);
              mvBtn.onclick = (e) => { e.stopPropagation(); Sheet.movementModal(cb.charId); };
              quickWrap.appendChild(mvBtn);
            }
            const hWeapons = resolveEquippedWeapons(h && h.inventory && h.inventory.items);
            if (hWeapons[0]) {
              const w0 = hWeapons[0];
              const hQuick = el(`<button class="skill-chip quick-chip" title="Attack with ${esc(w0.name)}">⚔️ ${esc(w0.name)}</button>`);
              hQuick.onclick = (e) => { e.stopPropagation(); Roller.heroWeaponAttack(cb.charId, w0, cb.id); };
              quickWrap.appendChild(hQuick);
            }
          } else if (cb.kind === "npc" && cb.weapons && cb.weapons[0]) {
            const nw0 = cb.weapons[0];
            const nQuick = el(`<button class="skill-chip quick-chip" title="Attack with ${esc(nw0.name)}">⚔️ ${esc(nw0.name)}</button>`);
            nQuick.onclick = (e) => { e.stopPropagation(); Roller.npcAttack(cb.name, nw0, cb.id); };
            quickWrap.appendChild(nQuick);
          }

          const actedBadge = el(`<button class="skill-chip quick-chip ${cb.acted ? "picked" : ""}" title="Toggle whether character has acted this round">${cb.acted ? "Done ✓" : "Turn [ ]"}</button>`);
          actedBadge.onclick = (e) => {
            e.stopPropagation();
            this.guardGm(() => this.mutate(st => {
              const ref = st.combatants.find(c => c.id === cb.id);
              if (ref) ref.acted = !ref.acted;
            }));
          };
          quickWrap.appendChild(actedBadge);
        }

        const body = el(`<div style="padding:12px;border-top:1px dashed var(--border);display:${isCur ? "block" : "none"};background:var(--bg)"></div>`);
        
        head.onclick = (e) => {
          if (e.target.tagName === "BUTTON") return;
          body.style.display = body.style.display === "none" ? "block" : "none";
        };

        const topActions = head.querySelector(".row-top-actions");
        if (cb.init != null && !isDefeated) {
          const swap = el(`<button class="step" title="wait / swap initiative" aria-label="Wait or swap initiative">⇅</button>`);
          swap.onclick = (e) => { e.stopPropagation(); this.swapInit(cb.id); };
          topActions.appendChild(swap);
        }
        if (cb.kind === "hero" && cb.charId) {
          const open = el(`<button class="step" title="open sheet" aria-label="Open character sheet">↗</button>`);
          open.onclick = (e) => { e.stopPropagation(); Sheet.open(cb.charId); };
          topActions.appendChild(open);
        }
        const rm = el(`<button class="step rm" aria-label="Remove combatant">✕</button>`);
        rm.onclick = (e) => { e.stopPropagation(); this.mutate((st) => { st.combatants = st.combatants.filter((c) => c.id !== cb.id); }); };
        topActions.appendChild(rm);

        // Vitals
        if (cb.hp != null) {
          const vitRow = el(`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"></div>`);
          const hpMin = el(`<button class="step" style="width:34px;height:34px;font-size:1.5rem" type="button">−</button>`);
          const hpPl = el(`<button class="step" style="width:34px;height:34px;font-size:1.5rem" type="button">+</button>`);
          const hpSpan = el(`<span style="font-size:1.3rem;font-weight:bold;min-width:48px;text-align:center">${cb.hp} / ${cb.maxHp || cb.hp}</span>`);
          const doHp = (d) => {
            const st = this.load();
            const ref = st.combatants.find(c => c.id === cb.id);
            if (ref && ref.hp != null) {
              const prev = ref.hp;
              ref.hp = d < 0 ? Math.max(0, ref.hp - 1) : Math.min(ref.maxHp || 999, ref.hp + 1);
              ref.defeated = ref.hp === 0 && ref.kind !== "hero";
              cb.hp = ref.hp; cb.defeated = ref.defeated;
              this.save(st);
              if (ref.kind === "hero" && ref.charId) Store.update(ref.charId, ch => { ch.state.hp = ref.hp; });
              hpSpan.textContent = `${cb.hp} / ${cb.maxHp || cb.hp}`;
              if ((prev === 0 && cb.hp > 0) || (prev > 0 && cb.hp === 0)) this.rerender();
            }
          };
          hpMin.onclick = (e) => { e.preventDefault(); doHp(-1); };
          hpPl.onclick = (e) => { e.preventDefault(); doHp(1); };
          vitRow.append(el(`<span class="stat-line" style="margin:0"><b>HP:</b></span>`), hpMin, hpSpan, hpPl);
          if (cb.armor != null && cb.armor > 0) vitRow.append(el(`<span class="tag" style="margin-left:6px">Armor ${cb.armor}</span>`));
          body.appendChild(vitRow);
        }

        // Attacks
        if (cb.kind === "monster" && cb.attacks && cb.attacks.length) {
          const atkDiv = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
          atkDiv.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0"><b>Monster Attacks (Auto-hit):</b></p>`));
          
          const d6BannerBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;font-size:1.15rem;padding:10px;margin-bottom:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2)">🎲 Roll D6 Monster Attack Table</button>`);
          d6BannerBtn.onclick = () => {
            const d6 = Dice.d(6);
            const idx = Math.min(cb.attacks.length - 1, Math.floor((d6 - 1) / (6 / cb.attacks.length)));
            const chosen = cb.attacks[idx] || cb.attacks[0];
            Roller.monsterAttack(cb.name, chosen, d6, cb.id);
          };
          atkDiv.appendChild(d6BannerBtn);

          const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
          cb.attacks.forEach((atk, i) => {
            const rangeStr = (cb.attacks.length === 6) ? `${i+1}` : (cb.attacks.length === 3 ? `${i*2+1}-${i*2+2}` : `${i+1}`);
            const b = el(`<button class="btn secondary block combat-action" style="font-size:1.1rem;background:var(--card-bg);color:var(--text)"><b>[${rangeStr}]</b> ${esc(atk.name)}${atk.damage ? ` <br><small style="color:var(--muted)">(${atk.damage})</small>` : ""}</button>`);
            b.onclick = () => Roller.monsterAttack(cb.name, atk, null, cb.id);
            grid.appendChild(b);
          });
          atkDiv.appendChild(grid); body.appendChild(atkDiv);
        } else if (cb.kind === "hero" && cb.charId) {
          const h = Store.get(cb.charId);
          if (h) {
            const hDiv = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
            if (isDyingHero) {
              const drBox = el(`<div style="padding:10px;border:1px dashed var(--bad);border-radius:6px;background:rgba(180,50,50,0.08);margin-bottom:8px">
                <b style="color:var(--bad)">🩸 Unconscious & Dying</b><br>
                <span class="stat-line" style="font-size:0.9rem">Your hero is down at 0 HP. Roll a death roll each round. 3 successes = stabilize (+D6 HP); 3 failures = death.</span>
              </div>`);
              const bigRoll = el(`<button class="btn block" style="border-color:var(--bad);color:var(--bad);margin-top:6px">💀 Death roll</button>`);
              bigRoll.onclick = () => Sheet.deathRollModal(cb.charId);
              drBox.appendChild(bigRoll);
              hDiv.appendChild(drBox);
            }
            const hWeapons = resolveEquippedWeapons(h.inventory && h.inventory.items);
            if (hWeapons.length) {
              hDiv.appendChild(el(`<p class="stat-line" style="margin:0"><b>Equipped Weapons:</b></p>`));
              const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
              hWeapons.forEach(w => {
                const b = el(`<button class="btn secondary block combat-action" style="font-size:1.15rem">${esc(w.name)} <br><small>${esc(w.skill)} (${w.damage})</small></button>`);
                b.onclick = () => Roller.heroWeaponAttack(cb.charId, w, cb.id);
                grid.appendChild(b);
              });
              hDiv.appendChild(grid);
            }
            const allSpells = [...((h.spells && h.spells.tricks) || []), ...((h.spells && h.spells.known) || [])];
            if (allSpells.length) {
              hDiv.appendChild(el(`<p class="stat-line" style="margin:4px 0 0 0"><b>Known Spells & Tricks:</b></p>`));
              const sGrid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
              allSpells.forEach(sp => {
                const isT = (h.spells.tricks || []).includes(sp);
                const b = el(`<button class="btn ghost block combat-action" style="font-size:1.1rem;border-color:var(--accent)">★ ${esc(sp.name)} <br><small style="color:var(--muted)">${isT ? "Trick (1 WP)" : `Rank ${sp.rank||1} Spell`}</small></button>`);
                b.onclick = () => Roller.cast(cb.charId, sp, isT);
                sGrid.appendChild(b);
              });
              hDiv.appendChild(sGrid);
            }
            // Reactions (Phase 16) — parry / dodge consume the upcoming action.
            const reactRow = el(`<div style="display:flex;gap:6px;margin-top:6px"></div>`);
            reactRow.appendChild(el(`<p class="stat-line" style="margin:0;width:100%"><b>Reactions:</b></p>`));
            const parryB = el(`<button class="btn ghost" style="flex:1">🛡 Parry</button>`);
            parryB.onclick = () => this.reaction(cb.id, "parry");
            const dodgeB = el(`<button class="btn ghost" style="flex:1">🤸 Dodge</button>`);
            dodgeB.onclick = () => this.reaction(cb.id, "dodge");
            reactRow.append(parryB, dodgeB);
            hDiv.appendChild(reactRow);
            if (hDiv.children.length) body.appendChild(hDiv);
          }
        } else if (cb.kind === "npc") {
          const npcDiv = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
          if (cb.desc) npcDiv.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0;font-size:1.15rem">${esc(cb.desc)}</p>`));
          if (cb.weapons && cb.weapons.length) {
            const grid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
            cb.weapons.forEach(w => {
              const b = el(`<button class="btn secondary block combat-action" style="font-size:1.15rem">${esc(w.name)} <br><small>Skill ${w.skill}${w.damage ? ` (${w.damage}${w.bonus ? "+"+w.bonus : ""})` : ""}</small></button>`);
              b.onclick = () => Roller.npcAttack(cb.name, w, cb.id);
              grid.appendChild(b);
            });
            npcDiv.appendChild(grid);
          } else {
            npcDiv.appendChild(el(`<p class="stat-line" style="margin:0">💡 Ordinary NPCs roll standard combat skills against PCs. True Monsters auto-hit.</p>`));
          }
          if (cb.spells && cb.spells.length) {
            npcDiv.appendChild(el(`<p class="stat-line" style="margin:4px 0 0 0"><b>Known Spells:</b></p>`));
            const sGrid = el(`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px"></div>`);
            cb.spells.forEach(sp => {
              const b = el(`<button class="btn ghost block combat-action" style="font-size:1.1rem;border-color:var(--accent)">🪄 ${esc(sp.name)} <br><small style="color:var(--muted)">Rank ${sp.rank||1} Spell</small></button>`);
              b.onclick = () => Roller.npcCast(cb.name, sp, cb.id);
              sGrid.appendChild(b);
            });
            npcDiv.appendChild(sGrid);
          }
          if (Settings.soloMode() && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.npcAttackTable) {
            const natBtn = el(`<button class="btn ghost block" style="margin-top:4px;border:1px dashed var(--accent)">🎲 Roll NPC Attack Table (AI Action)</button>`);
            natBtn.onclick = () => Roller.rollNpcAttackTable(cb.name, cb.id);
            npcDiv.appendChild(natBtn);
          }
          body.appendChild(npcDiv);
        }

        card.append(head, body);
        list.appendChild(card);
      });
      root.appendChild(list);
      return root;
    }
  };

  /* =================================================================
   * Solo Assistant (Phase 5B) — Oracle, Inspiration, NPCs
   * ================================================================= */
