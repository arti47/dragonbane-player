/* solo.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { compassRose, crest, dayDial, emblem, illo, oracleSeal } from './graphics.js';
import { icon } from './icons.js';
import { Action } from './action.js';
import { openChapter } from './library.js';
import { $, DB, Dice, el, esc, helpBox, sectionTitle, uid } from './core.js';
import { confirmModal, modal, showToast, showUndoToast } from './ui.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { applyInvoluntaryConditionTo, effHpMax, effWpMax, heroArmor } from './derived.js';
import { Roller } from './roller.js';
import { Combat } from './combat.js';
import { Sheet } from './sheet.js';
import { Router } from './router.js';
import { init } from './main.js';

export const SoloMode = {
    HERO_KEY: "dragonbane.soloHeroId",
    JOURNAL_KEY: "dragonbane.soloJournal",
    heroId() { return localStorage.getItem(this.HERO_KEY) || null; },
    // The hero the Solo tools roll as, if one is linked and still exists.
    linkedHero() { const id = this.heroId(); const c = id ? Store.get(id) : null; return c || null; },
    setHero(id) { if (id) localStorage.setItem(this.HERO_KEY, id); else localStorage.removeItem(this.HERO_KEY); },
    // Solo journal — a persisted scene note + running log, keyed per linked hero.
    journalKey() { return this.JOURNAL_KEY + ":" + (this.heroId() || "global"); },
    loadJournal() { let j; try { j = JSON.parse(localStorage.getItem(this.journalKey())) || {}; } catch (_) { j = {}; } j.scene = j.scene || ""; j.entries = Array.isArray(j.entries) ? j.entries : []; j.threads = Array.isArray(j.threads) ? j.threads : []; j.npcs = Array.isArray(j.npcs) ? j.npcs : []; return j; },
    saveJournal(j) { localStorage.setItem(this.journalKey(), JSON.stringify(j)); },
    // A party hero picked for solo play: keep playing it (progress syncs to the
    // group) or branch a solo copy that never touches the party sheet.
    askPartyHero(h, onCancel) {
      const m = modal(`Solo play with ${h.identity.name}`);
      m.body.appendChild(el(`<p class="modal-msg">${esc(h.identity.name)} belongs to your party campaign. How should this solo session count?</p>`));
      const shared = el(`<button class="btn block">Play the party hero<small class="btn-sub">HP, conditions and advancement sync to the group; the GM sees a summary in the roll log.</small></button>`);
      const copy = el(`<button class="btn secondary block u-mt2">Make a solo copy<small class="btn-sub">A separate hero for solo only — the party sheet never changes.</small></button>`);
      const cancel = el(`<button class="btn ghost block u-mt2">Cancel</button>`);
      shared.onclick = () => { m.close(); this.setHero(h.id); Router.go("adventure"); };
      copy.onclick = () => { m.close(); const c = this.soloCopy(h); this.setHero(c.id); showToast(`Solo copy created: ${c.identity.name}.`, "success"); Router.go("adventure"); };
      cancel.onclick = () => { m.close(); if (onCancel) onCancel(); };
      m.body.append(shared, copy, cancel);
    },
    soloCopy(h) {
      const c = JSON.parse(JSON.stringify(h));
      c.id = uid(); c.campaignId = null; c.soloCopy = true; c.copyOf = h.id; delete c.assignedBy;
      c.identity.name = `${h.identity.name} (solo)`;
      const list = Store.list(); list.push(c); Store.save(list);
      return c;
    },
    // The solo tools (oracle, inspiration, twists, foe generator, journey) as
    // panels for the Adventure feed. api: { hero, log(text, kind), thread(text),
    // npc(name, note), fight(foe) } — every result is written into the story.
    buildTools(api) {
      const solo = typeof DRAGONBANE_SOLO !== "undefined" ? DRAGONBANE_SOLO : null;
      if (!solo) return {};
      const linked = api.hero || null;
      const addNpc = (name, note) => api.npc(name, note);
      const resultBtns = (getText, kind) => {
        const t = () => (typeof getText === "function" ? getText() : getText);
        api.log(t(), kind || "note");
        const wrap = el(`<div class="res-logged"><span class="rl-ok">✓ In your story</span></div>`);
        const tb = el(`<button class="btn ghost">＋ Quest</button>`); tb.onclick = () => { api.thread(t()); tb.disabled = true; };
        wrap.append(tb); return wrap;
      };

      // 1. Fortune Chart Oracle
      const f = solo.fortune;
      const fPanel = el(`
        <div class="panel oracle-box">
          <h3>🔮 Ask the oracle</h3>
          <input type="text" id="solo-f-q" class="oracle-q" placeholder="Ask a yes / no question…" aria-label="Your question">
          <div class="like-pick" role="radiogroup" aria-label="How likely?">
            ${f.likelihoods.map((l) => `<button type="button" class="lp-btn" role="radio" data-like="${l.key}" aria-checked="false"><b>${esc(l.label)}</b><small>${esc(l.roll.replace(/^Roll /i, "").replace(/, take the /i, " "))}</small></button>`).join("")}
          </div>
          <select id="solo-f-like" class="input" hidden aria-hidden="true">${f.likelihoods.map(l => `<option value="${l.key}">${l.label} (${l.roll})</option>`).join("")}</select>
          <details class="o-more"><summary>Kind of answer</summary>
            <select id="solo-f-col" class="input u-w100-mt1" aria-label="Kind of answer">
              ${f.columns.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join("")}
            </select>
          </details>
          <button class="btn block oracle-go" id="solo-f-roll">${oracleSeal("yes", false)}<span>Ask</span></button>
          <div class="u-mt3" id="solo-f-out"></div>
        </div>`);
      const syncLike = () => { const v = fPanel.querySelector("#solo-f-like").value; fPanel.querySelectorAll(".lp-btn").forEach((b) => b.setAttribute("aria-checked", b.dataset.like === v ? "true" : "false")); };
      fPanel.querySelectorAll(".lp-btn").forEach((b) => { b.onclick = () => { fPanel.querySelector("#solo-f-like").value = b.dataset.like; syncLike(); }; });
      // Remember the last-used likelihood + question column across visits.
      let oPref = {}; try { oPref = JSON.parse(localStorage.getItem("dragonbane.soloOraclePref")) || {}; } catch (_) {}
      if (oPref.like) fPanel.querySelector("#solo-f-like").value = oPref.like;
      if (oPref.col) fPanel.querySelector("#solo-f-col").value = oPref.col;
      if (!oPref.like && f.likelihoods.some((l) => l.key === "even")) fPanel.querySelector("#solo-f-like").value = "even";
      syncLike();
      fPanel.querySelector("#solo-f-roll").onclick = () => {
        const likeKey = fPanel.querySelector("#solo-f-like").value;
        const colKey = fPanel.querySelector("#solo-f-col").value;
        localStorage.setItem("dragonbane.soloOraclePref", JSON.stringify({ like: likeKey, col: colKey }));
        const colMap = { "yes/no": "yesNo", "number": "number", "scale": "scale", "power": "power", "quality": "quality", "reaction": "reaction" };
        const prop = colMap[colKey] || "yesNo";

        let d1 = Dice.d(6), d2 = Dice.d(6);
        let used = d1;
        let rollText = `${d1}`;
        if (likeKey === "unlikely") { used = Math.min(d1, d2); rollText = `2D6 lowest (${d1}, ${d2}) → <b>${used}</b>`; }
        else if (likeKey === "likely") { used = Math.max(d1, d2); rollText = `2D6 highest (${d1}, ${d2}) → <b>${used}</b>`; }

        const row = f.chart.find(r => {
          if (r.d6 === "1" && used === 1) return true;
          if (r.d6 === "6" && used === 6) return true;
          if (r.d6 === "2-3" && (used === 2 || used === 3)) return true;
          if (r.d6 === "4-5" && (used === 4 || used === 5)) return true;
          return false;
        }) || f.chart[0];

        const ans = row[prop] || "—";
        const twist = used === 1 || used === 6;

        fPanel.querySelector("#solo-f-out").innerHTML = `
          <div class="fortune deal has-seal" style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid ${twist ? "var(--accent)" : "var(--ok)"}">
            ${(() => { const a = String(ans).toLowerCase(); const k = /\b(and|but)\b/.test(a) && /^(yes|no)/.test(a) ? "and" : /^no\b/.test(a) ? "no" : /^yes\b/.test(a) ? "yes" : ""; return k ? oracleSeal(k, twist) : ""; })()}
            <p class="stat-line u-mb1only">Rolled ${rollText}</p>
            <p style="font-size:var(--fs-xl);font-weight:bold;margin:0;color:${twist ? "var(--accent-ink)" : "var(--ok)"}">${esc(ans)}</p>
            ${twist ? `<p class="stat-line" style="margin:4px 0 0 0;color:var(--accent-ink)">★ Extreme result / twist!</p>` : ""}
          </div>`;
        const q = fPanel.querySelector("#solo-f-q").value.trim();
        fPanel.querySelector("#solo-f-out").appendChild(resultBtns(`${q ? q + " → " : "Oracle: "}${ans}${twist ? " (twist!)" : ""}${colKey !== "yes/no" ? ` [${colKey}]` : ""}`, "oracle"));
        fPanel.querySelector("#solo-f-q").value = "";
      };

      // 2. Inspiration Table
      const insp = solo.inspiration || [];
      const iPanel = el(`
        <div class="panel">
          <h3>💡 Inspiration Table</h3>
          <p class="stat-line">Generate open-ended adventure prompts (D20×3).</p>
          <div style="display:flex;gap:6px;margin:10px 0;flex-wrap:wrap">
            <button class="btn block" id="solo-i-all" style="flex:1 1 100%">🎲 Roll Phrase (3D20)</button>
            <button class="btn ghost u-f1" id="solo-i-act">Action</button>
            <button class="btn ghost u-f1" id="solo-i-att">Attribute</button>
            <button class="btn ghost u-f1" id="solo-i-thg">Thing</button>
          </div>
          <div id="solo-i-out"></div>
        </div>`);

      const doInsp = (mode) => {
        let r1 = Dice.d(20), r2 = Dice.d(20), r3 = Dice.d(20);
        const row1 = insp.find(x => x.d20 === r1) || insp[0];
        const row2 = insp.find(x => x.d20 === r2) || insp[0];
        const row3 = insp.find(x => x.d20 === r3) || insp[0];

        let res = "";
        if (mode === "all") res = `<span class="tarot-row"><span class="tarot" style="--i:0">${emblem("glyph", "bolt", "emb tarot-emb")}<b>${row1.action}</b></span><span class="tarot-sep"> · </span><span class="tarot" style="--i:1">${emblem("glyph", "sparkle", "emb tarot-emb")}<b>${row2.attribute}</b></span><span class="tarot-sep"> · </span><span class="tarot" style="--i:2">${emblem("glyph", "key", "emb tarot-emb")}<b>${row3.thing}</b></span></span> <small style="font-weight:normal;color:var(--muted)">(${r1}, ${r2}, ${r3})</small>`;
        else if (mode === "act") res = `Action (${r1}): <b>${row1.action}</b>`;
        else if (mode === "att") res = `Attribute (${r2}): <b>${row2.attribute}</b>`;
        else if (mode === "thg") res = `Thing (${r3}): <b>${row3.thing}</b>`;

        iPanel.querySelector("#solo-i-out").innerHTML = `
          <div class="fortune deal" style="padding:10px;background:var(--bg);border-radius:var(--r-sm);font-size:var(--fs-xl);text-align:center;margin-top:8px">
            ${res}
          </div>`;
        const plain = mode === "all" ? `${row1.action} · ${row2.attribute} · ${row3.thing}` : mode === "act" ? row1.action : mode === "att" ? row2.attribute : row3.thing;
        iPanel.querySelector("#solo-i-out").appendChild(resultBtns(`Inspiration: ${plain}`, "inspire"));
      };
      iPanel.querySelector("#solo-i-all").onclick = () => doInsp("all");
      iPanel.querySelector("#solo-i-act").onclick = () => doInsp("act");
      iPanel.querySelector("#solo-i-att").onclick = () => doInsp("att");
      iPanel.querySelector("#solo-i-thg").onclick = () => doInsp("thg");

      // 3. Narrative Twists
      const tw = solo.dragonDemonEffects || [];
      const tPanel = el(`
        <div class="panel">
          <h3>🐉 Narrative Twists (Out of Combat)</h3>
          <p class="stat-line">Roll 1D6 for non-combat twists when rolling a Dragon or Demon.</p>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn twist-btn dragon" id="solo-t-drag">🐉 Dragon Twist</button>
            <button class="btn twist-btn demon" id="solo-t-dem">👹 Demon Twist</button>
          </div>
          <div class="u-mt3" id="solo-t-out"></div>
        </div>`);
      const doTwist = (isDrag) => {
        const r = Dice.d(6);
        const row = tw.find(x => x.d6 === r) || tw[0];
        const txt = isDrag ? row.dragon : row.demon;
        tPanel.querySelector("#solo-t-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid ${isDrag ? "var(--ok)" : "var(--bad)"}">
            <p class="stat-line u-mb1only">Rolled ${r}</p>
            <p style="font-size:var(--fs-lg);margin:0;color:${isDrag ? "var(--ok)" : "var(--bad)"}">${esc(txt)}</p>
          </div>`;
        tPanel.querySelector("#solo-t-out").appendChild(resultBtns(`${isDrag ? "Dragon" : "Demon"} twist: ${txt}`, "twist"));
      };
      tPanel.querySelector("#solo-t-drag").onclick = () => doTwist(true);
      tPanel.querySelector("#solo-t-dem").onclick = () => doTwist(false);

      // 4. Solo NPC Generator & Attack Roller
      const npcs = solo.npcTemplates || [];
      const nat = solo.npcAttackTable || { roles: [], rows: [] };
      const nPanel = el(`
        <div class="panel foe-gen">
          <span class="foe-art" aria-hidden="true">${emblem("creature", "humanoid", "emb")}</span>
          <h3>⚔ Solo NPC &amp; Foe Generator</h3>
          <p class="stat-line">Quickly instantiate simple foes or roll their AI attacks.</p>
          <div class="field-row" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div class="u-f1-140">
              <label class="stat-line">Template</label><br>
              <select id="solo-n-tmpl" class="input u-w100-mt1">
                ${npcs.map(n => `<option value="${n.name}">${n.name} (${n.hp} HP)</option>`).join("")}
              </select>
            </div>
            <div style="flex:2;min-width:180px">
              <label class="stat-line">Name / Custom Label</label><br>
              <div class="name-gen" style="display:flex;gap:4px;margin-top:4px">
                <input type="text" id="solo-n-name" class="input u-f1" placeholder="e.g. Deepfall Goblin Scout">
                <button type="button" class="btn step" id="solo-n-gen" title="Roll random D20 NPC name">🎲</button>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn secondary u-f1-150" id="solo-n-add">⚡ Add to Combat Tracker</button>
            <button class="btn u-f1-150" id="solo-n-fight">⚔ Fight it${linked ? " (with " + esc(linked.identity.name) + ")" : ""}</button>
            <button class="btn ghost u-f1-150" id="solo-n-remember" title="Save this NPC to the journal">👥 Remember NPC</button>
          </div>

          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
            <b>🎲 NPC Attack Table AI Roller</b>
            <p class="stat-line" style="margin:2px 0 8px 0">Select a combat role to roll their D6 action turn:</p>
            <div class="u-row-wrap">
              <select id="solo-n-role" class="input" style="flex:1;min-width:160px">
                ${(nat.roles || []).map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
              <button class="btn" id="solo-n-atk">Roll NPC Attack (D6)</button>
            </div>
            <div class="u-mt25" id="solo-n-out"></div>
          </div>
        </div>`);

      if (nPanel.querySelector("#solo-n-gen")) {
        nPanel.querySelector("#solo-n-gen").onclick = () => {
          const rows = DB.names && DB.names.npc;
          if (!rows || !rows.length) return;
          const row = rows[Math.floor(Math.random() * rows.length)];
          const chosen = row[Math.floor(Math.random() * row.length)];
          nPanel.querySelector("#solo-n-name").value = chosen;
        };
      }

      const buildFoe = () => {
        const tmplName = nPanel.querySelector("#solo-n-tmpl").value;
        const tmpl = npcs.find(x => x.name === tmplName) || npcs[0];
        const custom = nPanel.querySelector("#solo-n-name").value.trim();
        const foeName = custom || `Solo ${tmpl.name}`;
        // Give the foe a weapon so its turn is resolvable in combat (attack roll +
        // damage applier), matching Bestiary parity — skill parsed from the template.
        const skill = parseInt((String(tmpl.skills || "").match(/(\d+)/) || [])[1], 10) || 12;
        return { id: uid(), name: foeName, kind: "npc", init: null, done: false, hp: tmpl.hp, maxHp: tmpl.hp, armor: tmpl.armor || 0, weapons: [{ name: `${tmpl.name} attack`, skill, damage: tmpl.damage }], notes: `${tmpl.name} template (${tmpl.damage})` };
      };
      nPanel.querySelector("#solo-n-add").onclick = () => {
        const foe = buildFoe();
        Combat.mutate(st => st.combatants.push(foe));
        showToast(`Added "${foe.name}" to the Combat Tracker!`, "success");
      };
      // ⚔ One-tap fight: the foe (and the linked hero) step into a fight in the feed.
      nPanel.querySelector("#solo-n-fight").onclick = () => api.fight(buildFoe());
      nPanel.querySelector("#solo-n-remember").onclick = () => { const foe = buildFoe(); addNpc(foe.name, foe.notes || ""); };

      nPanel.querySelector("#solo-n-atk").onclick = () => {
        const role = nPanel.querySelector("#solo-n-role").value;
        const roleMap = { "Melee Attacker": "melee", "Ranged Attacker": "ranged", "Sneaky Attacker": "sneaky", "Magic Attacker": "magic" };
        const prop = roleMap[role] || "melee";
        const r = Dice.d(6);

        const row = nat.rows.find(x => {
          if (x.d6 === "4" && r === 4) return true;
          if (x.d6 === "5" && r === 5) return true;
          if (x.d6 === "6" && r === 6) return true;
          if (x.d6 === "1-3" && r <= 3) return true;
          return false;
        }) || nat.rows[0];

        const actionText = row[prop] || "—";
        nPanel.querySelector("#solo-n-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid var(--accent)">
            <p class="stat-line u-mb1only">${esc(role)} · Rolled ${r}</p>
            <p style="font-size:var(--fs-lg);margin:0;font-weight:bold">${esc(actionText)}</p>
          </div>`;
        nPanel.querySelector("#solo-n-out").appendChild(resultBtns(`NPC ${role}: ${actionText}`, "foe"));
      };

      const jm = (DB.journeyMishaps || []);
      const hero = linked; // the linked hero (or null) — journey rolls use their sheet
      const shifts = ["🌅 Morning", "☀️ Day", "🌆 Evening", "🌙 Night"];
      // Roll on the D6 journey mishap table → { r, effect }.
      const rollMishap = () => { const r = Dice.d(jm.length || 6); const row = jm.find((x) => x.d6 === r) || jm[r - 1] || { effect: "—" }; return { r, effect: row.effect }; };
      const outBox = (color, html) => `<div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid ${color};margin-top:8px">${html}</div>`;
      // A follow-up attribute check for a mishap that calls for one, e.g.
      // "roll WIL or gain Scared" / "roll CON or suffer". When a hero is linked
      // it uses their real attribute and applies the governed condition on a
      // failure (WIL→Scared, CON→Sickly, …); otherwise the player types a value.
      const attrCheckRow = (attr, effectText) => {
        const cm = /roll\s+\w+\s+or\s+([^.)]+)/i.exec(effectText);
        const conseq = cm ? cm[1].trim() : "suffer the effect";
        const condKey = ((DB.conditions || []).find((c) => c.attribute === attr) || {}).key;
        const row = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)"></div>`);
        const btn = el(`<button class="btn secondary">🎲 Roll ${attr}</button>`);
        const out = el(`<div style="width:100%"></div>`);
        let getLvl;
        if (hero) {
          row.append(el(`<span class="stat-line">${attr} ${hero.attributes[attr]} · <b>${esc(hero.identity.name)}</b></span>`), btn, out);
          getLvl = () => (Store.get(hero.id) || hero).attributes[attr];
        } else {
          const input = el(`<input type="number" class="input" style="width:60px" value="10" min="1" max="18" title="your ${attr}">`);
          row.append(el(`<span class="stat-line">${attr} ≤</span>`), input, btn, out);
          getLvl = () => Math.max(1, Math.min(20, parseInt(input.value, 10) || 10));
        }
        btn.onclick = () => {
          const lvl = getLvl();
          const r = Dice.d(20), dragon = r === 1, demon = r === 20, ok = r <= lvl;
          let msg;
          if (ok) msg = `${r} vs ${attr} ${lvl} — resisted, no ill effect.`;
          else if (hero && condKey) { let label = ""; Store.update(hero.id, (ch) => { label = applyInvoluntaryConditionTo(ch, condKey); }); if (Roller.refresh) Roller.refresh(hero.id); msg = `${r} vs ${attr} ${lvl} — failed — ${esc(label)}.`; }
          else msg = `${r} vs ${attr} ${lvl} — failed — you ${esc(conseq)}.`;
          out.innerHTML = `<p class="outcome ${ok ? "ok" : "bad"}" style="margin:6px 0 0 0">${dragon ? "🐉 Dragon — " : demon ? "👹 Demon — " : ""}${msg}</p>`;
          btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed"; // one saving roll
        };
        return row;
      };
      // Render a rolled journey mishap as a DOM box, appending an inline
      // attribute-check row when the effect text says "roll <ATTR>".
      const mishapNode = (mp) => {
        const box = el(`<div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid var(--bad);margin-top:8px"></div>`);
        box.appendChild(el(`<p class="stat-line u-mb1only"><b>Journey Mishap</b> · Rolled ${mp.r}</p>`));
        box.appendChild(el(`<p style="font-size:var(--fs-lg);font-weight:bold;margin:0;color:var(--bad)">${esc(mp.effect)}</p>`));
        const am = /roll\s+(STR|CON|AGL|INT|WIL|CHA)\b/i.exec(mp.effect);
        if (am) box.appendChild(attrCheckRow(am[1].toUpperCase(), mp.effect));
        box.appendChild(resultBtns(`Journey Mishap (D6:${mp.r}): ${mp.effect}`, "mishap"));
        return box;
      };

      const jPanel = el(`<div class="panel has-rose" style="margin-top:12px;border-left:4px solid var(--ok)">
        <h3>🌲 Wilderness Journeys &amp; Travel Tools</h3>
      </div>`);

      // ⏱️ Shifts — random shift-of-day roller
      const shiftSec = el(`<div class="u-mb25"><p class="stat-line u-m0"><b>⏱️ Shifts:</b> Morning, Day, Evening, Night (~6h each). Travel speed: 1 node/hex per shift.</p></div>`);
      const shiftBtn = el(`<button class="btn ghost u-mt15">🎲 Random shift (D4)</button>`);
      const shiftOut = el(`<div></div>`);
      shiftBtn.onclick = () => { const r = Dice.d(4); shiftOut.innerHTML = outBox("var(--accent)", `${dayDial(r - 1)}<p class="stat-line u-mb1only">Rolled ${r}</p><p style="font-size:var(--fs-xl);font-weight:bold;margin:0">${esc(shifts[r - 1])}</p>`); shiftOut.appendChild(resultBtns(`Shift: ${shifts[r - 1]}`, "travel")); };
      shiftSec.append(shiftBtn, shiftOut);
      jPanel.appendChild(el(`<span class="rose-art" aria-hidden="true">${compassRose()}</span>`));
      jPanel.appendChild(shiftSec);

      // ⛺ Camp & Rest — Bushcraft roll; failure rolls the mishap table.
      const campSec = el(`<div style="margin-bottom:10px;border-top:1px solid var(--border);padding-top:10px"><p class="stat-line u-m0"><b>⛺ Camp &amp; Rest:</b> Roll Bushcraft. Success lets the party rest (Shift rest = full HP/WP). Failure = Journey Mishap.</p></div>`);
      const campOut = el(`<div></div>`);
      const renderCampResult = (ok) => {
        campOut.innerHTML = "";
        const box = el(`<div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-top:8px"></div>`);
        box.appendChild(el(`<p class="outcome ${ok ? "ok" : "bad"} u-m0">${ok ? "Camp made! The party may take a Shift rest (full HP/WP)." : "Failed to make camp — Journey Mishap:"}</p>`));
        if (!ok) box.appendChild(mishapNode(rollMishap()));
        else box.appendChild(resultBtns("Camp made — party rests.", "camp"));
        campOut.appendChild(box);
      };
      if (hero) {
        const campBtn = el(`<button class="btn u-mt15">🎲 Roll Bushcraft <span class="stat-line" style="color:inherit;opacity:.85">(${esc(hero.identity.name)} · ${(Store.get(hero.id) || hero).skills.Bushcraft ? (Store.get(hero.id) || hero).skills.Bushcraft.level : "—"})</span></button>`);
        campBtn.onclick = () => Roller.skill(hero.id, "Bushcraft", { onRoll: (success) => renderCampResult(success) });
        campSec.append(campBtn, campOut);
      } else {
        const campRow = el(`<div class="u-row-wrap-mt"><span class="stat-line">Bushcraft ≤</span></div>`);
        const campSkill = el(`<input type="number" class="input" style="width:64px" value="10" min="1" max="18" title="your Bushcraft level">`);
        const campBtn = el(`<button class="btn">🎲 Roll Bushcraft</button>`);
        campBtn.onclick = () => {
          const lvl = Math.max(1, Math.min(20, parseInt(campSkill.value, 10) || 10));
          const r = Dice.d(20), dragon = r === 1, demon = r === 20, ok = r <= lvl;
          campOut.innerHTML = "";
          const box = el(`<div style="padding:10px;background:var(--bg);border-radius:var(--r-sm);border-left:4px solid ${ok ? "var(--ok)" : "var(--bad)"};margin-top:8px"></div>`);
          box.appendChild(el(`<p class="outcome ${ok ? "ok" : "bad"} u-m0">${dragon ? "🐉 Dragon — " : demon ? "👹 Demon — " : ""}${r} vs ${lvl} — ${ok ? "Camp made! The party may take a Shift rest (full HP/WP)." : "Failed to make camp — Journey Mishap:"}</p>`));
          if (!ok) box.appendChild(mishapNode(rollMishap()));
          else box.appendChild(resultBtns("Camp made — party rests.", "camp"));
          campOut.appendChild(box);
        };
        campRow.append(campSkill, campBtn);
        campSec.appendChild(campRow);
      }
      campSec.appendChild(campOut);
      jPanel.appendChild(campSec);

      // 🍄 Foraging & Hunting — Bushcraft/Hunting roll; success gathers rations.
      const forageSec = el(`<div style="margin-bottom:10px;border-top:1px solid var(--border);padding-top:10px"><p class="stat-line u-m0"><b>🍄 Foraging &amp; Hunting:</b> Spend a shift making a Bushcraft or Hunting check for rations.</p></div>`);
      const forageOut = el(`<div></div>`);
      const renderForageResult = (ok, dragon) => {
        if (ok) { const rations = Dice.roll("D6") + (dragon ? Dice.roll("D6") : 0); forageOut.innerHTML = outBox("var(--ok)", `<p class="outcome ok u-m0">${dragon ? "🐉 Dragon — bumper haul! " : ""}Success — found <b>${rations}</b> ration${rations === 1 ? "" : "s"}.</p>`); forageOut.appendChild(resultBtns(`Foraged ${rations} ration${rations === 1 ? "" : "s"}.`, "travel")); }
        else forageOut.innerHTML = outBox("var(--bad)", `<p class="outcome bad u-m0">No food found this shift.</p>`);
      };
      if (hero) {
        const forageRow = el(`<div class="u-row-wrap-mt"></div>`);
        const skillSel = el(`<select class="input" style="width:auto"></select>`);
        ["Bushcraft", "Hunting & Fishing"].forEach((s) => { if ((Store.get(hero.id) || hero).skills[s]) skillSel.appendChild(el(`<option value="${esc(s)}">${esc(s)} (${(Store.get(hero.id) || hero).skills[s].level})</option>`)); });
        const forageBtn = el(`<button class="btn">🎲 Forage / Hunt</button>`);
        forageBtn.onclick = () => Roller.skill(hero.id, skillSel.value || "Bushcraft", { onRoll: (success, dragon) => renderForageResult(success, dragon) });
        forageRow.append(skillSel, forageBtn);
        forageSec.append(forageRow, forageOut);
      } else {
        const forageRow = el(`<div class="u-row-wrap-mt"><span class="stat-line">Skill ≤</span></div>`);
        const forageSkill = el(`<input type="number" class="input" style="width:64px" value="10" min="1" max="18" title="your Bushcraft / Hunting level">`);
        const forageBtn = el(`<button class="btn">🎲 Forage / Hunt</button>`);
        forageBtn.onclick = () => {
          const lvl = Math.max(1, Math.min(20, parseInt(forageSkill.value, 10) || 10));
          const r = Dice.d(20), dragon = r === 1, demon = r === 20, ok = r <= lvl;
          if (ok) { const rations = Dice.roll("D6") + (dragon ? Dice.roll("D6") : 0); forageOut.innerHTML = outBox("var(--ok)", `<p class="outcome ok u-m0">${dragon ? "🐉 Dragon — bumper haul! " : ""}${r} vs ${lvl} — found <b>${rations}</b> ration${rations === 1 ? "" : "s"}.</p>`); forageOut.appendChild(resultBtns(`Foraged ${rations} ration${rations === 1 ? "" : "s"}.`, "travel")); }
          else forageOut.innerHTML = outBox("var(--bad)", `<p class="outcome bad u-m0">${demon ? "👹 Demon — " : ""}${r} vs ${lvl} — no food found this shift.</p>`);
        };
        forageRow.append(forageSkill, forageBtn);
        forageSec.append(forageRow, forageOut);
      }
      jPanel.appendChild(forageSec);

      // 🌩️ Journey Mishap (D6) — roll & show the result
      const mishapSec = el(`<div style="border-top:1px solid var(--border);padding-top:10px"><p class="stat-line" style="margin:0 0 8px 0"><b>🌩️ Journey Mishap:</b> Bad luck befalls the party while travelling or resting.</p></div>`);
      const mishapBtn = el(`<button class="btn" style="background:var(--bad-fill);color:var(--on-fill)">🎲 Roll Journey Mishap (D6)</button>`);
      const mishapOut = el(`<div></div>`);
      mishapBtn.onclick = () => { mishapOut.innerHTML = ""; mishapOut.appendChild(mishapNode(rollMishap())); };
      mishapSec.append(mishapBtn, mishapOut);
      jPanel.appendChild(mishapSec);


      return { ask: fPanel, inspire: iPanel, twist: tPanel, foe: nPanel, travel: jPanel };
    }
  };

