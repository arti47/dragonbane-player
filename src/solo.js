/* solo.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { compassRose, dayDial, emblem, illo, oracleSeal } from './graphics.js';
import { $, DB, Dice, el, esc, helpBox, sectionTitle, uid } from './core.js';
import { confirmModal, modal, showToast, showUndoToast } from './ui.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { applyInvoluntaryConditionTo, effHpMax, effWpMax, equippedArmor } from './derived.js';
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
      shared.onclick = () => { m.close(); this.setHero(h.id); Router.go("solo"); };
      copy.onclick = () => { m.close(); const c = this.soloCopy(h); this.setHero(c.id); showToast(`Solo copy created: ${c.identity.name}.`, "success"); Router.go("solo"); };
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
    view() {
      const solo = typeof DRAGONBANE_SOLO !== "undefined" ? DRAGONBANE_SOLO : null;
      const root = el(`<div></div>`);
      root.appendChild(el(sectionTitle("Solo Assistant")));
      const help = root.appendChild(helpBox("Solo Assistant", [
        "Turn on <b>Solo Mode</b> (below or in About) to unlock solo heroic abilities at creation.",
        "<b>🎲 Rolling as</b>: pick a hero → a vitals strip (HP/WP, Open sheet, quick rests, 🏅 Mission +5) appears and journey/skill rolls use their sheet + full dice engine.",
        "<b>📓 Journal</b>: set your current scene, and tap <b>＋ Log</b> on any roll result to save story beats (persisted per hero).",
        "<b>Fortune Chart</b>: set a likelihood + question type → <b>Roll Oracle</b> for a yes/no-style answer.",
        "<b>NPC generator</b>: build a foe, then <b>⚔ Fight it</b> to drop it + your hero into Combat and jump there.",
        "<b>Journey Tools</b>: random shift, Camp &amp; Forage rolls, and Journey Mishap with its follow-up WIL/CON check."
      ]));
      // Newcomer aids: one-tap tutorial link + the solo loop step-by-step.
      const tut = el(`<button class="btn ghost block u-mb25">📘 New to solo RPGs? Read How to Play</button>`);
      tut.onclick = () => { Router.go("rules"); setTimeout(() => { const a = document.querySelector("details.rule-accordion[data-cat='howtoplay']"); if (a) { a.open = true; a.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 60); };
      help.steps.appendChild(tut); // one "getting started" dialog: help + tutorial + loop
      const loop = el(`<details class="help-acc" style="background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:6px 12px;margin-bottom:10px"><summary style="cursor:pointer;font-weight:600;color:var(--accent-ink)">🧭 The solo loop — what to do each scene</summary></details>`);
      const loopUl = document.createElement("ul"); loopUl.className = "stat-line"; loopUl.style.cssText = "margin:8px 0 4px;padding-left:20px;line-height:1.55";
      [
        "① <b>Set the scene</b> in the Journal below — where you are and your goal.",
        "② <b>Ask the Oracle</b> a yes/no question to decide what happens; tap <b>＋ Log</b> to record it.",
        "③ <b>Act</b>: open your hero's sheet and tap a skill to roll it (or use the Journey / Combat tools).",
        "④ On a failure, <b>Push</b> the roll or use <b>🎲 Fail forward</b> to keep the story moving.",
        "⑤ Track open questions as <b>🧵 Threads</b>; when the mission is done, tap <b>🏅 Mission +5</b> to advance."
      ].forEach((s) => { const li = document.createElement("li"); li.style.margin = "3px 0"; li.innerHTML = s; loopUl.appendChild(li); });
      loop.appendChild(loopUl); help.steps.appendChild(loop);
      if (!solo) {
        root.appendChild(el(`<div class="panel"><p class="stat-line">Solo rules library not loaded.</p></div>`));
        return root;
      }

      // Play mode switch banner
      const sm = Settings.soloMode();
      // One compact context bar: solo mode status + who you're rolling as.
      const banner = el(`
        <div class="panel solo-ctx${sm ? " is-on" : ""}">
          <div class="solo-ctx-row">
            <div class="solo-ctx-main">
              <b>🧭 Solo Campaign Mode: <span style="color:${sm ? "var(--ok)" : "var(--muted)"}">${sm ? "Active" : "Standard"}</span></b>
              <span class="stat-line solo-ctx-note">When active, unlocks solo heroic abilities (Army of One, Sole Survivor) in character creation.</span>
            </div>
          </div>
        </div>`);
      const bBtn = el(`<button class="toggle ${sm ? "on" : ""} solo-ctx-btn" role="switch" aria-checked="${sm}" aria-label="${sm ? "Disable Solo Mode" : "Enable Solo Mode"}" title="${sm ? "Disable Solo Mode" : "Enable Solo Mode"}"><span class="knob"></span></button>`);
      bBtn.onclick = () => { Settings.set("soloMode", !sm); Router.go("solo"); };
      banner.querySelector(".solo-ctx-row").appendChild(bBtn);
      root.appendChild(banner);

      // Link a hero so the journey/skill rolls use their real sheet values and
      // the full dice engine (conditions, boons/banes, pushing, advancement).
      const heroes = Store.list();
      const linked = this.linkedHero();
      const heroPanel = el(`<div class="solo-ctx-row solo-ctx-hero">
        <div class="solo-ctx-main"><b>🎲 Rolling as</b><span class="stat-line solo-ctx-note">${linked ? "Skill/attribute rolls use " + esc(linked.identity.name) + "’s sheet." : "Pick a hero to auto-fill skills &amp; attributes, or roll manually below."}</span></div>
      </div>`);
      const heroSel = el(`<select class="input solo-ctx-sel"></select>`);
      heroSel.appendChild(el(`<option value="">— No hero (type values) —</option>`));
      heroes.forEach((h) => { const o = el(`<option value="${esc(h.id)}">${esc(h.identity.name)}</option>`); if (linked && h.id === linked.id) o.selected = true; heroSel.appendChild(o); });
      heroSel.onchange = () => {
        const h = heroSel.value ? Store.get(heroSel.value) : null;
        if (!h || !h.campaignId || h.soloCopy) { this.setHero(heroSel.value || null); Router.go("solo"); return; }
        this.askPartyHero(h, () => { heroSel.value = linked ? linked.id : ""; });
      };
      heroPanel.appendChild(heroSel);
      banner.appendChild(heroPanel);

      // Linked-hero strip: glanceable vitals + one-tap sheet/rest/mission.
      if (linked) {
        const strip = el(`<div class="panel u-row-wrap"></div>`);
        const vit = el(`<span style="font-weight:bold;flex:1;min-width:150px"></span>`);
        const upd = () => { const c = Store.get(linked.id); if (c) vit.innerHTML = `❤️ ${c.state.hp}/${effHpMax(c)} · ⚡ ${c.state.wp}/${effWpMax(c)}`; };
        upd();
        const openB = el(`<button class="btn ghost">Open sheet</button>`); openB.onclick = () => Sheet.open(linked.id);
        const rr = el(`<button class="btn ghost" title="Round rest: +D6 WP">Round</button>`);
        rr.onclick = () => { const w = Dice.roll("D6"); Store.update(linked.id, (ch) => { ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + w); }); upd(); showToast(`Round rest: +${w} WP.`, "success"); };
        const sr = el(`<button class="btn ghost" title="Stretch rest: +D6 HP/WP">Stretch</button>`);
        sr.onclick = () => { const h = Dice.roll("D6"), w = Dice.roll("D6"); Store.update(linked.id, (ch) => { ch.state.hp = Math.min(effHpMax(ch), ch.state.hp + h); ch.state.wp = Math.min(effWpMax(ch), ch.state.wp + w); }); upd(); showToast(`Stretch rest: +${h} HP, +${w} WP.`, "success"); };
        const shr = el(`<button class="btn ghost" title="Shift rest: full HP/WP, clear conditions">Shift</button>`);
        shr.onclick = () => { Store.update(linked.id, (ch) => { ch.state.hp = effHpMax(ch); ch.state.wp = effWpMax(ch); ch.state.conditions = {}; }); upd(); showToast("Shift rest: full HP/WP, conditions cleared.", "success"); };
        const mission = el(`<button class="btn ghost u-bd-accent">🏅 Mission +5</button>`);
        mission.onclick = () => { Sheet.open(linked.id); Sheet.soloMissionMarks(); };
        strip.append(vit, openB, rr, sr, shr, mission);
        root.appendChild(strip);
      }

      // Tabs: Play · Prompts · Journey · Foes (last tab remembered) — mirrors the sheet.
      const TABS = [["play", "Play"], ["prompts", "Prompts"], ["journey", "Journey"], ["foes", "Foes"]];
      let cur = "play"; try { cur = localStorage.getItem("dragonbane.soloTab") || "play"; } catch (_) {}
      if (!TABS.some(([k]) => k === cur)) cur = "play";
      const panes = {};
      const tabBar = el(`<div class="tabs" role="tablist" aria-label="Solo tools"></div>`);
      const selectTab = (k, focus) => {
        cur = k; try { localStorage.setItem("dragonbane.soloTab", k); } catch (_) {}
        tabBar.querySelectorAll(".tab").forEach((b) => { const on = b.dataset.tab === k; b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
        Object.entries(panes).forEach(([pk, pn]) => { pn.hidden = pk !== k; });
        if (selectTab._ready) { panes[k].classList.remove("pane-in"); void panes[k].offsetWidth; panes[k].classList.add("pane-in"); }
        selectTab._ready = true;
      };
      TABS.forEach(([k, label]) => {
        panes[k] = el(`<div class="tab-panel${k === "play" ? " two-col" : ""}" role="tabpanel" id="solo-pane-${k}" aria-labelledby="solo-tab-${k}" data-tab="${k}"></div>`);
        const b = el(`<button type="button" class="tab" role="tab" id="solo-tab-${k}" data-tab="${k}" aria-controls="solo-pane-${k}">${label}</button>`);
        b.onclick = () => selectTab(k);
        tabBar.appendChild(b);
      });
      tabBar.onkeydown = (e) => {
        const i = TABS.findIndex(([k]) => k === cur);
        if (e.key === "ArrowRight") { e.preventDefault(); selectTab(TABS[(i + 1) % TABS.length][0], true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); selectTab(TABS[(i + TABS.length - 1) % TABS.length][0], true); }
      };
      root.appendChild(tabBar);
      TABS.forEach(([k]) => root.appendChild(panes[k]));
      selectTab(cur);

      // Solo journal — persisted scene + running log with ＋ Log on every result.
      const journalPanel = el(`<div class="panel"><h3>📓 Solo Journal &amp; Scene</h3></div>`);
      const sceneWrap = el(`<div class="form-field"><label>Current scene / next step</label></div>`);
      const sceneIn = el(`<textarea rows="2" placeholder="Where are you, and what's the immediate goal?"></textarea>`);
      sceneIn.value = this.loadJournal().scene || "";
      sceneIn.oninput = () => { const j = this.loadJournal(); j.scene = sceneIn.value; this.saveJournal(j); };
      sceneWrap.appendChild(sceneIn); journalPanel.appendChild(sceneWrap);
      const logList = el(`<div class="j-log" style="display:flex;flex-direction:column;gap:4px;margin-top:8px"></div>`);
      const renderLog = () => {
        const j = this.loadJournal(); logList.innerHTML = "";
        if (!j.entries.length) { logList.appendChild(el(`<div class="empty-illo">${illo("quill")}</div>`)); logList.appendChild(el(`<p class="stat-line empty-note">No log yet — tap <b>＋ Log</b> on any roll result, or add a note below.</p>`)); return; }
        j.entries.slice().reverse().forEach((e, ri) => {
          const idx = j.entries.length - 1 - ri;
          const when = e.ts ? new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          const row = el(`<div class="j-entry" style="display:flex;gap:6px;align-items:flex-start;padding:4px 6px;background:var(--bg);border-radius:var(--r-sm)"><span class="stat-line" style="min-width:46px">${esc(when)}</span><span class="u-f1">${esc(e.text)}</span></div>`);
          const x = el(`<button class="step rm" aria-label="Delete entry">✕</button>`);
          x.onclick = () => { const jj = this.loadJournal(); const gone = jj.entries.splice(idx, 1)[0]; this.saveJournal(jj); renderLog(); if (gone) showUndoToast("Removed log entry", () => { const j2 = this.loadJournal(); j2.entries.splice(idx, 0, gone); this.saveJournal(j2); renderLog(); }); };
          row.appendChild(x); logList.appendChild(row);
        });
      };
      renderLog();
      const addLog = (text) => { if (!text) return; const j = this.loadJournal(); j.entries.push({ ts: Date.now(), text }); this.saveJournal(j); renderLog(); showToast("Logged to journal.", "success"); };
      const addRow = el(`<div class="inv-add"></div>`);
      const noteIn = el(`<input type="text" placeholder="Add a journal note…">`);
      const noteBtn = el(`<button class="btn secondary">Log</button>`);
      const doNote = () => { const t = noteIn.value.trim(); if (!t) return; noteIn.value = ""; addLog(t); };
      noteBtn.onclick = doNote; noteIn.onkeydown = (e) => { if (e.key === "Enter") doNote(); };
      addRow.append(noteIn, noteBtn);
      const clearB = el(`<button class="btn ghost" style="margin-top:6px;color:var(--bad)">Clear log</button>`);
      clearB.onclick = async () => { if (await confirmModal("Clear the journal log? Scene, threads and NPCs are kept.", { title: "Clear log", okText: "Clear", danger: true })) { const j = this.loadJournal(); j.entries = []; this.saveJournal(j); renderLog(); } };
      journalPanel.append(logList, addRow, clearB);

      // Plot threads (open questions) — add / toggle-resolved / delete.
      const threadsList = el(`<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px"></div>`);
      const renderThreads = () => {
        const j = this.loadJournal(); threadsList.innerHTML = "";
        if (!j.threads.length) { threadsList.appendChild(el(`<div class="empty-illo">${illo("spool")}</div>`)); threadsList.appendChild(el(`<p class="stat-line empty-note">No open threads.</p>`)); return; }
        j.threads.forEach((th) => {
          const row = el(`<div style="display:flex;gap:6px;align-items:center;padding:4px 6px;background:var(--bg);border-radius:var(--r-sm)"></div>`);
          const tog = el(`<button class="skill-chip ${th.done ? "picked" : ""}" title="toggle resolved" aria-pressed="${th.done}">${th.done ? "✓" : "○"}</button>`);
          tog.onclick = () => { const jj = this.loadJournal(); const x = jj.threads.find((y) => y.id === th.id); if (x) x.done = !x.done; this.saveJournal(jj); renderThreads(); };
          const txt = el(`<span style="flex:1;${th.done ? "text-decoration:line-through;opacity:0.6" : ""}">${esc(th.text)}</span>`);
          const rm = el(`<button class="step rm" aria-label="Delete thread">✕</button>`);
          rm.onclick = () => { const jj = this.loadJournal(); jj.threads = jj.threads.filter((y) => y.id !== th.id); this.saveJournal(jj); renderThreads(); };
          row.append(tog, txt, rm); threadsList.appendChild(row);
        });
      };
      renderThreads();
      const addThread = (text) => { if (!text) return; const j = this.loadJournal(); j.threads.push({ id: uid(), text, done: false }); this.saveJournal(j); renderThreads(); showToast("Added thread.", "success"); };
      const thRow = el(`<div class="inv-add"></div>`);
      const thIn = el(`<input type="text" placeholder="Add a plot thread / open question…">`);
      const thBtn = el(`<button class="btn secondary">Add</button>`);
      const doTh = () => { const t = thIn.value.trim(); if (!t) return; thIn.value = ""; addThread(t); };
      thBtn.onclick = doTh; thIn.onkeydown = (e) => { if (e.key === "Enter") doTh(); };
      thRow.append(thIn, thBtn);
      const thDet = el(`<details class="u-mt25"><summary style="cursor:pointer;font-weight:600">🧵 Threads</summary></details>`);
      thDet.append(threadsList, thRow);
      journalPanel.appendChild(thDet);

      // NPCs met — a lightweight roster (name + note).
      const npcsList = el(`<div style="display:flex;flex-direction:column;gap:4px;margin-top:6px"></div>`);
      const renderNpcs = () => {
        const j = this.loadJournal(); npcsList.innerHTML = "";
        if (!j.npcs.length) { npcsList.appendChild(el(`<div class="empty-illo">${illo("frame")}</div>`)); npcsList.appendChild(el(`<p class="stat-line empty-note">No NPCs recorded.</p>`)); return; }
        j.npcs.forEach((n) => {
          const row = el(`<div style="display:flex;gap:6px;align-items:center;padding:4px 6px;background:var(--bg);border-radius:var(--r-sm)"><span class="u-f1"><b>${esc(n.name)}</b>${n.note ? ` — ${esc(n.note)}` : ""}</span></div>`);
          const rm = el(`<button class="step rm" aria-label="Delete NPC">✕</button>`);
          rm.onclick = () => { const jj = this.loadJournal(); jj.npcs = jj.npcs.filter((y) => y.id !== n.id); this.saveJournal(jj); renderNpcs(); };
          row.appendChild(rm); npcsList.appendChild(row);
        });
      };
      renderNpcs();
      const addNpc = (name, note) => { name = (name || "").trim(); if (!name) return; const j = this.loadJournal(); j.npcs.push({ id: uid(), name, note: (note || "").trim() }); this.saveJournal(j); renderNpcs(); showToast("Recorded NPC.", "success"); };
      const npcRow = el(`<div class="inv-add"></div>`);
      const npcNameIn = el(`<input type="text" placeholder="NPC name…">`);
      const npcNoteIn = el(`<input type="text" placeholder="note (optional)…">`);
      const npcBtn = el(`<button class="btn secondary">Add</button>`);
      const doNpcRow = () => { if (!npcNameIn.value.trim()) return; addNpc(npcNameIn.value, npcNoteIn.value); npcNameIn.value = ""; npcNoteIn.value = ""; };
      npcBtn.onclick = doNpcRow; npcNameIn.onkeydown = (e) => { if (e.key === "Enter") doNpcRow(); };
      npcRow.append(npcNameIn, npcNoteIn, npcBtn);
      const npcDet = el(`<details class="u-mt2"><summary style="cursor:pointer;font-weight:600">👥 NPCs met</summary></details>`);
      npcDet.append(npcsList, npcRow);
      journalPanel.appendChild(npcDet);
      panes.play.appendChild(journalPanel);

      // ＋ Log / ＋ Thread buttons appended to every roll result.
      const resultBtns = (getText) => {
        const wrap = el(`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"></div>`);
        const t = () => (typeof getText === "function" ? getText() : getText);
        const lb = el(`<button class="btn ghost" style="font-size:var(--fs-sm)">＋ Log</button>`); lb.onclick = () => addLog(t());
        const tb = el(`<button class="btn ghost" style="font-size:var(--fs-sm)">＋ Thread</button>`); tb.onclick = () => addThread(t());
        wrap.append(lb, tb); return wrap;
      };

      // 1. Fortune Chart Oracle
      const f = solo.fortune;
      const fPanel = el(`
        <div class="panel">
          <h3>🔮 Fortune Chart (Oracle)</h3>
          <p class="stat-line">Ask a question, set likelihood, and leave the answer to fate.</p>
          <div class="field-row" style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
            <div class="u-f1-140">
              <label class="stat-line">Likelihood</label><br>
              <select id="solo-f-like" class="input u-w100-mt1">
                ${f.likelihoods.map(l => `<option value="${l.key}">${l.label} (${l.roll})</option>`).join("")}
              </select>
            </div>
            <div class="u-f1-140">
              <label class="stat-line">Question / Column</label><br>
              <select id="solo-f-col" class="input u-w100-mt1">
                ${f.columns.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join("")}
              </select>
            </div>
          </div>
          <button class="btn block" id="solo-f-roll">Roll Oracle</button>
          <div class="u-mt3" id="solo-f-out"></div>
        </div>`);

      // Remember the last-used likelihood + question column across visits.
      let oPref = {}; try { oPref = JSON.parse(localStorage.getItem("dragonbane.soloOraclePref")) || {}; } catch (_) {}
      if (oPref.like) fPanel.querySelector("#solo-f-like").value = oPref.like;
      if (oPref.col) fPanel.querySelector("#solo-f-col").value = oPref.col;
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
        fPanel.querySelector("#solo-f-out").appendChild(resultBtns(`Oracle (${colKey}, ${likeKey}): ${ans}${twist ? " [twist]" : ""}`));
      };
      panes.play.insertBefore(fPanel, panes.play.firstChild);

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
        iPanel.querySelector("#solo-i-out").appendChild(resultBtns(`Inspiration: ${plain}`));
      };
      iPanel.querySelector("#solo-i-all").onclick = () => doInsp("all");
      iPanel.querySelector("#solo-i-act").onclick = () => doInsp("act");
      iPanel.querySelector("#solo-i-att").onclick = () => doInsp("att");
      iPanel.querySelector("#solo-i-thg").onclick = () => doInsp("thg");
      panes.prompts.appendChild(iPanel);

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
        tPanel.querySelector("#solo-t-out").appendChild(resultBtns(`${isDrag ? "Dragon" : "Demon"} twist: ${txt}`));
      };
      tPanel.querySelector("#solo-t-drag").onclick = () => doTwist(true);
      tPanel.querySelector("#solo-t-dem").onclick = () => doTwist(false);
      panes.prompts.appendChild(tPanel);

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
      // ⚔ One-tap fight: drop the foe (and the linked hero, if not already in the
      // tracker) into Combat and jump straight to the Combat tab.
      nPanel.querySelector("#solo-n-fight").onclick = () => {
        const foe = buildFoe();
        Combat.mutate(st => {
          st.combatants.push(foe);
          if (linked && !st.combatants.some(c => c.charId === linked.id)) {
            const h = Store.get(linked.id); const arm = equippedArmor(h);
            st.combatants.push({ id: uid(), name: h.identity.name, kind: "hero", charId: h.id, init: null, done: false, hp: h.state.hp, maxHp: effHpMax(h), wp: h.state.wp, maxWp: effWpMax(h), armor: arm ? arm.rating : 0 });
          }
        });
        showToast(`Fight on — ${foe.name}${linked ? " vs " + linked.identity.name : ""}!`, "success");
        Router.go("party");
      };
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
        nPanel.querySelector("#solo-n-out").appendChild(resultBtns(`NPC ${role}: ${actionText}`));
      };
      panes.foes.appendChild(nPanel);

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
        box.appendChild(resultBtns(`Journey Mishap (D6:${mp.r}): ${mp.effect}`));
        return box;
      };

      const jPanel = el(`<div class="panel has-rose" style="margin-top:12px;border-left:4px solid var(--ok)">
        <h3>🌲 Wilderness Journeys &amp; Travel Tools</h3>
      </div>`);

      // ⏱️ Shifts — random shift-of-day roller
      const shiftSec = el(`<div class="u-mb25"><p class="stat-line u-m0"><b>⏱️ Shifts:</b> Morning, Day, Evening, Night (~6h each). Travel speed: 1 node/hex per shift.</p></div>`);
      const shiftBtn = el(`<button class="btn ghost u-mt15">🎲 Random shift (D4)</button>`);
      const shiftOut = el(`<div></div>`);
      shiftBtn.onclick = () => { const r = Dice.d(4); shiftOut.innerHTML = outBox("var(--accent)", `${dayDial(r - 1)}<p class="stat-line u-mb1only">Rolled ${r}</p><p style="font-size:var(--fs-xl);font-weight:bold;margin:0">${esc(shifts[r - 1])}</p>`); shiftOut.appendChild(resultBtns(`Shift: ${shifts[r - 1]}`)); };
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
        else box.appendChild(resultBtns("Camp made — party rests."));
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
          else box.appendChild(resultBtns("Camp made — party rests."));
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
        if (ok) { const rations = Dice.roll("D6") + (dragon ? Dice.roll("D6") : 0); forageOut.innerHTML = outBox("var(--ok)", `<p class="outcome ok u-m0">${dragon ? "🐉 Dragon — bumper haul! " : ""}Success — found <b>${rations}</b> ration${rations === 1 ? "" : "s"}.</p>`); forageOut.appendChild(resultBtns(`Foraged ${rations} ration${rations === 1 ? "" : "s"}.`)); }
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
          if (ok) { const rations = Dice.roll("D6") + (dragon ? Dice.roll("D6") : 0); forageOut.innerHTML = outBox("var(--ok)", `<p class="outcome ok u-m0">${dragon ? "🐉 Dragon — bumper haul! " : ""}${r} vs ${lvl} — found <b>${rations}</b> ration${rations === 1 ? "" : "s"}.</p>`); forageOut.appendChild(resultBtns(`Foraged ${rations} ration${rations === 1 ? "" : "s"}.`)); }
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

      panes.journey.appendChild(jPanel);

      return root;
    }
  };

