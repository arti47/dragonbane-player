/* roller.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, CONDITION_BY_MISHAP, DB, Dice, MISHAPS, el, esc } from './core.js';
import { modal, showToast } from './ui.js';
import { resolveCanonicalSpell, resolveEquippedWeapons } from './rules.js';
import { armorBanedSkills, equippedArmor, equippedHelmet, normalizeInventory } from './derived.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { SpellAutomation } from './spell-automation.js';
import { Sheet } from './sheet.js';
import { Combat } from './combat.js';

export const Roller = {
    // Roll a d20 honoring a net boon/bane (+ = boon → take lowest; − = bane → take highest).
    d20net(net) {
      if (net === 0) { const r = Dice.d(20); return { dice: [r], used: r }; }
      const two = [Dice.d(20), Dice.d(20)];
      return { dice: two, used: net > 0 ? Math.min(...two) : Math.max(...two) };
    },
    netLabel(net) { return net > 0 ? `Boon ×${net}` : net < 0 ? `Bane ×${-net}` : "Even (1d20)"; },
    refresh(charId) {
      // Only re-render the character sheet when it is actually the mounted
      // screen (window.activeCharacterId tracks the open sheet). Otherwise — e.g.
      // when casting from the Combat tracker — re-render combat for the vitals,
      // never replace the current screen with the sheet (that hijacked the view).
      if (Sheet.id === charId && window.activeCharacterId === charId) { Sheet.render(); return; }
      const active = document.querySelector("#app-nav button.active");
      if (active && active.dataset.route === "party" && typeof Combat !== "undefined") Combat.rerender();
    },

    // Condition overflow: when all six conditions are already held and the
    // character would gain another (e.g. by pushing), they instead lose D6 WP —
    // or D6 HP if WP is already 0. Returns a label describing the penalty.
    applyConditionOverflow(charId) {
      let label = "";
      Store.update(charId, (ch) => {
        const d = Dice.roll("D6");
        if ((ch.state.wp || 0) > 0) { ch.state.wp = Math.max(0, ch.state.wp - d); label = `all six conditions held → lost ${d} WP`; }
        else { ch.state.hp = Math.max(0, ch.state.hp - d); label = `all six conditions held (WP 0) → lost ${d} HP`; }
      });
      return label;
    },

    // ---- Skill roll ----
    skill(charId, name, opts = {}) {
      const c = Store.get(charId); if (!c) return;
      const sk = c.skills[name];
      const condBane = !!(DB.conditions || []).find((cn) => cn.attribute === sk.attribute && c.state.conditions[cn.key]);
      const armorBane = armorBanedSkills(c).has(name);
      let net = (condBane ? -1 : 0) + (armorBane ? -1 : 0);
      const m = modal(`Roll: ${name}`);
      const head = el(`<p class="stat-line">Skill level <b>${sk.level}</b> · ${sk.attribute}${condBane ? ` · <span style="color:var(--bad)">${sk.attribute} condition → bane</span>` : ""}${armorBane ? ` · <span style="color:var(--bad)">worn armor → bane</span>` : ""}. Roll equal or under to succeed.</p>`);
      const ctl = el(`<div class="roll-ctl"></div>`);
      const lbl = el(`<span class="net-lbl">${this.netLabel(net)}</span>`);
      const minus = el(`<button class="step">−</button>`), plus = el(`<button class="step">+</button>`);
      minus.onclick = () => { net--; lbl.textContent = this.netLabel(net); };
      plus.onclick = () => { net++; lbl.textContent = this.netLabel(net); };
      ctl.append(el(`<span class="stat-line">Boon / Bane</span>`), minus, lbl, plus);
      const rollBtn = el(`<button class="btn block" style="margin-top:12px">Roll d20</button>`);
      const result = el(`<div class="roll-result"></div>`);
      const doRoll = (pushedCondition) => {
        if (!pushedCondition) {
          rollBtn.disabled = true; rollBtn.style.opacity = "0.4"; rollBtn.style.cursor = "not-allowed";
          minus.disabled = true; plus.disabled = true;
        }
        const r = this.d20net(net);
        const dragon = r.used === 1, demon = r.used === 20;
        const success = r.used <= sk.level;
        if (dragon || demon) Store.update(charId, (ch) => { ch.skills[name].mark = true; });
        let html = `<div class="dice-faces">${r.dice.map((d) => `<span class="die ${d === r.used ? "used" : ""}">${d}</span>`).join("")}</div>`;
        html += `<p class="outcome ${success ? "ok" : "bad"}">${dragon ? "🐉 DRAGON — critical success!" : demon ? "👹 DEMON — critical failure!" : success ? "Success" : "Failure"}</p>`;
        if (dragon || demon) html += `<p class="stat-line">Advancement mark added to ${esc(name)}.</p>`;
        if (pushedCondition) html += `<p class="stat-line">Pushed — <b>${esc(pushedCondition)}</b>.</p>`;
        result.innerHTML = html;
        // Offer push if failed and not a demon (pushing is always allowed; the
        // cost is a chosen condition, or the overflow penalty when all six held).
        const curChar = Store.get(charId) || c;
        const curConds = curChar?.state?.conditions || {};
        const remaining = (DB.conditions || []).filter((cn) => !curConds[cn.key]);
        const hasSS = curChar?.abilities?.some((a) => a.name === "Sole Survivor") && (curChar?.state?.wp || 0) >= 3;
        if (!success && !demon && !pushedCondition) {
          const pushWrap = el(`<div class="push-wrap"><p class="stat-line">Push the roll? Choose a condition to suffer, then re-roll:</p></div>`);
          const cw = el(`<div class="chip-wrap"></div>`);
          remaining.forEach((cn) => {
            const chip = el(`<button class="skill-chip">${esc(cn.name)} <span class="stat-line">${cn.attribute}</span></button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.conditions[cn.key] = true; }); this.refresh(charId); doRoll("gained " + cn.name); };
            cw.appendChild(chip);
          });
          if (hasSS) {
            const chip = el(`<button class="skill-chip" style="border-color:var(--accent)">💫 Sole Survivor <span class="stat-line">−3 WP</span></button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.wp -= 3; }); this.refresh(charId); doRoll("Sole Survivor (−3 WP)"); };
            cw.appendChild(chip);
          }
          if (!remaining.length) {
            pushWrap.querySelector("p").textContent = "All six conditions held — pushing costs D6 WP (or D6 HP if WP is 0). Push and re-roll:";
            const chip = el(`<button class="skill-chip" style="border-color:var(--bad)">⚠ Push (lose D6 WP/HP)</button>`);
            chip.onclick = () => { const label = this.applyConditionOverflow(charId); this.refresh(charId); doRoll(label); };
            cw.appendChild(chip);
          }
          pushWrap.appendChild(cw); result.appendChild(pushWrap);
        }
        // Fail forward (solo): turn a failure into success-at-a-cost.
        if (!success && !pushedCondition && Settings.soloMode() && typeof DRAGONBANE_SOLO !== "undefined" && (DRAGONBANE_SOLO.failForward || []).length) {
          const ffWrap = el(`<div class="push-wrap" style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px"></div>`);
          const ffBtn = el(`<button class="btn ghost" style="border-color:var(--accent)">🎲 Fail forward (succeed at a cost)</button>`);
          const ffOut = el(`<div style="margin-top:6px"></div>`);
          ffBtn.onclick = () => { const t = DRAGONBANE_SOLO.failForward; const r = Dice.d(t.length); ffOut.innerHTML = `<p class="stat-line" style="border-left:3px solid var(--accent);padding-left:8px">D${t.length}=${r}: ${esc(t[r - 1])}</p>`; };
          ffWrap.append(ffBtn, ffOut); result.appendChild(ffWrap);
        }
        if (typeof opts.onRoll === "function") opts.onRoll(success, dragon, demon);
        this.refresh(charId);
      };
      rollBtn.onclick = () => doRoll(null);
      m.body.append(head, ctl, rollBtn, result);
    },

    renderDamageApplier(attackerCombatantId, rawDamage, defaultIgnoreArmor = false) {
      const cst = Combat.load() || { combatants: [] };
      const targets = (cst.combatants || []).filter(cb => cb.id !== attackerCombatantId && !cb.defeated && (cb.hp == null || cb.hp > 0));
      if (!targets.length) return el(`<p class="stat-line" style="color:var(--muted);margin-top:12px">💡 No active opponent targets in combat tracker. (Add monsters or NPCs in the <b>Combat</b> tab to apply damage directly to their HP)</p>`);

      const wrap = el(`<div style="margin-top:14px;padding:12px;background:var(--bg);border:1px solid var(--ok);border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>`);
      wrap.appendChild(el(`<p class="stat-line" style="margin:0 0 8px 0;color:var(--ok);font-size:1.1rem"><b>🎯 Apply Damage to Target:</b></p>`));

      const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px"></div>`);
      const sel = el(`<select class="input" style="flex:1;min-width:180px"></select>`);
      targets.forEach(t => {
        const arm = t.armor || 0;
        sel.appendChild(el(`<option value="${t.id}">${esc(t.name)} (HP: ${t.hp == null ? "?" : t.hp}${arm ? ` · Armor ${arm}` : ""})</option>`));
      });
      row.appendChild(sel);

      const chkLbl = el(`<label style="display:flex;align-items:center;gap:6px;font-size:0.95rem;cursor:pointer"><input type="checkbox" ${defaultIgnoreArmor ? "checked" : ""}> Ignore Target Armor</label>`);
      row.appendChild(chkLbl);
      wrap.appendChild(row);

      const applyBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;font-size:1.15rem;padding:10px">💥 Apply ${rawDamage} Damage Now</button>`);
      applyBtn.onclick = () => {
        const targetId = sel.value;
        const ignoreArm = chkLbl.querySelector("input").checked;
        const comb = Combat.load();
        if (!comb || !comb.combatants) return;
        const tgt = comb.combatants.find(c => c.id === targetId);
        if (!tgt) return;

        const armSub = ignoreArm ? 0 : (tgt.armor || 0);
        const netDmg = Math.max(0, rawDamage - armSub);
        
        if (tgt.hp != null) {
          tgt.hp = Math.max(0, tgt.hp - netDmg);
          if (tgt.hp === 0 && tgt.kind !== "hero") tgt.defeated = true;
          if (tgt.kind === "hero" && tgt.charId) {
            Store.update(tgt.charId, ch => { ch.state.hp = tgt.hp; });
          }
        } else {
          tgt.hp = 0; tgt.defeated = true;
        }

        if (attackerCombatantId) {
          const att = comb.combatants.find(c => c.id === attackerCombatantId);
          if (att) att.acted = true;
        }
        Combat.save(comb);
        if (attackerCombatantId) Combat.advanceTurn(attackerCombatantId);

        applyBtn.disabled = true;
        applyBtn.textContent = `✓ Applied ${netDmg} Net Damage to ${tgt.name}!`;
        applyBtn.style.background = "var(--muted)";
        
        const activeNav = document.querySelector("#app-nav button.active");
        if (activeNav && activeNav.dataset.route === "party") {
          Combat.rerender();
        }
      };
      wrap.appendChild(applyBtn);
      return wrap;
    },

    // ---- Hero weapon attack & damage (all-in-one) ----
    damage(charId, weapon, combatantId) { this.heroWeaponAttack(charId, weapon, combatantId); },
    heroWeaponAttack(charId, weapon, combatantId) {
      const c = Store.get(charId); if (!c) return;
      const skillName = weapon.skill || "Swords";
      const skillObj = c.skills[skillName] || { level: 5 };
      const target = skillObj.level || 5;
      const skillDef = (DB.skills || []).find((s) => s.name === skillName);
      const attr = skillDef ? skillDef.attribute : "STR";
      const noBonus = (weapon.features || []).includes("no damage bonus");
      const bonusDie = noBonus ? null : (attr === "AGL" ? c.derived.dmgBonusAGL : c.derived.dmgBonusSTR);
      const isRanged = weapon.type === "ranged" || (weapon.features || []).some(f => /quiver|arrow|bolt|sling/i.test(f));

      const m = modal(`${c.identity.name || "Hero"}: ${weapon.name}`);
      const out = el(`<div class="roll-result"></div>`);
      
      // Top section: Attack Roll
      const atkDiv = el(`<div class="panel" style="margin-bottom:12px;background:var(--card-bg);padding:12px"></div>`);
      const head = el(`<div class="rest-row" style="margin-bottom:8px"></div>`);
      head.appendChild(el(`<span class="stat-line" style="margin:0;font-size:1.2rem"><b>Attack Roll:</b> ${esc(skillName)} ≤ ${target}</span>`));
      
      const ctl = el(`<div class="net-control"></div>`);
      let net = 0;
      const lbl = el(`<span class="net-val">0</span>`);
      const minus = el(`<button class="step" title="bane">−</button>`);
      const plus = el(`<button class="step" title="boon">+</button>`);
      const upd = () => { lbl.textContent = net === 0 ? "Normal" : net > 0 ? `+${net} Boon` : `${net} Bane`; lbl.className = `net-val ${net > 0 ? "boon" : net < 0 ? "bane" : ""}`; };
      minus.onclick = () => { net--; upd(); }; plus.onclick = () => { net++; upd(); };
      ctl.append(minus, lbl, plus);
      head.appendChild(ctl);
      atkDiv.appendChild(head);

      const isLong = (weapon.features || []).some(f => /long/i.test(f));
      if (isLong) {
        atkDiv.appendChild(el(`<p class="stat-line" style="color:var(--accent);margin:4px 0">🗡️ <b>Long Weapon (2m Reach):</b> Strike enemies 2m away without provoking close combat retaliation.</p>`));
      }

      if (c.state.conditions && c.state.conditions[attr]) {
        atkDiv.appendChild(el(`<p class="warn-bane" style="margin:4px 0">⚠ ${attr} condition bane applies</p>`));
      }

      // STR-requirement bane + two-handed grip (−3 STR req). Melee weapons only.
      let twoHandGrip = false;
      const heroStr = c.attributes?.STR ?? 0;
      const effStrReq = () => (weapon.str || 0) - (twoHandGrip ? 3 : 0);
      const strShortfall = () => weapon.str != null && weapon.type !== "ranged" && heroStr < effStrReq();
      if (weapon.str != null && weapon.type !== "ranged") {
        const strNote = el(`<p class="warn-bane" style="margin:4px 0;display:${strShortfall() ? "block" : "none"}">⚠ STR ${heroStr} &lt; requirement ${effStrReq()} → bane</p>`);
        const refreshStr = () => { strNote.textContent = `⚠ STR ${heroStr} < requirement ${effStrReq()} → bane`; strNote.style.display = strShortfall() ? "block" : "none"; };
        // Two-handed grip toggle only matters for a 1H weapon (a 2H weapon is already two-handed).
        if (weapon.grip === "1H") {
          const gripRow = el(`<label style="display:flex;align-items:center;gap:6px;font-size:0.95rem;margin:6px 0;cursor:pointer"><input type="checkbox"> Two-handed grip (−3 STR req; no shield/off-hand)</label>`);
          gripRow.querySelector("input").onchange = (e) => { twoHandGrip = e.target.checked; refreshStr(); };
          atkDiv.appendChild(gripRow);
        }
        atkDiv.appendChild(strNote);
      }

      if (isRanged) {
        if (equippedHelmet(c) && equippedHelmet(c).rangedBane) {
          atkDiv.appendChild(el(`<p class="warn-bane" style="margin:4px 0">⚠ Great Helm → bane on all ranged attacks</p>`));
        }
        if (typeof c.state.combatAmmo !== "number") c.state.combatAmmo = 12;
        const pbRow = el(`<label style="display:flex;align-items:center;gap:6px;font-size:0.95rem;margin:6px 0;cursor:pointer"><input type="checkbox"> Point-blank (engaged within 2m) → Bane</label>`);
        pbRow.querySelector("input").onchange = (e) => { net += e.target.checked ? -1 : 1; upd(); };
        atkDiv.appendChild(pbRow);
        const ammoRow = el(`<div style="display:flex;align-items:center;gap:8px;margin-top:8px"></div>`);
        const aMin = el(`<button class="step" style="width:28px;height:28px;font-size:1.2rem">−</button>`);
        const aPl = el(`<button class="step" style="width:28px;height:28px;font-size:1.2rem">+</button>`);
        const aLbl = el(`<span style="font-weight:bold;font-size:1.1rem">Arrows / Bolts: ${c.state.combatAmmo}</span>`);
        aMin.onclick = () => { c.state.combatAmmo = Math.max(0, c.state.combatAmmo - 1); Store.update(charId, ch => { ch.state.combatAmmo = c.state.combatAmmo; }); aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`; };
        aPl.onclick = () => { c.state.combatAmmo++; Store.update(charId, ch => { ch.state.combatAmmo = c.state.combatAmmo; }); aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`; };
        ammoRow.append(aMin, aLbl, aPl);
        atkDiv.appendChild(ammoRow);
      }

      const rollAtkBtn = el(`<button class="btn block" style="margin-top:10px">Roll Attack (d20 ≤ ${target})</button>`);
      
      // Bottom section: Damage Roll
      const dmgDiv = el(`<div style="margin-top:12px"></div>`);
      const rollDmgBtn = el(`<button class="btn secondary block" disabled style="opacity:0.4;cursor:not-allowed">Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})</button>`);
      rollDmgBtn.onclick = () => {
        const base = Dice.roll(weapon.damage);
        let tot = base; let p = `${weapon.damage} = <b>${base}</b>`;
        if (bonusDie) { const b = Dice.roll(bonusDie); tot += b; p += ` · ${attr} bonus ${bonusDie} = <b>${b}</b>`; }
        out.innerHTML += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"><p class="outcome ok" style="font-size:1.6rem;margin:0">${tot} damage</p><p class="stat-line" style="margin:4px 0 0 0">${p}</p></div>`;
        out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
      };
      dmgDiv.appendChild(rollDmgBtn);

      const doRoll = (isPush) => {
        if (isRanged && !isPush && (c.state.combatAmmo || 0) <= 0) {
          showToast("🏹 Out of Ammunition: You have 0 Arrows/Bolts remaining.", "error");
          return;
        }
        if (!isPush) {
          rollAtkBtn.disabled = true; rollAtkBtn.style.opacity = "0.4"; rollAtkBtn.style.cursor = "not-allowed";
        }
        if (combatantId && !isPush) {
          const comb = Combat.load();
          if (comb && comb.combatants) {
            const att = comb.combatants.find(cb => cb.id === combatantId);
            if (att && !att.acted) {
              att.acted = true;
              Combat.save(comb);
              const activeNav = document.querySelector("#app-nav button.active");
              if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
            }
          }
        }
        if (isRanged && !isPush) {
          c.state.combatAmmo--;
          const invItem = (c.inventory?.items || []).find(it => /quiver|arrow|bolt|stone|bullet/i.test(it.name));
          if (invItem) {
            invItem.name = invItem.name.replace(/\s*\(\d+\)$/, "") + ` (${c.state.combatAmmo})`;
          }
          Store.update(charId, ch => {
            ch.state.combatAmmo = c.state.combatAmmo;
            if (invItem && ch.inventory) ch.inventory.items = c.inventory.items;
          });
          const aLbl = atkDiv.querySelector("span[style*='Arrows']");
          if (aLbl) aLbl.textContent = `Arrows / Bolts: ${c.state.combatAmmo}`;
        }
        let effNet = net;
        if (c.state.conditions && c.state.conditions[attr]) effNet--;
        if (strShortfall()) effNet--;
        if (isRanged && equippedHelmet(c) && equippedHelmet(c).rangedBane) effNet--;
        const r = this.d20net(effNet);
        const crit = r.used === 1, fumble = r.used === 20;
        const success = r.used <= target;
        
        if ((crit || fumble) && !(c.skills?.[skillName]?.mark)) {
          Store.update(charId, (ch) => { if (ch.skills?.[skillName]) ch.skills[skillName].mark = true; });
        }

        let outcomeHtml = `<div style="margin-top:10px"><p class="outcome ${success ? "ok" : "bad"}" style="font-size:1.6rem;margin:0">${crit ? "🐉 Dragon Critical Hit!" : fumble ? "👿 Demon Fumble!" : success ? "Hit!" : "Miss!"} <small style="font-size:1rem;font-weight:normal">(${r.used} vs ${target})</small></p>`;
        if ((crit || fumble) && !(c.skills?.[skillName]?.mark)) outcomeHtml += `<p class="stat-line" style="color:var(--ok);margin:4px 0 0 0">★ Auto-marked ${esc(skillName)} for advancement</p>`;
        outcomeHtml += `</div>`;
        out.innerHTML = outcomeHtml;

        if (!crit && !fumble && !isPush) {
          const curChar = Store.get(charId) || c;
          const curConds = curChar?.state?.conditions || {};
          const unchosen = (DB.conditions||[]).filter(cn => !curConds[cn.key]);
          const hasSS = curChar?.abilities?.some(a => a.name === "Sole Survivor") && (curChar?.state?.wp || 0) >= 3;
          // Append real DOM nodes (not outerHTML) so the push handlers survive.
          const pushWrap = el(`<div style="margin-top:10px;padding:8px;background:var(--bg);border-radius:6px"></div>`);
          pushWrap.appendChild(el(`<p class="stat-line" style="margin:0 0 6px 0"><b>Push roll</b> (${unchosen.length ? "mark a condition" : "all six held → lose D6 WP/HP"} & re-roll):</p>`));
          const cw = el(`<div class="push-conditions" style="display:flex;flex-wrap:wrap;gap:4px"></div>`);
          unchosen.forEach(cn => {
            const chip = el(`<button class="skill-chip" style="font-size:0.9rem;padding:4px 8px">${esc(cn.name)}</button>`);
            chip.onclick = () => { Store.update(charId, ch => { ch.state.conditions[cn.key] = true; }); doRoll(true); };
            cw.appendChild(chip);
          });
          if (hasSS) {
            const chip = el(`<button class="skill-chip" style="font-size:0.9rem;padding:4px 8px;border-color:var(--accent)">💫 Sole Survivor (−3 WP)</button>`);
            chip.onclick = () => { Store.update(charId, ch => { ch.state.wp -= 3; }); doRoll(true); };
            cw.appendChild(chip);
          }
          if (!unchosen.length) {
            const chip = el(`<button class="skill-chip" style="font-size:0.9rem;padding:4px 8px;border-color:var(--bad)">⚠ Push (lose D6 WP/HP)</button>`);
            chip.onclick = () => { this.applyConditionOverflow(charId); doRoll(true); };
            cw.appendChild(chip);
          }
          pushWrap.appendChild(cw);
          out.appendChild(pushWrap);
        }
        if (!success && combatantId && !isPush) {
          Combat.advanceTurn(combatantId);
        }

        if (crit) {
          rollDmgBtn.disabled = false;
          rollDmgBtn.style.opacity = "1";
          rollDmgBtn.style.cursor = "pointer";
          rollDmgBtn.textContent = `Roll CRITICAL Damage (Double Dice: ${esc(weapon.damage)}×2${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn block";
          rollDmgBtn.style.background = "var(--ok)";
          rollDmgBtn.style.color = "#fff";
          rollDmgBtn.onclick = () => {
            const b1 = Dice.roll(weapon.damage);
            const b2 = Dice.roll(weapon.damage);
            let tot = b1 + b2; let p = `${weapon.damage} crit (${b1}+${b2}) = <b>${b1+b2}</b>`;
            if (bonusDie) { const b = Dice.roll(bonusDie); tot += b; p += ` · ${attr} bonus ${bonusDie} = <b>${b}</b>`; }
            out.innerHTML += `<div style="margin-top:12px;padding-top:12px;border-top:2px dashed var(--ok)"><p class="outcome ok" style="font-size:1.8rem;margin:0">💥 ${tot} CRITICAL DAMAGE!</p><p class="stat-line" style="margin:4px 0 0 0">${p}</p></div>`;
            out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
          };
        } else if (success) {
          rollDmgBtn.disabled = false;
          rollDmgBtn.style.opacity = "1";
          rollDmgBtn.style.cursor = "pointer";
          rollDmgBtn.textContent = `Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn secondary block";
          rollDmgBtn.style.background = "";
          rollDmgBtn.style.color = "";
        } else {
          rollDmgBtn.disabled = true;
          rollDmgBtn.style.opacity = "0.4";
          rollDmgBtn.style.cursor = "not-allowed";
          rollDmgBtn.textContent = `Roll Damage (${esc(weapon.damage)}${bonusDie ? " +" + bonusDie : ""})`;
          rollDmgBtn.className = "btn secondary block";
          rollDmgBtn.style.background = "";
          rollDmgBtn.style.color = "";
        }
      };

      rollAtkBtn.onclick = () => doRoll(false);
      atkDiv.appendChild(rollAtkBtn);

      m.body.append(atkDiv, dmgDiv, out);
    },

    // ---- Monster attack (auto-hit) ----
    monsterAttack(monsterName, atk, d6Roll, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) {
            att.acted = true;
            Combat.save(comb);
            const activeNav = document.querySelector("#app-nav button.active");
            if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
          }
        }
      }
      const title = d6Roll ? `${monsterName}: 🎲 Rolled ${d6Roll} → ${atk.name}` : `${monsterName}: ${atk.name}`;
      const m = modal(title);
      const out = el(`<div class="roll-result"></div>`);
      const bodyElems = [];
      if (d6Roll) {
        bodyElems.push(el(`<p class="stat-line" style="font-size:1.2rem;color:var(--ok);margin:0 0 8px 0"><b>🎲 Rolled ${d6Roll} on Monster Attack Table!</b></p>`));
      }
      bodyElems.push(el(`<p class="stat-line" style="margin:0"><b>Automatic hit!</b> · ${esc(atk.desc || "")}</p>`));
      if (atk.damage) {
        const base = Dice.roll(atk.damage);
        out.innerHTML = `<div style="margin-top:12px;padding:10px;background:var(--bg-raised);border-radius:8px;border:1px solid var(--line)"><p class="outcome ok" style="font-size:1.6rem;margin:0">💥 ${base} damage</p><p class="stat-line" style="margin:4px 0 0 0">${atk.damage} = <b>${base}</b></p></div>`;
        const ignoreArm = /ignores armor/i.test(atk.desc || "");
        out.appendChild(Roller.renderDamageApplier(combatantId, base, ignoreArm));
      }
      bodyElems.push(out);
      m.body.append(...bodyElems);
    },

    // ---- Rulebook NPC / Animal attack (d20 vs skill) ----
    npcAttack(npcName, w, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) {
            att.acted = true;
            Combat.save(comb);
            const activeNav = document.querySelector("#app-nav button.active");
            if (activeNav && activeNav.dataset.route === "party") Combat.rerender();
          }
        }
      }
      const m = modal(`${npcName}: ${w.name}`);
      const out = el(`<div class="roll-result"></div>`);
      const rollBtn = el(`<button class="btn block">Roll Attack (Target ≤ ${w.skill})</button>`);
      let dmgBtn = null;
      if (w.damage) {
        dmgBtn = el(`<button class="btn secondary block" disabled style="margin-top:8px;opacity:0.4;cursor:not-allowed">Roll Damage (${esc(w.damage)}${w.bonus ? " +" + esc(w.bonus) : ""})</button>`);
        dmgBtn.onclick = () => {
          const base = Dice.roll(w.damage);
          let tot = base;
          let p = `${w.damage} = <b>${base}</b>`;
          if (w.bonus) {
            const b = Dice.roll(w.bonus); tot += b; p += ` · bonus ${w.bonus} = <b>${b}</b>`;
          }
          out.innerHTML += `<p class="outcome ok" style="font-size:1.6rem;margin-top:12px">${tot} damage</p><p class="stat-line">${p}</p>`;
          out.appendChild(Roller.renderDamageApplier(combatantId, tot, false));
        };
      }
      rollBtn.onclick = () => {
        rollBtn.disabled = true; rollBtn.style.opacity = "0.4"; rollBtn.style.cursor = "not-allowed";
        const d = Dice.d(20);
        const ok = d <= w.skill;
        const crit = d === 1; const fumble = d === 20;
        out.innerHTML = `<p class="outcome ${ok ? "ok" : "bad"}" style="font-size:1.6rem;margin-top:12px">${crit ? "🐉 Dragon Critical Hit!" : fumble ? "👿 Demon Fumble!" : ok ? "Hit!" : "Miss!"} (rolled ${d} vs ${w.skill})</p>`;
        if (dmgBtn) {
          dmgBtn.disabled = !ok;
          dmgBtn.style.opacity = ok ? "1" : "0.4";
          dmgBtn.style.cursor = ok ? "pointer" : "not-allowed";
        }
        if (!ok && combatantId) Combat.advanceTurn(combatantId);
      };
      const bodyElems = [el(`<p class="stat-line">Skill level ${w.skill} · Damage ${esc(w.damage)}${w.bonus ? " +" + esc(w.bonus) : ""}</p>`), rollBtn];
      if (dmgBtn) bodyElems.push(dmgBtn);
      bodyElems.push(out);
      m.body.append(...bodyElems);
    },

    rollNpcAttackTable(npcName, combatantId) {
      if (combatantId) {
        const comb = Combat.load();
        if (comb && comb.combatants) {
          const att = comb.combatants.find(cb => cb.id === combatantId);
          if (att && !att.acted) { att.acted = true; Combat.save(comb); const activeNav = document.querySelector("#app-nav button.active"); if (activeNav && activeNav.dataset.route === "party") Combat.rerender(); }
        }
      }
      const nat = (typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.npcAttackTable) || null;
      if (!nat) return;
      const roles = nat.roles || ["Melee Attacker", "Ranged Attacker", "Sneaky Attacker", "Magic Attacker"];
      const m = modal(`${npcName}: NPC Attack Table`);
      const sel = el(`<select class="input" style="width:100%;margin-bottom:10px"></select>`);
      roles.forEach(r => sel.appendChild(el(`<option value="${r}">${r}</option>`)));
      const rollBtn = el(`<button class="btn block">🎲 Roll D6 AI Action</button>`);
      const out = el(`<div style="margin-top:12px"></div>`);
      rollBtn.onclick = () => {
        const role = sel.value;
        const roleMap = { "Melee Attacker": "melee", "Ranged Attacker": "ranged", "Sneaky Attacker": "sneaky", "Magic Attacker": "magic" };
        const prop = roleMap[role] || "melee";
        const r = Dice.d(6);
        const row = nat.rows.find(x => (x.d6 === "4" && r === 4) || (x.d6 === "5" && r === 5) || (x.d6 === "6" && r === 6) || (x.d6 === "1-3" && r <= 3)) || nat.rows[0];
        out.innerHTML = `<div style="padding:12px;background:var(--bg);border-radius:6px;border-left:4px solid var(--accent)">
          <p class="outcome ok" style="font-size:1.4rem;margin:0">Rolled ${r}: ${role}</p>
          <p class="stat-line" style="margin-top:6px;font-size:1.15rem">${row[prop] || "—"}</p>
        </div>`;
      };
      m.body.append(el(`<p class="stat-line">Select NPC role:</p>`), sel, rollBtn, out);
    },

    npcCast(npcName, spell, combatantId) {
      const comb = Combat.load();
      const cb = comb?.combatants?.find(c => c.id === combatantId) || { name: npcName, wp: 16, maxWp: 16 };
      let skillLvl = 14;
      if (npcName.toLowerCase().includes("boss") || npcName.toLowerCase().includes("archmage") || npcName.toLowerCase().includes("chieftain")) skillLvl = 15;
      
      spell = resolveCanonicalSpell(spell, "general") || { name: "Spell", rank: 1, text: "Magical spell." };
      const m = modal(`${npcName}: Cast ${spell.name}`);
      const sDetail = el(`<div class="spell-detail-card" style="margin-bottom:12px;padding:10px;background:var(--bg-raised);border-left:4px solid var(--accent)">
        <p style="margin:0;font-weight:bold">${esc(spell.name)} <span class="tag">${spell.rank ? `Rank ${spell.rank}` : "Trick"}</span></p>
        <p class="stat-line" style="margin:4px 0 0 0;font-size:0.95rem">${esc(spell.text || spell.desc || "Magical spell.")}</p>
      </div>`);

      const skillRow = el(`<div class="roll-ctl" style="margin-bottom:10px">
        <span class="stat-line">Magic Skill</span>
        <button class="step" id="sm">−</button>
        <span class="net-lbl" id="slvl">${skillLvl}</span>
        <button class="step" id="sp">+</button>
      </div>`);
      skillRow.querySelector("#sm").onclick = () => { skillLvl = Math.max(1, skillLvl - 1); skillRow.querySelector("#slvl").textContent = skillLvl; };
      skillRow.querySelector("#sp").onclick = () => { skillLvl = Math.min(20, skillLvl + 1); skillRow.querySelector("#slvl").textContent = skillLvl; };

      const out = el(`<div class="roll-result"></div>`);
      
      const d20Btn = el(`<button class="btn secondary block" style="margin-bottom:8px">🎲 Roll D20 Magic Check (vs PC Target)</button>`);
      d20Btn.onclick = () => {
        const r = Dice.d(20);
        const success = r <= skillLvl;
        if (cb.wp != null && cb.wp > 0) { cb.wp = Math.max(0, cb.wp - 2); Combat.save(comb); Combat.rerender(); }
        out.innerHTML = `<div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${success ? "var(--ok)" : "var(--bad)"}">
          <p class="outcome ${success ? "ok" : "bad"}" style="margin:0;font-size:1.3rem">Rolled ${r} vs Skill ${skillLvl} — ${success ? "SUCCESS!" : "FAILED!"}</p>
          ${cb.wp != null ? `<p class="stat-line" style="margin:4px 0 0 0">WP Remaining: ${cb.wp}/${cb.maxWp||cb.wp}</p>` : ""}
        </div>`;
        if (success) {
          const pl = spell.rank || 1;
          SpellAutomation.renderCard(combatantId, spell, pl, false, false, 2, out);
        }
      };

      const autoBtn = el(`<button class="btn block" style="background:var(--ok);color:#fff;border:none">✓ Auto-Succeed (Self / Ally Buff)</button>`);
      autoBtn.onclick = () => {
        if (cb.wp != null && cb.wp > 0) { cb.wp = Math.max(0, cb.wp - 2); Combat.save(comb); Combat.rerender(); }
        out.innerHTML = `<div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid var(--ok)">
          <p class="outcome ok" style="margin:0;font-size:1.3rem">Spell Cast Automatically!</p>
          ${cb.wp != null ? `<p class="stat-line" style="margin:4px 0 0 0">WP Remaining: ${cb.wp}/${cb.maxWp||cb.wp}</p>` : ""}
        </div>`;
        const pl = spell.rank || 1;
        SpellAutomation.renderCard(combatantId, spell, pl, false, false, 2, out);
      };

      m.body.append(sDetail, skillRow, d20Btn, autoBtn, out);
    },

    // ---- Spell / trick casting ----
    cast(charId, spell, isTrick) {
      let c = Store.get(charId); if (!c) return;
      // Synced/older characters can arrive without a normalized state (e.g. no
      // state.conditions), which would crash the ranked-spell path below and
      // leave an empty "no text" window. Normalize once (persisted) if needed.
      if (!c.state || !c.state.conditions || !c.state.deathRolls) { Store.update(charId, normalizeInventory); c = Store.get(charId) || c; }
      spell = resolveCanonicalSpell(spell, c.identity?.mageSchool);
      if (!spell) return;
      if (isTrick == null) isTrick = spell.rank === 0;
      let schoolEntry = Object.entries(c.skills || {}).find(([, v]) => v && v.kind === "magic");
      if (!schoolEntry && c.spells && c.spells.castSkill && c.skills && c.skills[c.spells.castSkill]) schoolEntry = [c.spells.castSkill, c.skills[c.spells.castSkill]];
      const level = schoolEntry ? schoolEntry[1].level : 0;
      const schoolName = schoolEntry ? schoolEntry[0] : "(no school)";
      const castAttr = schoolEntry ? schoolEntry[1].attribute : "INT";
      const m = modal(`Cast: ${spell.name}`);
      
      const sDetail = el(`<div class="spell-detail-card" style="margin-bottom:12px;padding:10px;background:var(--bg-raised);border-left:4px solid var(--gold)">
        <p style="margin:0;font-weight:bold">${esc(spell.name)} <span class="tag">${spell.rank ? `Rank ${spell.rank}` : "Trick"}</span></p>
        <p class="stat-line" style="margin:4px 0 0 0;font-size:0.95rem">${esc(spell.text || spell.desc || "Magical incantation.")}</p>
        ${spell.range ? `<p class="stat-line" style="margin:4px 0 0 0;font-size:0.85rem"><b>Range:</b> ${esc(spell.range)} · <b>Time:</b> ${esc(spell.time || "Action")}</p>` : ""}
      </div>`);

      const _am = equippedArmor(c), _hm = equippedHelmet(c);
      // An equipped weapon flagged metal in DB.weapons interferes with casting.
      const _metalWpn = (c.inventory?.items || []).some((x) => {
        if (!x.equipped) return false;
        const w = resolveEquippedWeapons([x.name])[0];
        return w && w.metal;
      });
      const hasMetal = (_am && _am.metal) || (_hm && _hm.metal) || _metalWpn;
      if (hasMetal) {
        sDetail.appendChild(el(`<div class="notice" style="border-color:var(--bad);background:rgba(200,0,0,0.1);color:var(--bad);margin-top:8px">⚠️ <b>Metal Restriction:</b> Wearing metal armor or holding metal weapons penalizes or blocks spellcasting.</div>`));
      }
      if (spell.school === "necromancy" && ((spell.name || "").match(/animate|skeleton|ghost|corpse/i) || (spell.text || "").match(/corpse|body|skeleton/i))) {
        const hasCorpse = (c.inventory?.items || []).some(x => (x.name || "").match(/corpse|body|skeleton|bone/i));
        if (!hasCorpse) {
          sDetail.appendChild(el(`<div class="notice" style="border-color:var(--bad);background:rgba(200,0,0,0.1);color:var(--bad);margin-top:8px">⚠️ <b>Ingredient Warning:</b> No Corpse/Bones found in inventory. You may cast anyway assuming ambient battlefield corpses.</div>`));
        }
      }

      const isHeal = spell.name?.toLowerCase().match(/heal|cure|treat|resurrect/);
      if (c.state.wp <= 1) {
        if (isHeal) {
          sDetail.appendChild(el(`<div style="margin-top:8px;padding:6px;background:rgba(200,0,0,0.1);border-radius:4px;color:var(--bad);font-size:0.85rem">⚠️ Desperate? Power from the Body cannot be used for healing spells.</div>`));
        } else {
          const pWrap = el(`<div style="margin-top:8px;padding:8px;background:var(--bg);border:1px dashed var(--bad);border-radius:6px">
            <div style="color:var(--bad);font-weight:bold;font-size:0.9rem;margin-bottom:6px">🩸 Power from the Body (Convert HP to WP)</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap"></div>
          </div>`);
          const btnsWrap = pWrap.querySelector("div:nth-child(2)");
          [4, 6, 8, 10, 12, 20].forEach(d => {
            const db = el(`<button class="skill-chip quick-chip" style="flex:1;border-color:var(--bad);color:var(--bad)">D${d}</button>`);
            db.onclick = () => {
              const roll = Dice.d(d);
              Store.update(charId, ch => {
                ch.state.hp = Math.max(0, ch.state.hp - roll);
                ch.state.wp = Math.min(ch.derived.wpMax || 99, ch.state.wp + roll);
              });
              showToast(`🩸 Power from the Body (Rolled D${d})!\nTook ${roll} damage.\nGained ${roll} Willpower Points!`, "error");
              m.close();
              Roller.cast(charId, spell, isTrick);
            };
            btnsWrap.appendChild(db);
          });
          sDetail.appendChild(pWrap);
        }
      }

      if (isTrick) {
        const out = el(`<div class="roll-result"></div>`);
        const btn = el(`<button class="btn block">Cast (1 WP, auto-success)</button>`);
        btn.onclick = () => {
          if (c.state.wp < 1) { out.innerHTML = `<p class="outcome bad">Not enough WP.</p>`; return; }
          Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - 1); }); this.refresh(charId);
          out.innerHTML = `<p class="outcome ok">Cast! −1 WP.</p>`;
          SpellAutomation.renderCard(charId, spell, 1, true, false, 1, out);
        };
        m.body.append(sDetail, el(`<p class="stat-line">Magic tricks succeed automatically and cost 1 WP.</p>`), btn, out);
        return;
      }
      const isDraco = spell.school === "dracomancy";
      const perLevel = isDraco ? 6 : 2;
      let pl = 1;
      const condCn = (DB.conditions || []).find((cn) => cn.attribute === castAttr && c.state.conditions[cn.key]);
      const condBane = !!condCn;
      const head = el(`<p class="stat-line">Roll <b>${esc(schoolName)}</b> (level ${level})${condBane ? ` · <span style="color:var(--bad)">${esc(condCn.name)} → bane</span>` : ""}. ${perLevel} WP per power level.</p>`);
      const plRow = el(`<div class="roll-ctl"></div>`);
      const plLbl = el(`<span class="net-lbl">Power level ${pl} · ${pl * perLevel} WP</span>`);
      const pm = el(`<button class="step">−</button>`), pp = el(`<button class="step">+</button>`);
      pm.onclick = () => { pl = Math.max(1, pl - 1); plLbl.textContent = `Power level ${pl} · ${pl * perLevel} WP`; };
      pp.onclick = () => { pl = Math.min(3, pl + 1); plLbl.textContent = `Power level ${pl} · ${pl * perLevel} WP`; };
      plRow.append(el(`<span class="stat-line">Power</span>`), pm, plLbl, pp);
      
      const isReaction = spell.time?.toLowerCase().includes("reaction") || spell.castingTime?.toLowerCase().includes("reaction");
      const grimWrap = el(`<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:0.95rem;cursor:pointer">
        <input type="checkbox" id="cast-unprepared" ${spell.prepared === false ? "checked" : ""}>
        <span>📖 Cast Unprepared from Grimoire (Doubles time)</span>
      </label>`);

      const castBtn = el(`<button class="btn block" style="margin-top:12px">Cast</button>`);
      const out = el(`<div class="roll-result"></div>`);
      const doCast = (pushedCondition) => {
        if (!pushedCondition) {
          castBtn.disabled = true; castBtn.style.opacity = "0.4"; castBtn.style.cursor = "not-allowed";
          pm.disabled = true; pp.disabled = true;
        }
        const isUnprepared = grimWrap.querySelector("#cast-unprepared")?.checked;
        if (isUnprepared && isReaction) {
          out.innerHTML = `<p class="outcome bad">❌ Reaction spells cannot be cast unprepared from a grimoire.</p>`;
          return;
        }

        const cost = pl * perLevel;
        const cur = Store.get(charId);
        if (cur.state.wp < cost && !pushedCondition) { out.innerHTML = `<p class="outcome bad">Not enough WP (need ${cost}, have ${cur.state.wp}).</p>`; return; }
        if (!pushedCondition) Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - cost); });
        const net = (condBane ? -1 : 0);
        const r = this.d20net(net);
        const dragon = r.used === 1, demon = r.used === 20, success = r.used <= level;
        if (dragon || demon) Store.update(charId, (ch) => { if (schoolEntry) ch.skills[schoolEntry[0]].mark = true; });
        let html = `<div class="dice-faces">${r.dice.map((d) => `<span class="die ${d === r.used ? "used" : ""}">${d}</span>`).join("")}</div>`;
        html += `<p class="outcome ${success ? "ok" : "bad"}">${dragon ? "🐉 DRAGON — cast! choose: double damage/range, no WP cost, or cast another (bane)" : demon ? "👹 DEMON — magical mishap!" : success ? `Success — power level ${pl}` : "Failed — WP still spent"}</p>`;
        if (!pushedCondition) html += `<p class="stat-line">−${cost} WP.</p>`;
        if (isUnprepared && success) html += `<p class="stat-line" style="color:var(--bad)">⏳ Unprepared: Casting time doubled (takes 2 rounds/stretches).</p>`;
        if (demon) {
          const roll = Dice.d(20); const text = MISHAPS[roll - 1];
          html += `<p class="notice" style="border-color:var(--bad)"><b>Mishap (D20=${roll}):</b> ${esc(text)}</p>`;
          if (roll <= 6) Store.update(charId, (ch) => { ch.state.conditions[CONDITION_BY_MISHAP[roll - 1]] = true; });
          else if (roll === 7) { const dmg = Dice.roll(pl + "D6"); Store.update(charId, (ch) => { ch.state.hp = Math.max(0, ch.state.hp - dmg); }); html += `<p class="stat-line">Took ${dmg} damage.</p>`; }
          else if (roll === 8) { const wl = Dice.roll(pl + "D6"); Store.update(charId, (ch) => { ch.state.wp = Math.max(0, ch.state.wp - wl); }); html += `<p class="stat-line">Lost a further ${wl} WP.</p>`; }
          if (spell.school === "demonology") {
            Store.update(charId, ch => { ch.state.corruption = (ch.state.corruption || 0) + 1; });
            showToast("🧿 Demonology Mishap! Gained 1 Corruption point. You must roll for Insanity.", "error");
          }
        }
        if (pushedCondition) html += `<p class="stat-line">Pushed — <b>${esc(pushedCondition)}</b>.</p>`;
        out.innerHTML = html;
        if (success) {
          if (isUnprepared && document.querySelector(".combat-tracker")) {
            showToast("⏳ Unprepared spell cast in combat: Casting takes 2 rounds! Effect delayed until next turn.");
          } else {
            SpellAutomation.renderCard(charId, spell, pl, false, dragon, cost, out);
          }
        }
        const cur2 = Store.get(charId) || c;
        const curConds2 = cur2?.state?.conditions || {};
        const remaining = (DB.conditions || []).filter((cn) => !curConds2[cn.key]);
        const hasSS2 = cur2?.abilities?.some(a => a.name === "Sole Survivor") && (cur2?.state?.wp || 0) >= 3;
        if (!success && !demon && !pushedCondition) {
          const pushWrap = el(`<div class="push-wrap"><p class="stat-line">${remaining.length ? "Push? Choose a condition, then re-roll (WP already spent):" : "All six conditions held — pushing costs D6 WP/HP. Push and re-roll (WP already spent):"}</p></div>`);
          const cw = el(`<div class="chip-wrap"></div>`);
          remaining.forEach((cn) => { const chip = el(`<button class="skill-chip">${esc(cn.name)}</button>`); chip.onclick = () => { Store.update(charId, (ch) => { ch.state.conditions[cn.key] = true; }); doCast("gained " + cn.name); }; cw.appendChild(chip); });
          if (hasSS2) {
            const chip = el(`<button class="skill-chip" style="border-color:var(--accent)">💫 Sole Survivor (−3 WP)</button>`);
            chip.onclick = () => { Store.update(charId, (ch) => { ch.state.wp -= 3; }); doCast("Sole Survivor (−3 WP)"); };
            cw.appendChild(chip);
          }
          if (!remaining.length) {
            const chip = el(`<button class="skill-chip" style="border-color:var(--bad)">⚠ Push (lose D6 WP/HP)</button>`);
            chip.onclick = () => { const label = this.applyConditionOverflow(charId); doCast(label); };
            cw.appendChild(chip);
          }
          pushWrap.appendChild(cw); out.appendChild(pushWrap);
        }
        this.refresh(charId);
      };
      castBtn.onclick = () => doCast(null);
      m.body.append(sDetail, head, plRow, grimWrap, castBtn, out);
    }
  };

  /* =================================================================
   * Character sheet — live, persistent tracker (Phase 2)
   * ================================================================= */
