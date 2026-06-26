/* spell-automation.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, Dice, el, esc, uid } from './core.js';
import { confirmModal, modal, showToast } from './ui.js';
import { effHpMax, effWpMax, equippedArmor } from './derived.js';
import { Magic } from './settings.js';
import { Store } from './store.js';
import { Roller } from './roller.js';
import { Combat } from './combat.js';
import { init } from './main.js';

export const SUMMON_STATS = {
    "rat": { hp: 3, armor: 0, movement: 10, attack: "Bite (skill 8, D2 dmg)" },
    "cat": { hp: 4, armor: 0, movement: 12, attack: "Claw (skill 8, D3 dmg)" },
    "dog": { hp: 8, armor: 0, movement: 14, attack: "Bite (skill 12, D8 dmg)" },
    "fox": { hp: 6, armor: 0, movement: 10, attack: "Bite (skill 12, D6 dmg)" },
    "snake": { hp: 3, armor: 0, movement: 8, attack: "Bite (skill 12, D3 dmg + poison)" },
    "raven": { hp: 4, armor: 0, movement: 18, attack: "Beak (skill 10, D4 dmg)" },
    "skeleton": { hp: 10, armor: 2, movement: 10, attack: "Rusty Sword (skill 10, D6 dmg)" },
    "ghost": { hp: 12, armor: 99, movement: 16, attack: "Death Chill (skill 12, D6 WIL drain)" },
    "undine": { hp: 14, armor: 4, movement: 12, attack: "Water Whip (skill 12, 2D6 dmg)" },
    "gnome": { hp: 18, armor: 6, movement: 8, attack: "Stone Fist (skill 10, 2D8 dmg)" },
    "sylph": { hp: 12, armor: 0, movement: 20, attack: "Wind Blade (skill 14, D8 dmg)" },
    "salamander": { hp: 16, armor: 4, movement: 12, attack: "Fire Spit (skill 12, 2D6 fire dmg)" },
    "carbuncle": { hp: 6, armor: 0, movement: 10, attack: "Acid Bite (skill 10, D4 acid dmg)" },
    "familiar": { hp: 6, armor: 0, movement: 12, attack: "Magic Bolt (skill 10, D4 dmg)" }
  };


export const SpellAutomation = {
    categorize(spell) {
      if (!spell || !spell.name) return "utility";
      const n = spell.name.toLowerCase();
      if (n.match(/cure|treat wound|recovery|healing radiance|restoration|rejuvenation|heal/)) return "heal";
      if (n.match(/firestorm|frost gale|shockwave|meteor swarm|rock tornado|hailstorm|scalding shower|demonic gust|chaos swamp|thorn field|mass purge|lightning flash|chaos mire|beetle swarm|swarm/)) return "damage_aoe";
      if (n.match(/fireball|lightning bolt|fire blast|thunderbolt|mental strike|boneshaker|death touch|abyssal stench|beetle boil|blood strike|gust of wind|water jet|acid splash|flame wall|flick|ignite|immolate|drain|gutworm|demonic exile|magic bolt/)) return "damage_single";
      if (n.match(/familiar|skeleton|undine|gnome|sylph|salamander|carbuncle|animate dead|conjure|summon|demon|champion|guardian/)) return "summon";
      if (n.match(/rune of/)) return "rune";
      if (n.match(/curse|evil eye|plague|puppet/)) return "curse";
      if (n.match(/phantom|disguise|illusion|mirror image/)) return "illusion";
      if (n.match(/haste|speed/)) return "haste";
      if (n.match(/slow|daze|exhaust|paralyze|terror|command|dominate|sleep|ensnaring roots|banish|demon face|bloodlust|rage/)) return "slow";
      return "utility";
    },
    getRangeLimit(spell) {
      if (!spell || !spell.range) return 999;
      const r = spell.range.toLowerCase();
      if (r.includes("touch")) return 2;
      const m = r.match(/(\d+)\s*m/);
      if (m) return Number(m[1]);
      if (r.includes("personal") || r.includes("self")) return 0;
      return 999;
    },
    renderCard(charId, spell, pl, isTrick, dragon, cost, out) {
      const char = Store.get(charId) || {};
      const cat = this.categorize(spell);
      const card = el(`<div class="magic-auto-card" style="margin-top:12px;padding:12px;border:1px solid var(--accent);border-radius:8px;background:rgba(255,255,255,0.03)"></div>`);
      const hdr = el(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"></div>`);
      hdr.innerHTML = `<b style="color:var(--accent)">✨ VTT Spell Resolution: ${esc(spell.name)} (PL ${pl})</b>`;
      const skipBtn = el(`<button class="skill-chip quick-chip" title="Skip automatic resolution">Skip Auto</button>`);
      skipBtn.onclick = () => { card.innerHTML = `<p class="stat-line">Automation skipped. Resolve effects manually.</p>`; };
      hdr.appendChild(skipBtn);
      card.appendChild(hdr);

      let plMult = 1;
      if (dragon) {
        const dWrap = el(`<div style="margin-bottom:10px;padding:8px;background:rgba(255,215,0,0.1);border:1px dashed #ffd700;border-radius:6px"></div>`);
        dWrap.innerHTML = `<b style="color:#ffd700;display:block;margin-bottom:6px">🐉 Critical Dragon Boon! Choose one:</b>`;
        const bRow = el(`<div style="display:flex;gap:6px;flex-wrap:wrap"></div>`);
        const bDbl = el(`<button class="skill-chip quick-chip" style="border-color:#ffd700" title="Double Damage or Healing dice">💥 Double</button>`);
        bDbl.onclick = () => { plMult = 2; bDbl.style.background = "#ffd700"; bDbl.style.color = "#000"; showToast("Double Effect active! Damage/Healing dice will be multiplied by 2."); };
        const bRef = el(`<button class="skill-chip quick-chip" style="border-color:#ffd700" title="Refund ${cost} WP">✨ Refund</button>`);
        bRef.onclick = () => { Store.update(charId, ch => { ch.state.wp = Math.min(effWpMax(ch), (ch.state.wp || 0) + cost); }); Roller.refresh(charId); bRef.disabled = true; showToast(`Refunded ${cost} WP!`, "success"); };
        const bFree = el(`<button class="skill-chip quick-chip" style="border-color:#ffd700" title="Cast another spell without spending an action">⚡ Free Cast</button>`);
        bFree.onclick = () => { showToast("Free Follow-Up Spell unlocked! You may immediately cast another spell without spending an action."); };
        bRow.append(bDbl, bRef, bFree);
        dWrap.appendChild(bRow);
        card.appendChild(dWrap);
      }

      // Always show the spell's effect text on the resolution card, so every
      // spell type (not just utility) opens with its description.
      if (spell.text || spell.desc) {
        card.appendChild(el(`<p class="stat-line" style="margin:0 0 8px 0">${esc(spell.text || spell.desc)}</p>`));
      }

      // ---- Unified target lists: combat tracker + party roster + self ----
      const cd = Combat.load() || { combatants: [] };
      const combs = (cd.combatants || []).filter(Boolean);
      const isHeroCb = (x) => x.kind === "hero" || x.type === "hero";
      const casterCb = combs.find(x => x.id === charId || x.charId === charId);
      const isNpcCaster = !Store.get(charId) && !!casterCb;

      const fromCb = (x) => ({ key: x.id, name: x.name, label: `${x.name}${x.hp != null ? ` (HP ${x.hp})` : ""}`, isChar: false, cb: x, armor: Number(x.armor) || 0 });
      const fromChar = (ch) => ({ key: "char:" + ch.id, name: ch.identity && ch.identity.name || ch.name || "Hero", label: `${(ch.identity && ch.identity.name) || "Hero"} (HP ${ch.state && ch.state.hp}/${effHpMax(ch)})`, isChar: true, charId: ch.id, armor: (equippedArmor(ch) ? equippedArmor(ch).rating : 0) });

      const combHeroes = combs.filter(isHeroCb);
      const combFoes = combs.filter(x => !isHeroCb(x));
      const inCombatCharIds = new Set(combs.map(x => x.charId).filter(Boolean));
      const rosterAllies = Store.list().filter(ch => ch && ch.id && !inCombatCharIds.has(ch.id));

      let allies, enemies;
      if (isNpcCaster) { allies = combFoes.map(fromCb); enemies = combHeroes.map(fromCb); }
      else {
        allies = [...combHeroes.map(fromCb), ...rosterAllies.map(fromChar)];
        enemies = combFoes.map(fromCb);
        const me = Store.get(charId);
        if (me && !allies.some(a => a.charId === charId)) allies.unshift(fromChar(me));
      }
      const hasteList = (isNpcCaster ? combFoes : combHeroes).map(fromCb);

      const findT = (list, key) => list.find(t => t.key === key);
      const buildSelect = (list, emptyLabel) => {
        const s = el(`<select class="input" style="min-width:150px"></select>`);
        list.forEach(t => s.appendChild(el(`<option value="${esc(t.key)}">${esc(t.label)}</option>`)));
        if (!list.length && emptyLabel) s.appendChild(el(`<option value="">${esc(emptyLabel)}</option>`));
        return s;
      };
      const applyHp = (t, delta) => {
        if (!t) return;
        if (t.isChar) {
          Store.update(t.charId, ch => { const mx = effHpMax(ch); ch.state.hp = Math.max(0, Math.min(mx, (ch.state.hp || 0) + delta)); if (delta > 0 && ch.state.hp > 0) { ch.state.dying = false; ch.state.deathRolls = { successes: 0, failures: 0 }; } });
          const syncCb = combs.find(x => x.charId === t.charId); if (syncCb) syncCb.hp = Store.get(t.charId).state.hp;
          Roller.refresh(t.charId);
        } else {
          t.cb.hp = Math.max(0, Math.min(t.cb.maxHp || 9999, (t.cb.hp || 0) + delta));
          if (t.cb.hp === 0) t.cb.defeated = true;
          if (t.cb.charId && Store.get(t.cb.charId)) { Store.update(t.cb.charId, ch => { ch.state.hp = t.cb.hp; }); Roller.refresh(t.cb.charId); }
        }
        Combat.save(cd); Combat.rerender();
      };

      if (cat === "heal") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"></div>`);
        row.append(el(`<span class="stat-line">Heal:</span>`));
        const tSel = buildSelect(allies, "— no targets —");
        const dIn = el(`<input type="text" class="input" style="width:70px" value="${pl}D6" title="healing dice">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--ok);color:#000;border:none" title="Apply Healing">💚 Heal</button>`);
        btn.onclick = () => {
          let amt = Dice.roll(dIn.value.trim() || `${pl}D6`); if (plMult === 2) amt *= 2;
          const t = findT(allies, tSel.value);
          if (t) applyHp(t, +amt);
          card.innerHTML = `<p class="outcome ok">💚 Healed <b>${amt} HP</b>${t ? ` → ${esc(t.name)}` : " (apply manually)"}.</p>`;
        };
        row.append(tSel, dIn, btn); card.appendChild(row);
      } else if (cat === "damage_single") {
        const wrap = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
        const rTop = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>`);
        rTop.append(el(`<span class="stat-line">Enemy:</span>`));
        const tSel = buildSelect(enemies, "— none in combat —");
        const cstIn = el(`<input type="text" class="input" style="width:110px" placeholder="or custom target">`);
        rTop.append(tSel, cstIn);
        const rMid = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>`);
        rMid.append(el(`<span class="stat-line">Dist:</span>`));
        const distIn = el(`<input type="number" class="input" style="width:56px" value="5" min="0">`);
        rMid.append(distIn, el(`<span class="stat-line">m (max ${this.getRangeLimit(spell)}m)</span>`));
        const isPsychic = /mental|death|stench|psychic|soul|boneshaker/i.test(spell.name || "");
        const armLbl = el(`<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" ${isPsychic ? "" : "checked"}> Armor mitigates</label>`);
        const fIn = el(`<input type="text" class="input" style="width:70px" value="${pl}D6">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--bad);color:#fff;border:none" title="Strike target">💥 Strike</button>`);
        btn.onclick = async () => {
          const dist = Number(distIn.value) || 0, maxR = this.getRangeLimit(spell);
          if (dist > maxR && !(await confirmModal(`Distance (${dist}m) exceeds range (${maxR}m). Strike anyway?`, { title: "Out of range", okText: "Strike anyway" }))) return;
          let dmg = Dice.roll(fIn.value.trim() || `${pl}D6`); if (plMult === 2) dmg *= 2;
          const t = findT(enemies, tSel.value);
          const arm = (armLbl.querySelector("input").checked && t) ? t.armor : 0;
          const net = Math.max(0, dmg - arm);
          if (t) applyHp(t, -net);
          const who = cstIn.value.trim() || (t ? t.name : "your target");
          card.innerHTML = `<p class="outcome bad">💥 <b>${net} damage</b> (${dmg} roll${arm ? ` − ${arm} armor` : ""}) → ${esc(who)}.${t ? "" : " <span class='stat-line'>Apply manually.</span>"}</p>`;
        };
        const rBot = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>`);
        rBot.append(fIn, armLbl, btn);
        wrap.append(rTop, rMid, rBot); card.appendChild(wrap);
      } else if (cat === "damage_aoe") {
        const wrap = el(`<div style="display:flex;flex-direction:column;gap:8px"></div>`);
        wrap.append(el(`<span class="stat-line">AoE blast targets:</span>`));
        const chkWrap = el(`<div style="max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:6px;background:rgba(0,0,0,0.2);border-radius:4px"></div>`);
        enemies.forEach(t => { chkWrap.appendChild(el(`<label style="font-size:12px;display:flex;gap:6px"><input type="checkbox" value="${esc(t.key)}" checked> ${esc(t.label)}</label>`)); });
        if (!enemies.length) chkWrap.appendChild(el(`<span class="stat-line">No enemies in combat — roll &amp; apply manually.</span>`));
        const armLbl = el(`<label style="display:flex;align-items:center;gap:4px;font-size:12px"><input type="checkbox" checked> Armor mitigates</label>`);
        const fIn = el(`<input type="text" class="input" style="width:70px" value="${pl}D6">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--bad);color:#fff;border:none" title="Blast all checked targets">💥 Blast AoE</button>`);
        btn.onclick = () => {
          let dmg = Dice.roll(fIn.value.trim() || `${pl}D6`); if (plMult === 2) dmg *= 2;
          const ids = Array.from(chkWrap.querySelectorAll("input:checked")).map(x => x.value);
          const names = [];
          ids.forEach(id => { const t = findT(enemies, id); if (t) { const arm = armLbl.querySelector("input").checked ? t.armor : 0; const net = Math.max(0, dmg - arm); applyHp(t, -net); names.push(`${t.name} (−${net})`); } });
          card.innerHTML = `<p class="outcome bad">💥 Blast <b>${dmg} raw</b> → ${names.join(", ") || "roll & apply manually"}.</p>`;
        };
        wrap.append(chkWrap, armLbl, fIn, btn); card.appendChild(wrap);
      } else if (cat === "summon") {
        const sKey = Object.keys(SUMMON_STATS).find(k => (spell.name || "").toLowerCase().includes(k)) || "familiar";
        const st = SUMMON_STATS[sKey];
        const row = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
        row.innerHTML = `<p class="notice" style="font-size:12px"><b>Summon (${sKey.toUpperCase()}):</b> HP ${st.hp}, Armor ${st.armor}, Move ${st.movement}m · ${st.attack}</p>`;
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent)" title="Add companion to sheet and combat tracker">+ Spawn</button>`);
        btn.onclick = () => {
          const sName = `${spell.name} (${(char.identity && char.identity.name) || char.name || "Caster"})`;
          Store.update(charId, ch => { ch.companions = ch.companions || []; ch.companions.push({ id: uid(), name: sName, hp: st.hp, hpMax: st.hp, notes: `Armor ${st.armor}. ${st.attack}` }); });
          cd.combatants = cd.combatants || [];
          cd.combatants.push({ id: uid(), name: sName, kind: "npc", init: null, done: false, acted: false, hp: st.hp, maxHp: st.hp, armor: st.armor, notes: st.attack, isCompanion: true });
          Combat.save(cd); Roller.refresh(charId); Combat.rerender();
          card.innerHTML = `<p class="outcome ok">✨ Spawned <b>${esc(sName)}</b> to companions + combat tracker.</p>`;
        };
        row.appendChild(btn); card.appendChild(row);
      } else if (cat === "rune") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center"></div>`);
        row.append(el(`<span class="stat-line">Inscribe dormant rune:</span>`));
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent)" title="Inscribe dormant rune">+ Rune</button>`);
        btn.onclick = () => {
          Store.update(charId, ch => { ch.effects = ch.effects || []; ch.effects.push({ id: uid(), name: `Dormant Rune (${spell.name})`, isRune: true, pl, notes: spell.text }); });
          Roller.refresh(charId);
          card.innerHTML = `<p class="outcome ok">⚡ Inscribed dormant rune on sheet.</p>`;
        };
        row.appendChild(btn); card.appendChild(row);
      } else if (cat === "curse") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center"></div>`);
        row.append(el(`<span class="stat-line">Curse target:</span>`));
        const tSel = buildSelect(enemies, "— none in combat —");
        const btn = el(`<button class="skill-chip quick-chip" style="background:#9370db;color:#fff;border:none" title="Hex target">🧿 Hex</button>`);
        btn.onclick = () => {
          const t = findT(enemies, tSel.value);
          if (t && !t.isChar) { t.cb.name = `🧿 ${t.cb.name.replace(/🧿\s*/, "")}`; t.cb.notes = `${t.cb.notes ? t.cb.notes + " · " : ""}CURSED (${spell.name} PL${pl})`; Combat.save(cd); Combat.rerender(); }
          card.innerHTML = `<p class="outcome" style="color:#9370db;border-color:#9370db">🧿 Cursed ${t ? esc(t.name) : "target (apply manually)"}.</p>`;
        };
        row.append(tSel, btn); card.appendChild(row);
      } else if (cat === "illusion") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center"></div>`);
        row.append(el(`<span class="stat-line">Active illusion (DC ${10 + pl}):</span>`));
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent)" title="Create active illusion">+ Illusion</button>`);
        btn.onclick = () => {
          Store.update(charId, ch => { ch.effects = ch.effects || []; ch.effects.push({ id: uid(), name: `Illusion: ${spell.name} (DC ${10 + pl})`, isIllusion: true, pl }); });
          Roller.refresh(charId);
          card.innerHTML = `<p class="outcome ok">👁️ Illusion active on sheet.</p>`;
        };
        row.appendChild(btn); card.appendChild(row);
      } else if (cat === "haste") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>`);
        row.append(el(`<span class="stat-line">Haste (2nd turn):</span>`));
        const tSel = buildSelect(hasteList, "— add ally to tracker —");
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:#00bcd4;color:#00bcd4" title="Grant second initiative turn">⚡ Grant Turn</button>`);
        btn.onclick = () => {
          const t = findT(hasteList, tSel.value);
          if (t && !t.isChar) { cd.combatants.push({ ...t.cb, id: uid(), name: `${t.cb.name} (Hasted 2nd Turn)`, init: null, done: false, acted: false }); Combat.save(cd); Combat.rerender(); card.innerHTML = `<p class="outcome" style="color:#00bcd4;border-color:#00bcd4">⚡ Granted a second combat turn.</p>`; }
          else card.innerHTML = `<p class="stat-line">Haste grants an extra turn in combat — add the ally to the tracker first.</p>`;
        };
        row.append(tSel, btn); card.appendChild(row);
      } else if (cat === "slow") {
        const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"></div>`);
        row.append(el(`<span class="stat-line">Slow/debuff enemy:</span>`));
        const tSel = buildSelect(enemies, "— none in combat —");
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--bad);color:var(--bad)" title="Roll resistance save and apply debuff">⏳ Auto Debuff</button>`);
        btn.onclick = () => {
          const t = findT(enemies, tSel.value);
          const saveRoll = Dice.d(20), saveDC = 12 - pl;
          if (saveRoll <= saveDC) { card.innerHTML = `<p class="outcome ok">🛡️ Resisted! (${saveRoll} vs DC ${saveDC})</p>`; return; }
          if (t && !t.isChar) { t.cb.notes = `${t.cb.notes ? t.cb.notes + " · " : ""}${(spell.name || "").toUpperCase()} (Slowed/Dazed)`; if (/slow/i.test(spell.name || "")) t.cb.init = 10; Combat.save(cd); Combat.rerender(); }
          card.innerHTML = `<p class="outcome bad">⏳ Failed save (${saveRoll} vs DC ${saveDC}) — debuffed${t ? "" : " (apply manually)"}.</p>`;
        };
        row.append(tSel, btn); card.appendChild(row);
      } else {
        // Utility / buff — show the effect text and offer to track it on the sheet.
        const isConc = (spell.duration || "").toLowerCase().includes("concentration");
        const wrap = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
        const row = el(`<div style="display:flex;gap:8px;align-items:center"></div>`);
        row.append(el(`<span class="stat-line">Utility / Buff (${esc(spell.duration || "Instant")}):</span>`));
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent);color:var(--accent)" title="Track this effect on the character sheet">+ Track effect</button>`);
        btn.onclick = () => {
          Store.update(charId, ch => {
            ch.effects = ch.effects || [];
            if (isConc) {
              const old = ch.effects.filter(x => x.concentration || (x.duration || "").toLowerCase().includes("concentration"));
              if (old.length) showToast(`Ending older Concentration spell: ${old[0].name}`);
              ch.effects = ch.effects.filter(x => !x.concentration && !(x.duration || "").toLowerCase().includes("concentration"));
            }
            ch.effects.push({ id: uid(), name: `${spell.name} (PL${pl})`, duration: spell.duration || "Shift", concentration: isConc, notes: spell.text });
          });
          Roller.refresh(charId);
          card.innerHTML = `<p class="outcome ok">✨ Tracked “${esc(spell.name)}” on the character sheet.</p>`;
        };
        row.appendChild(btn); wrap.appendChild(row); card.appendChild(wrap);
      }

      out.appendChild(card);
    },
    usePotion(charId, item, itemIdx) {
      const pl = 1;
      const fakeSpell = { name: item.name.replace(/\s*\(dose\)/i,""), range: "Touch", text: "Alchemical brew" };
      const m = modal(`🧪 Alchemical Brew: ${item.name}`);
      const pw = el(`<div id="pot_wrap"></div>`);
      m.body.appendChild(pw);
      this.renderCard(charId, fakeSpell, pl, false, false, 0, pw);
      Store.update(charId, ch => {
        if (ch.inventory?.items?.[itemIdx]) {
          ch.inventory.items.splice(itemIdx, 1);
        }
      });
      Roller.refresh(charId);
    }
  };

