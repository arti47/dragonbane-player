/* spell-automation.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, DB, Dice, MAGICX, el, esc, uid } from './core.js';
import { normName } from './rules.js';
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
    // Damage/heal dice from the spell's own text at a power level: the first
    // "NdX" is the PL1 base; "each power level (beyond the first) adds D6 / one
    // die / an additional D6" adds one die per level above 1. Fallback: PL·D6.
    spellDice(spell, pl) {
      const text = String((spell && (spell.text || spell.desc || spell.effect)) || "");
      const base = /(\d+)D(\d+)/i.exec(text);
      if (!base) return `${pl}D6`;
      const n = Number(base[1]), sides = Number(base[2]);
      const extra = Math.max(0, (Number(pl) || 1) - 1);
      if (!extra || !/each power level|per power level/i.test(text)) return `${n}D${sides}`;
      const add = /power level[^.]*?(?:adds?|additional|another)\s+(?:an?\s+|one\s+)?(\d*)D(\d+)/i.exec(text);
      const addSides = add ? Number(add[2]) : sides;
      const addN = add && add[1] ? Number(add[1]) : 1;
      return addSides === sides ? `${n + addN * extra}D${sides}` : `${n}D${sides}+${addN * extra}D${addSides}`;
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
      const card = el(`<div class="magic-auto-card" style="margin-top:12px;padding:12px;border:1px solid var(--accent);border-radius:var(--r-md);background:var(--tint-soft)"></div>`);
      const hdr = el(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"></div>`);
      hdr.innerHTML = `<b style="color:var(--accent-ink)">✨ VTT Spell Resolution: ${esc(spell.name)} (PL ${pl})</b>`;
      const skipBtn = el(`<button class="skill-chip quick-chip" title="Skip automatic resolution">Skip Auto</button>`);
      skipBtn.onclick = () => { card.innerHTML = `<p class="stat-line">Automation skipped. Resolve effects manually.</p>`; };
      hdr.appendChild(skipBtn);
      card.appendChild(hdr);

      let plMult = 1;
      if (dragon) {
        const dWrap = el(`<div style="margin-bottom:10px;padding:8px;background:var(--tint-gold);border:1px dashed var(--gold-leaf);border-radius:var(--r-sm)"></div>`);
        dWrap.innerHTML = `<b style="color:var(--gold-ink);display:block;margin-bottom:6px">🐉 Critical Dragon Boon! Choose one:</b>`;
        const bRow = el(`<div style="display:flex;gap:6px;flex-wrap:wrap"></div>`);
        const bDbl = el(`<button class="skill-chip quick-chip" style="border-color:var(--gold-leaf)" title="Double Damage or Healing dice">💥 Double</button>`);
        bDbl.onclick = () => { plMult = 2; bDbl.style.background = "var(--gold-leaf)"; bDbl.style.color = "var(--on-gold)"; showToast("Double Effect active! Damage/Healing dice will be multiplied by 2."); };
        const bRef = el(`<button class="skill-chip quick-chip" style="border-color:var(--gold-leaf)" title="Refund ${cost} WP">✨ Refund</button>`);
        bRef.onclick = () => { Store.update(charId, ch => { ch.state.wp = Math.min(effWpMax(ch), (ch.state.wp || 0) + cost); }); Roller.refresh(charId); bRef.disabled = true; showToast(`Refunded ${cost} WP!`, "success"); };
        const bFree = el(`<button class="skill-chip quick-chip" style="border-color:var(--gold-leaf)" title="Cast another spell without spending an action">⚡ Free Cast</button>`);
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
      const alive = (x) => !x.defeated && (x.hp == null || x.hp > 0);
      const combFoes = combs.filter(x => !isHeroCb(x) && alive(x));
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
      // Selects always open on a real target (the first living one, or a preferred
      // key such as the caster for heals) so an effect never silently no-ops.
      const buildSelect = (list, emptyLabel, preferKey) => {
        const s = el(`<select class="input" style="min-width:150px"></select>`);
        list.forEach(t => s.appendChild(el(`<option value="${esc(t.key)}">${esc(t.label)}</option>`)));
        if (!list.length && emptyLabel) s.appendChild(el(`<option value="">${esc(emptyLabel)}</option>`));
        if (list.length) s.value = (preferKey && list.some(t => t.key === preferKey)) ? preferKey : list[0].key;
        return s;
      };
      const selfKey = (() => { const a = allies.find(t => t.charId === charId || (t.cb && t.cb.charId === charId)); return a ? a.key : null; })();
      const needTarget = (sel) => { showToast("Pick a target first (or type a custom one).", "error"); if (sel && sel.focus) sel.focus(); };
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
        const tSel = buildSelect(allies, "— no targets —", selfKey);
        const dIn = el(`<input type="text" class="input" style="width:84px" value="${this.spellDice(spell, pl)}" title="healing dice">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--ok-fill);color:var(--on-fill);border:none" title="Apply Healing">💚 Heal</button>`);
        btn.onclick = () => {
          const t = findT(allies, tSel.value);
          if (!t && allies.length) { needTarget(tSel); return; }
          let amt = Dice.roll(dIn.value.trim() || this.spellDice(spell, pl)); if (plMult === 2) amt *= 2;
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
        const armLbl = el(`<label style="display:flex;align-items:center;gap:4px;font-size:var(--fs-xs)"><input type="checkbox" ${isPsychic ? "" : "checked"}> Armor mitigates</label>`);
        const fIn = el(`<input type="text" class="input" style="width:84px" value="${this.spellDice(spell, pl)}" title="damage dice">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--bad-fill);color:var(--on-fill);border:none" title="Strike target">💥 Strike</button>`);
        btn.onclick = async () => {
          const dist = Number(distIn.value) || 0, maxR = this.getRangeLimit(spell);
          if (dist > maxR && !(await confirmModal(`Distance (${dist}m) exceeds range (${maxR}m). Strike anyway?`, { title: "Out of range", okText: "Strike anyway" }))) return;
          const t = cstIn.value.trim() ? null : findT(enemies, tSel.value);
          if (!t && !cstIn.value.trim()) { needTarget(enemies.length ? tSel : cstIn); return; }
          let dmg = Dice.roll(fIn.value.trim() || this.spellDice(spell, pl)); if (plMult === 2) dmg *= 2;
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
        const chkWrap = el(`<div style="max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:6px;background:var(--tint-shade);border-radius:var(--r-sm)"></div>`);
        enemies.forEach(t => { chkWrap.appendChild(el(`<label style="font-size:var(--fs-xs);display:flex;gap:6px"><input type="checkbox" value="${esc(t.key)}" checked> ${esc(t.label)}</label>`)); });
        if (!enemies.length) chkWrap.appendChild(el(`<span class="stat-line">No enemies in combat — roll &amp; apply manually.</span>`));
        const armLbl = el(`<label style="display:flex;align-items:center;gap:4px;font-size:var(--fs-xs)"><input type="checkbox" checked> Armor mitigates</label>`);
        const fIn = el(`<input type="text" class="input" style="width:84px" value="${this.spellDice(spell, pl)}" title="damage dice">`);
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--bad-fill);color:var(--on-fill);border:none" title="Blast all checked targets">💥 Blast AoE</button>`);
        btn.onclick = () => {
          const ids = Array.from(chkWrap.querySelectorAll("input:checked")).map(x => x.value);
          if (enemies.length && !ids.length) { needTarget(); return; }
          let dmg = Dice.roll(fIn.value.trim() || this.spellDice(spell, pl)); if (plMult === 2) dmg *= 2;
          const names = [];
          ids.forEach(id => { const t = findT(enemies, id); if (t) { const arm = armLbl.querySelector("input").checked ? t.armor : 0; const net = Math.max(0, dmg - arm); applyHp(t, -net); names.push(`${t.name} (−${net})`); } });
          card.innerHTML = `<p class="outcome bad">💥 Blast <b>${dmg} raw</b> → ${names.join(", ") || "roll & apply manually"}.</p>`;
        };
        wrap.append(chkWrap, armLbl, fIn, btn); card.appendChild(wrap);
      } else if (cat === "summon") {
        const sKey = Object.keys(SUMMON_STATS).find(k => (spell.name || "").toLowerCase().includes(k)) || "familiar";
        const st = SUMMON_STATS[sKey];
        const row = el(`<div style="display:flex;flex-direction:column;gap:6px"></div>`);
        row.innerHTML = `<p class="notice" style="font-size:var(--fs-xs)"><b>Summon (${sKey.toUpperCase()}):</b> HP ${st.hp}, Armor ${st.armor}, Move ${st.movement}m · ${st.attack}</p>`;
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
        const btn = el(`<button class="skill-chip quick-chip" style="background:var(--arcane-fill);color:var(--on-fill);border:none" title="Hex target">🧿 Hex</button>`);
        btn.onclick = () => {
          const t = findT(enemies, tSel.value);
          if (t && !t.isChar) { t.cb.name = `🧿 ${t.cb.name.replace(/🧿\s*/, "")}`; t.cb.notes = `${t.cb.notes ? t.cb.notes + " · " : ""}CURSED (${spell.name} PL${pl})`; Combat.save(cd); Combat.rerender(); }
          card.innerHTML = `<p class="outcome" style="color:var(--arcane);border-color:var(--arcane)">🧿 Cursed ${t ? esc(t.name) : "target (apply manually)"}.</p>`;
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
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--info);color:var(--info)" title="Grant second initiative turn">⚡ Grant Turn</button>`);
        btn.onclick = () => {
          const t = findT(hasteList, tSel.value);
          if (t && !t.isChar) { cd.combatants.push({ ...t.cb, id: uid(), name: `${t.cb.name} (Hasted 2nd Turn)`, init: null, done: false, acted: false }); Combat.save(cd); Combat.rerender(); card.innerHTML = `<p class="outcome" style="color:var(--info);border-color:var(--info)">⚡ Granted a second combat turn.</p>`; }
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
        const btn = el(`<button class="skill-chip quick-chip" style="border-color:var(--accent);color:var(--accent-ink)" title="Track this effect on the character sheet">+ Track effect</button>`);
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
    // Drink / apply a brewed dose or bought potion. The effect comes from the
    // item's own data (core gear or Alchemy recipe), so "Healing Potion (dose)"
    // heals its 2D6. The dose is only consumed when it is actually used.
    usePotion(charId, item, itemIdx) {
      const base = String(item.name || "").replace(/\s*\(dose\)/i, "").replace(/\s*\(×?\s*\d+\)/, "").trim();
      const key = normName(base);
      const gear = (DB.gear || []).find((g) => normName(String(g.name).replace(/\s*\(dose\)/i, "")) === key);
      let recipe = null;
      Object.values((MAGICX && MAGICX.schools) || {}).concat(Object.values((MAGICX && MAGICX.newSpells) || {})).forEach((pool) => {
        [...((pool && pool.tricks) || []), ...((pool && pool.spells) || [])].forEach((x) => { if (!recipe && x && normName(x.name) === key) recipe = x; });
      });
      const text = (gear && gear.effect) || (recipe && recipe.text) || item.text || "";
      const hpDice = (/(\d*D\d+)\s*HP/i.exec(text) || [])[1] || (/heal|healing|restor/i.test(base) ? (/(\d*D\d+)/i.exec(text) || [])[1] : null);
      const wpDice = (/(\d*D\d+)\s*WP/i.exec(text) || [])[1] || null;
      const m = modal(`🧪 ${item.name}`);
      m.body.appendChild(el(`<p class="stat-line">${text ? esc(text) : "Alchemical brew — resolve its effect with your GM."}</p>`));
      const consume = () => Store.update(charId, (ch) => {
        const items = (ch.inventory && ch.inventory.items) || [];
        const i = items[itemIdx] && items[itemIdx].name === item.name ? itemIdx : items.findIndex((x) => x && x.name === item.name);
        if (i >= 0) items.splice(i, 1);
      });
      const out = el(`<div class="roll-result" role="status" aria-live="polite"></div>`);
      if (hpDice || wpDice) {
        // Target: the drinker by default, or any hero on the roster.
        const heroes = Store.list();
        const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0"><span class="stat-line" style="margin:0">Who drinks it:</span></div>`);
        const sel = el(`<select class="input" style="min-width:150px"></select>`);
        heroes.forEach((h) => sel.appendChild(el(`<option value="${esc(h.id)}">${esc(h.identity.name)} (HP ${h.state.hp}/${effHpMax(h)})</option>`)));
        sel.value = charId;
        const btn = el(`<button class="btn block" style="background:var(--ok-fill);color:var(--on-fill);border:none">🧪 Drink${hpDice ? ` · ${hpDice} HP` : ""}${wpDice ? ` · ${wpDice} WP` : ""}</button>`);
        btn.onclick = () => {
          btn.disabled = true;
          const tid = sel.value || charId;
          const hp = hpDice ? Dice.roll(hpDice) : 0, wp = wpDice ? Dice.roll(wpDice) : 0;
          let gotHp = 0, gotWp = 0;
          Store.update(tid, (ch) => {
            const h0 = ch.state.hp || 0, w0 = ch.state.wp || 0;
            ch.state.hp = Math.min(effHpMax(ch), h0 + hp); ch.state.wp = Math.min(effWpMax(ch), w0 + wp);
            gotHp = ch.state.hp - h0; gotWp = ch.state.wp - w0;
            if (ch.state.hp > 0) { ch.state.deathRolls = { successes: 0, failures: 0 }; ch.state.rallied = false; }
          });
          consume();
          // Mirror HP/WP onto the hero's combat row.
          const cd = Combat.load(); const cb = (cd.combatants || []).find((x) => x.charId === tid);
          if (cb) { const t = Store.get(tid); cb.hp = t.state.hp; cb.wp = t.state.wp; cb.defeated = false; Combat.save(cd); }
          const who = (Store.get(tid) || {}).identity?.name || "Hero";
          out.innerHTML = `<p class="outcome ok">💚 ${esc(who)}: ${hpDice ? `rolled ${hp} → +${gotHp} HP` : ""}${hpDice && wpDice ? " · " : ""}${wpDice ? `rolled ${wp} → +${gotWp} WP` : ""}. Dose used.</p>`;
          Roller.refresh(charId); if (tid !== charId) Roller.refresh(tid);
        };
        row.appendChild(sel); m.body.append(row, btn, out);
      } else {
        const btn = el(`<button class="btn block">🧪 Use (consume dose)</button>`);
        btn.onclick = () => { btn.disabled = true; consume(); out.innerHTML = `<p class="outcome ok">Dose used — apply the effect above.</p>`; Roller.refresh(charId); };
        m.body.append(btn, out);
      }
    }
  };

