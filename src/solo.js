/* solo.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, DB, Dice, el, esc, sectionTitle, uid } from './core.js';
import { showToast } from './ui.js';
import { Magic, Settings } from './settings.js';
import { Roller } from './roller.js';
import { Combat } from './combat.js';
import { Router } from './router.js';
import { init } from './main.js';

export const SoloMode = {
    view() {
      const solo = typeof DRAGONBANE_SOLO !== "undefined" ? DRAGONBANE_SOLO : null;
      const root = el(`<div></div>`);
      root.appendChild(el(sectionTitle("Solo Assistant")));
      if (!solo) {
        root.appendChild(el(`<div class="panel"><p class="stat-line">Solo rules library not loaded.</p></div>`));
        return root;
      }

      // Play mode switch banner
      const sm = Settings.soloMode();
      const banner = el(`
        <div class="panel" style="background:var(--card);border:1px solid var(--accent);display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <b>🧭 Solo Campaign Mode: <span style="color:${sm ? "var(--ok)" : "var(--muted)"}">${sm ? "Active" : "Standard"}</span></b><br>
            <span class="stat-line">When active, unlocks solo heroic abilities (Army of One, Sole Survivor) in character creation.</span>
          </div>
        </div>`);
      const bBtn = el(`<button class="btn ${sm ? "secondary" : ""}">${sm ? "Disable Solo Mode" : "Enable Solo Mode"}</button>`);
      bBtn.onclick = () => { Settings.set("soloMode", !sm); Router.go("solo"); };
      banner.appendChild(bBtn);
      root.appendChild(banner);

      // 1. Fortune Chart Oracle
      const f = solo.fortune;
      const fPanel = el(`
        <div class="panel">
          <h3>🔮 Fortune Chart (Oracle)</h3>
          <p class="stat-line">Ask a question, set likelihood, and leave the answer to fate.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Likelihood</label><br>
              <select id="solo-f-like" class="input" style="width:100%;margin-top:4px">
                ${f.likelihoods.map(l => `<option value="${l.key}">${l.label} (${l.roll})</option>`).join("")}
              </select>
            </div>
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Question / Column</label><br>
              <select id="solo-f-col" class="input" style="width:100%;margin-top:4px">
                ${f.columns.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join("")}
              </select>
            </div>
          </div>
          <button class="btn block" id="solo-f-roll">Roll Oracle</button>
          <div id="solo-f-out" style="margin-top:12px"></div>
        </div>`);

      fPanel.querySelector("#solo-f-roll").onclick = () => {
        const likeKey = fPanel.querySelector("#solo-f-like").value;
        const colKey = fPanel.querySelector("#solo-f-col").value;
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
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${twist ? "var(--accent)" : "var(--ok)"}">
            <p class="stat-line" style="margin:0 0 4px 0">Rolled ${rollText}</p>
            <p style="font-size:1.4rem;font-weight:bold;margin:0;color:${twist ? "var(--accent)" : "var(--ok)"}">${esc(ans)}</p>
            ${twist ? `<p class="stat-line" style="margin:4px 0 0 0;color:var(--accent)">★ Extreme result / twist!</p>` : ""}
          </div>`;
      };
      root.appendChild(fPanel);

      // 2. Inspiration Table
      const insp = solo.inspiration || [];
      const iPanel = el(`
        <div class="panel">
          <h3>💡 Inspiration Table</h3>
          <p class="stat-line">Generate open-ended adventure prompts (D20×3).</p>
          <div style="display:flex;gap:6px;margin:10px 0;flex-wrap:wrap">
            <button class="btn block" id="solo-i-all" style="flex:1 1 100%">🎲 Roll Phrase (3D20)</button>
            <button class="btn ghost" id="solo-i-act" style="flex:1">Action</button>
            <button class="btn ghost" id="solo-i-att" style="flex:1">Attribute</button>
            <button class="btn ghost" id="solo-i-thg" style="flex:1">Thing</button>
          </div>
          <div id="solo-i-out"></div>
        </div>`);

      const doInsp = (mode) => {
        let r1 = Dice.d(20), r2 = Dice.d(20), r3 = Dice.d(20);
        const row1 = insp.find(x => x.d20 === r1) || insp[0];
        const row2 = insp.find(x => x.d20 === r2) || insp[0];
        const row3 = insp.find(x => x.d20 === r3) || insp[0];

        let res = "";
        if (mode === "all") res = `<b>${row1.action}</b> · <b>${row2.attribute}</b> · <b>${row3.thing}</b> <small style="font-weight:normal;color:var(--muted)">(${r1}, ${r2}, ${r3})</small>`;
        else if (mode === "act") res = `Action (${r1}): <b>${row1.action}</b>`;
        else if (mode === "att") res = `Attribute (${r2}): <b>${row2.attribute}</b>`;
        else if (mode === "thg") res = `Thing (${r3}): <b>${row3.thing}</b>`;

        iPanel.querySelector("#solo-i-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;font-size:1.3rem;text-align:center;margin-top:8px">
            ${res}
          </div>`;
      };
      iPanel.querySelector("#solo-i-all").onclick = () => doInsp("all");
      iPanel.querySelector("#solo-i-act").onclick = () => doInsp("act");
      iPanel.querySelector("#solo-i-att").onclick = () => doInsp("att");
      iPanel.querySelector("#solo-i-thg").onclick = () => doInsp("thg");
      root.appendChild(iPanel);

      // 3. Narrative Twists
      const tw = solo.dragonDemonEffects || [];
      const tPanel = el(`
        <div class="panel">
          <h3>🐉 Narrative Twists (Out of Combat)</h3>
          <p class="stat-line">Roll 1D6 for non-combat twists when rolling a Dragon or Demon.</p>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn" style="flex:1;background:var(--ok);color:#fff" id="solo-t-drag">🐉 Dragon Twist</button>
            <button class="btn" style="flex:1;background:var(--bad);color:#fff" id="solo-t-dem">👹 Demon Twist</button>
          </div>
          <div id="solo-t-out" style="margin-top:12px"></div>
        </div>`);
      const doTwist = (isDrag) => {
        const r = Dice.d(6);
        const row = tw.find(x => x.d6 === r) || tw[0];
        const txt = isDrag ? row.dragon : row.demon;
        tPanel.querySelector("#solo-t-out").innerHTML = `
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${isDrag ? "var(--ok)" : "var(--bad)"}">
            <p class="stat-line" style="margin:0 0 4px 0">Rolled ${r}</p>
            <p style="font-size:1.2rem;margin:0;color:${isDrag ? "var(--ok)" : "var(--bad)"}">${esc(txt)}</p>
          </div>`;
      };
      tPanel.querySelector("#solo-t-drag").onclick = () => doTwist(true);
      tPanel.querySelector("#solo-t-dem").onclick = () => doTwist(false);
      root.appendChild(tPanel);

      // 4. Solo NPC Generator & Attack Roller
      const npcs = solo.npcTemplates || [];
      const nat = solo.npcAttackTable || { roles: [], rows: [] };
      const nPanel = el(`
        <div class="panel">
          <h3>⚔ Solo NPC &amp; Foe Generator</h3>
          <p class="stat-line">Quickly instantiate simple foes or roll their AI attacks.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div style="flex:1;min-width:140px">
              <label class="stat-line">Template</label><br>
              <select id="solo-n-tmpl" class="input" style="width:100%;margin-top:4px">
                ${npcs.map(n => `<option value="${n.name}">${n.name} (${n.hp} HP)</option>`).join("")}
              </select>
            </div>
            <div style="flex:2;min-width:180px">
              <label class="stat-line">Name / Custom Label</label><br>
              <div style="display:flex;gap:4px;margin-top:4px">
                <input type="text" id="solo-n-name" class="input" placeholder="e.g. Deepfall Goblin Scout" style="flex:1">
                <button type="button" class="btn step" id="solo-n-gen" title="Roll random D20 NPC name">🎲</button>
              </div>
            </div>
          </div>
          <button class="btn secondary block" id="solo-n-add">⚡ Add to Combat Tracker</button>
          
          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
            <b>🎲 NPC Attack Table AI Roller</b>
            <p class="stat-line" style="margin:2px 0 8px 0">Select a combat role to roll their D6 action turn:</p>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <select id="solo-n-role" class="input" style="flex:1;min-width:160px">
                ${(nat.roles || []).map(r => `<option value="${r}">${r}</option>`).join("")}
              </select>
              <button class="btn" id="solo-n-atk">Roll NPC Attack (D6)</button>
            </div>
            <div id="solo-n-out" style="margin-top:10px"></div>
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

      nPanel.querySelector("#solo-n-add").onclick = () => {
        const tmplName = nPanel.querySelector("#solo-n-tmpl").value;
        const tmpl = npcs.find(x => x.name === tmplName) || npcs[0];
        const custom = nPanel.querySelector("#solo-n-name").value.trim();
        const foeName = custom || `Solo ${tmpl.name}`;
        
        Combat.mutate(st => st.combatants.push({
          id: uid(), name: foeName, kind: "npc", init: null, done: false,
          hp: tmpl.hp, maxHp: tmpl.hp, armor: tmpl.armor || 0, notes: `${tmpl.name} template (${tmpl.damage})`
        }));
        showToast(`Added "${foeName}" to the Combat Tracker!`, "success");
      };

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
          <div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid var(--accent)">
            <p class="stat-line" style="margin:0 0 4px 0">${esc(role)} · Rolled ${r}</p>
            <p style="font-size:1.15rem;margin:0;font-weight:bold">${esc(actionText)}</p>
          </div>`;
      };
      root.appendChild(nPanel);

      const jm = (DB.journeyMishaps || []);
      const shifts = ["🌅 Morning", "☀️ Day", "🌆 Evening", "🌙 Night"];
      // Roll on the D6 journey mishap table → { r, effect }.
      const rollMishap = () => { const r = Dice.d(jm.length || 6); const row = jm.find((x) => x.d6 === r) || jm[r - 1] || { effect: "—" }; return { r, effect: row.effect }; };
      const outBox = (color, html) => `<div style="padding:10px;background:var(--bg);border-radius:6px;border-left:4px solid ${color};margin-top:8px">${html}</div>`;

      const jPanel = el(`<div class="panel" style="margin-top:12px;border-left:4px solid var(--ok)">
        <h3>🌲 Wilderness Journeys &amp; Travel Reference</h3>
      </div>`);

      // ⏱️ Shifts — random shift-of-day roller
      const shiftSec = el(`<div style="margin-bottom:10px"><p class="stat-line" style="margin:0"><b>⏱️ Shifts:</b> Morning, Day, Evening, Night (~6h each). Travel speed: 1 node/hex per shift.</p></div>`);
      const shiftBtn = el(`<button class="btn ghost" style="margin-top:6px">🎲 Random shift (D4)</button>`);
      const shiftOut = el(`<div></div>`);
      shiftBtn.onclick = () => { const r = Dice.d(4); shiftOut.innerHTML = outBox("var(--accent)", `<p class="stat-line" style="margin:0 0 4px 0">Rolled ${r}</p><p style="font-size:1.3rem;font-weight:bold;margin:0">${esc(shifts[r - 1])}</p>`); };
      shiftSec.append(shiftBtn, shiftOut);
      jPanel.appendChild(shiftSec);

      // ⛺ Camp & Rest — Bushcraft roll; failure auto-rolls the mishap table
      const campSec = el(`<div style="margin-bottom:10px;border-top:1px solid var(--border);padding-top:10px"><p class="stat-line" style="margin:0"><b>⛺ Camp &amp; Rest:</b> Roll Bushcraft. Success lets the party rest (Shift rest = full HP/WP). Failure = Journey Mishap.</p></div>`);
      const campRow = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="stat-line">Bushcraft ≤</span></div>`);
      const campSkill = el(`<input type="number" class="input" style="width:64px" value="10" min="1" max="18" title="your Bushcraft level">`);
      const campBtn = el(`<button class="btn">🎲 Roll Bushcraft</button>`);
      const campOut = el(`<div></div>`);
      campRow.append(campSkill, campBtn);
      campBtn.onclick = () => {
        const lvl = Math.max(1, Math.min(20, parseInt(campSkill.value, 10) || 10));
        const r = Dice.d(20), dragon = r === 1, demon = r === 20, ok = r <= lvl;
        let html = `<p class="outcome ${ok ? "ok" : "bad"}" style="margin:0">${dragon ? "🐉 Dragon — " : demon ? "👹 Demon — " : ""}${r} vs ${lvl} — ${ok ? "Camp made! The party may take a Shift rest (full HP/WP)." : "Failed to make camp — roll on the Journey Mishap Table:"}</p>`;
        if (!ok) { const mp = rollMishap(); html += `<p class="stat-line" style="margin:8px 0 0 0;border-left:3px solid var(--bad);padding-left:8px"><b>Mishap (D6: ${mp.r})</b> — ${esc(mp.effect)}</p>`; }
        campOut.innerHTML = outBox(ok ? "var(--ok)" : "var(--bad)", html);
      };
      campSec.append(campRow, campOut);
      jPanel.appendChild(campSec);

      // 🍄 Foraging & Hunting — Bushcraft/Hunting roll; success gathers rations
      const forageSec = el(`<div style="margin-bottom:10px;border-top:1px solid var(--border);padding-top:10px"><p class="stat-line" style="margin:0"><b>🍄 Foraging &amp; Hunting:</b> Spend a shift making a Bushcraft or Hunting check for rations.</p></div>`);
      const forageRow = el(`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><span class="stat-line">Skill ≤</span></div>`);
      const forageSkill = el(`<input type="number" class="input" style="width:64px" value="10" min="1" max="18" title="your Bushcraft / Hunting level">`);
      const forageBtn = el(`<button class="btn">🎲 Forage / Hunt</button>`);
      const forageOut = el(`<div></div>`);
      forageRow.append(forageSkill, forageBtn);
      forageBtn.onclick = () => {
        const lvl = Math.max(1, Math.min(20, parseInt(forageSkill.value, 10) || 10));
        const r = Dice.d(20), dragon = r === 1, demon = r === 20, ok = r <= lvl;
        let html;
        if (ok) { const rations = Dice.roll("D6") + (dragon ? Dice.roll("D6") : 0); html = `<p class="outcome ok" style="margin:0">${dragon ? "🐉 Dragon — bumper haul! " : ""}${r} vs ${lvl} — found <b>${rations}</b> ration${rations === 1 ? "" : "s"}.</p>`; }
        else { html = `<p class="outcome bad" style="margin:0">${demon ? "👹 Demon — " : ""}${r} vs ${lvl} — no food found this shift.</p>`; }
        forageOut.innerHTML = outBox(ok ? "var(--ok)" : "var(--bad)", html);
      };
      forageSec.append(forageRow, forageOut);
      jPanel.appendChild(forageSec);

      // 🎲 Journey Mishap Table (D6) — roll & show the result
      const mishapSec = el(`<div style="border-top:1px solid var(--border);padding-top:10px"></div>`);
      const mishapBtn = el(`<button class="btn" style="background:var(--bad);color:#fff">🎲 Roll Journey Mishap (D6)</button>`);
      const mishapOut = el(`<div></div>`);
      mishapBtn.onclick = () => { const mp = rollMishap(); mishapOut.innerHTML = outBox("var(--bad)", `<p class="stat-line" style="margin:0 0 4px 0">Rolled ${mp.r}</p><p style="font-size:1.2rem;font-weight:bold;margin:0;color:var(--bad)">${esc(mp.effect)}</p>`); };
      mishapSec.append(mishapBtn, mishapOut);
      jPanel.appendChild(mishapSec);

      root.appendChild(jPanel);

      return root;
    }
  };

