/* wizard.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { SHIELD_BG, crest, d6Face, emblem, forgedArt } from './graphics.js';
import { $, CORE_SCHOOLS, DB, Dice, el, esc, mountScreen, sectionTitle, uid } from './core.js';
import { confirmModal, showToast } from './ui.js';
import { Calc, buildSkills, findHeroicAbility, parseGear } from './rules.js';
import { Magic, Settings } from './settings.js';
import { Store } from './store.js';
import { Sheet } from './sheet.js';
import { Router } from './router.js';

export const Wizard = {
    s: null,
    start() {
      this.s = {
        step: 0,
        rolled: null,            // six rolled attribute values
        assign: { STR: null, CON: null, AGL: null, INT: null, WIL: null, CHA: null }, // attr -> rolled index
        kin: null,
        profession: null,
        mageSchool: null,        // for mages: "animism" | "elementalism" | "mentalism"
        age: null,
        trained: new Set(),
        heroicPicks: [],
        spells: { tricks: [], known: [] }, // mage only
        gearRow: null,
        identity: { name: "", appearance: "", weakness: "", memento: "" }
      };
      this.render();
    },
    // Quick hero: a random but fully legal character in one tap. It drives the same
    // wizard state and the same validate()/build() as the step-by-step wizard, so it
    // obeys every creation rule (4D6 drop lowest, age skill count, ≥6 profession
    // skills, starting heroic ability / 3 tricks + 3 rank-1 spells, a gear row).
    quick() {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      this.start();
      const s = this.s;
      s.kin = pick(DB.kin || []).key;
      const prof = pick(DB.professions || []); s.profession = prof.key;
      if (prof.key === "mage") s.mageSchool = pick(Magic.mageSchools())[0];
      s.age = pick(DB.ages || []).key;
      // Attributes: roll six, put the best in the profession's key attribute, then CON, AGL, WIL, INT, STR, CHA.
      s.rolledDice = []; s.rolled = [0, 0, 0, 0, 0, 0].map(() => { const v = Dice.attribute(); s.rolledDice.push(Dice.lastAttr.slice()); return v; });
      const order = [prof.keyAttribute, "CON", "AGL", "WIL", "INT", "STR", "CHA"].filter((k, i, a) => k && a.indexOf(k) === i);
      const byVal = s.rolled.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);
      order.forEach((k, i) => { if (byVal[i]) s.assign[k] = byVal[i][1]; });
      // Trained skills: exactly the age total, at least 6 from the profession (a mage's school always).
      const total = this.ageObj().trainedSkills;
      const profList = this.professionSkillList();
      const school = s.mageSchool ? Magic.cap(s.mageSchool) : null;
      if (school) s.trained.add(school);
      shuffle(profList.filter((n) => n !== school)).forEach((n) => { if ([...s.trained].filter((x) => profList.includes(x)).length < 6) s.trained.add(n); });
      shuffle((DB.skills || []).filter((sk) => sk.kind !== "magic" && !s.trained.has(sk.name)).map((sk) => sk.name)).forEach((n) => { if (s.trained.size < total) s.trained.add(n); });
      // Heroic ability (not mages): the profession's, plus a solo pick when Solo is on.
      if (prof.key !== "mage") {
        const pool = [...prof.heroicAbilities];
        if (Settings.soloMode() && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.heroicAbilities) DRAGONBANE_SOLO.heroicAbilities.forEach((h) => { if (!pool.includes(h.name)) pool.push(h.name); });
        s.heroicPicks = [pick(prof.heroicAbilities)];
        shuffle(pool.filter((n) => n !== s.heroicPicks[0])).forEach((n) => { if (s.heroicPicks.length < this.heroicCap()) s.heroicPicks.push(n); });
      }
      // Magic: 3 tricks + 3 rank-1 spells from the school (or General).
      if (this.isCaster()) {
        const sp = Magic.poolFor(s.mageSchool), gen = Magic.corePool("general");
        const tricks = [...(sp.tricks || []).map((x) => ({ ...x, src: s.mageSchool })), ...(gen.tricks || []).map((x) => ({ ...x, src: "general" }))];
        const rank1 = [...(sp.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: s.mageSchool })), ...(gen.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: "general" }))];
        s.spells.tricks = shuffle(tricks).slice(0, 3).map((x) => ({ name: x.name, rank: 0, school: x.src, text: x.text }));
        s.spells.known = shuffle(rank1).slice(0, 3).map((x) => ({ name: x.name, rank: 1, school: x.src, text: x.text }));
      }
      s.gearRow = (prof.gear || []).length ? Math.floor(Math.random() * prof.gear.length) : null;
      // Name + flavour from the random tables.
      if (DB.names && DB.names.kin) {
        const names = DB.names.kin[s.kin] || DB.names.kin.human || ["Hero"];
        const nick = (DB.names.nicknames && DB.names.nicknames[s.profession]) || [];
        s.identity.name = pick(names) + (nick.length && Math.random() < 0.65 ? ` "${pick(nick)}"` : "");
      } else s.identity.name = "Hero";
      ["appearance", "weakness", "memento"].forEach((k) => { const l = DB.flavor && DB.flavor[k]; if (l && l.length) s.identity[k] = pick(l); });
      // Every step must pass the wizard's own validation; otherwise finish by hand.
      const bad = this.steps().find((st) => this.validate(st));
      if (bad) { s.step = this.steps().indexOf(bad); this.render(); showToast("Finish this step to complete your hero.", "warn"); return null; }
      const c = this.build();
      const list = Store.list(); list.push(c); Store.save(list);
      Sheet.open(c.id);
      this.forged(c);
      return c;
    },
    // The ordered list of steps. Mages skip the heroic step; mages and
    // Harmonism-bards get a magic step.
    isMage() { return this.s.profession === "mage"; },
    isCaster() { return this.isMage() || (this.s.profession === "bard" && this.s.bardHarmonism); },
    steps() {
      return [
        "attributes", "kin", "profession", "age", "skills",
        ...(this.isMage() ? [] : ["heroic"]),
        ...(this.isCaster() ? ["magic"] : []),
        "gear", "details", "review"
      ];
    },
    prof() { return (DB.professions || []).find((p) => p.key === this.s.profession) || null; },
    kinObj() { return (DB.kin || []).find((k) => k.key === this.s.kin) || null; },
    ageObj() { return (DB.ages || []).find((a) => a.key === this.s.age) || null; },
    professionSkillList() {
      const p = this.prof(); if (!p) return [];
      if (p.key === "mage") {
        if (!this.s.mageSchool) return [];
        if (p.schools[this.s.mageSchool]) return p.schools[this.s.mageSchool]; // core schools
        return Magic.fallbackMageSkills(Magic.cap(this.s.mageSchool)); // Book of Magic schools (recommended set)
      }
      return p.skills;
    },
    // Final attribute scores (assigned values + age modifiers, capped 3-18).
    finalAttrs() {
      const a = {};
      const age = this.ageObj();
      Object.keys(this.s.assign).forEach((k) => {
        let v = this.s.rolled && this.s.assign[k] != null ? this.s.rolled[this.s.assign[k]] : 0;
        if (age && age.mods[k]) v += age.mods[k];
        a[k] = Math.max(3, Math.min(18, v));
      });
      return a;
    },

    render() {
      const step = this.steps()[this.s.step];
      const root = el(`<div></div>`);
      root.appendChild(el(`
        <div class="wiz-head">
          <button class="btn ghost wiz-x" id="wiz-cancel">✕</button>
          <div class="wiz-progress">Step ${this.s.step + 1} of ${this.steps().length} — ${this.stepTitle(step)}</div>
          <span class="wiz-art" aria-hidden="true">${this.stepArt(step)}</span>
        </div>`));
      const nSteps = this.steps().length;
      root.appendChild(el(`<div class="wiz-track" role="progressbar" aria-valuemin="1" aria-valuemax="${nSteps}" aria-valuenow="${this.s.step + 1}" aria-label="Wizard progress"><div class="wiz-bar"><i style="width:${((this.s.step + 1) / nSteps) * 100}%"></i></div><div class="wiz-dots">${this.steps().map((st, i) => `<span class="wiz-dot ${i < this.s.step ? "done" : i === this.s.step ? "cur" : ""}" title="${esc(this.stepTitle(st))}"></span>`).join("")}</div></div>`));
      root.appendChild(el(`<h2 class="wiz-q">${esc(this.question(step))}</h2>`));
      const bodyWrap = el(`<div id="wiz-body"></div>`);
      bodyWrap.appendChild(this["step_" + step]());
      root.appendChild(bodyWrap);

      const nav = el(`<div class="wiz-nav"></div>`);
      const sum = this.summaryLine();
      if (sum) nav.appendChild(el(`<div class="wiz-summary" aria-live="polite">${sum}</div>`));
      if (this.s.step > 0) { const b = el(`<button class="btn ghost">Back</button>`); b.onclick = () => { this.s.step--; this.render(); }; nav.appendChild(b); }
      const isLast = step === "review";
      const next = el(`<button class="btn">${isLast ? "Create hero" : "Next"}</button>`);
      next.onclick = () => { const err = this.validate(step); if (err) { showToast(err); return; } if (isLast) { this.save(); } else { this.s.step++; this.render(); } };
      nav.appendChild(next);
      root.appendChild(nav);

      mountScreen(root);
      root.querySelector("#wiz-cancel").onclick = async () => { if (await confirmModal("Discard this character?", { title: "Discard character", okText: "Discard", danger: true })) Router.go("home"); };
    },
    // Small emblem for the current step (decorative).
    stepArt(step) {
      const k = this.s.kin, p = this.s.profession;
      const map = { attributes: ["dice", "d6"], kin: ["kin", k || "human"], profession: ["prof", p || "artisan"], age: ["glyph", "hourglass"], skills: ["glyph", "scroll"],
        magic: ["school", this.s.school || "general"], heroic: ["glyph", "sword"], gear: ["glyph", "pack"], details: ["prof", "scholar"], review: ["glyph", "shield"] };
      const [set, key] = map[step] || ["glyph", "star"];
      return emblem(set, key, "emb wiz-emb") || emblem("glyph", "star", "emb wiz-emb");
    },
    // One-line live summary for the pinned nav: choices so far + computed vitals.
    summaryLine() {
      const bits = [];
      const k = this.kinObj && this.kinObj(), p = this.prof && this.prof(), a = this.ageObj();
      if (k) bits.push(esc(k.name)); if (p) bits.push(esc(p.name)); if (a) bits.push(esc(a.name));
      const assigned = this.s.rolled && Object.values(this.s.assign || {}).every((v) => v != null);
      if (assigned) {
        const f = this.finalAttrs();
        bits.push(`<b>HP ${f.CON}</b>`, `<b>WP ${f.WIL}</b>`);
        if (k) bits.push(`<b>Move ${(k.movement || 0) + Calc.movementMod(f.AGL)}</b>`);
      }
      return bits.join(" · ");
    },
    question(step) {
      return { attributes: "Roll your six attributes", kin: "What kin are you?", profession: "What is your calling?", age: "How old are you?",
        skills: "What have you trained?", magic: "Which magic do you know?", heroic: "What makes you heroic?",
        gear: "What do you carry?", details: "Who are you?", review: "Ready to adventure?" }[step] || "";
    },
    stepTitle(step) {
      return { attributes: "Attributes", kin: "Kin", profession: "Profession", age: "Age",
        skills: "Trained Skills", magic: "Magic", heroic: "Heroic Ability",
        gear: "Starting Gear", details: "Details", review: "Review" }[step];
    },

    /* ---- Step: Attributes ---- */
    step_attributes() {
      const wrap = el(`<div class="panel"></div>`);
      wrap.appendChild(el(`<p class="stat-line wiz-tip">4D6 six times, lowest die dropped. Tap a score, then an attribute. Age adjusts them later.</p>`));
      const rollBtn = el(`<button class="btn block" style="margin-bottom:14px">${this.s.rolled ? "Re-roll all" : "Roll attributes"}</button>`);
      const grid = el(`<div class="attr-grid${window._wizManual ? " manual" : ""}"></div>`);
      const renderGrid = () => {
        grid.innerHTML = "";
        if (!this.s.rolled) { grid.appendChild(el(`<p class="stat-line">Press “Roll attributes” to begin.</p>`)); return; }
        // Tap a rolled value, then tap an attribute to place it (tap a placed value
        // to return it). The dropdowns below stay as a fallback.
        const pickRow = el(`<div class="rolled-row">Rolled: ${this.s.rolled.map((v, i) => `<button type="button" class="tag roll-chip ${Object.values(this.s.assign).includes(i) ? "used" : ""} ${this._pick === i ? "picked" : ""}" data-i="${i}" aria-pressed="${this._pick === i ? "true" : "false"}">${v}</button>`).join("")}</div>`);
        pickRow.querySelectorAll(".roll-chip").forEach((b) => { b.onclick = () => { const i = +b.dataset.i; this._pick = this._pick === i ? null : i; renderGrid(); }; });
        grid.appendChild(pickRow);
        if (this.s.rolledDice && this.s.rolledDice.length === 6) grid.appendChild(el(`<div class="d6-groups" aria-hidden="true">${this.s.rolledDice.map((d, i) => `<span class="d6-group ${Object.values(this.s.assign).includes(i) ? "used" : ""}">${d.map((v, j) => d6Face(v, j === 0)).join("")}</span>`).join("")}</div>`));
        (DB.attributes || []).forEach((at) => {
          const row = el(`<div class="attr-row ${this._pick != null ? "droppable" : ""}"><label>${at.key} <span class="stat-line">${at.name}</span></label></div>`);
          const cur = this.s.assign[at.key];
          const slot = el(`<button type="button" class="attr-slot ${cur != null ? "filled" : ""}" aria-label="${at.key}: ${cur != null ? this.s.rolled[cur] : "empty"}">${cur != null ? this.s.rolled[cur] : "·"}</button>`);
          slot.onclick = () => {
            if (this._pick != null) {
              const from = Object.keys(this.s.assign).find((k) => this.s.assign[k] === this._pick);
              if (from) this.s.assign[from] = null;
              this.s.assign[at.key] = this._pick; this._pick = null;
            } else if (cur != null) { this.s.assign[at.key] = null; }
            renderGrid();
          };
          row.appendChild(slot);
          const sel = el(`<select></select>`);
          sel.appendChild(el(`<option value="">—</option>`));
          this.s.rolled.forEach((v, i) => {
            const takenBy = Object.keys(this.s.assign).find((k) => this.s.assign[k] === i);
            if (takenBy && takenBy !== at.key) return;
            const o = el(`<option value="${i}">${v}</option>`); if (this.s.assign[at.key] === i) o.selected = true; sel.appendChild(o);
          });
          sel.onchange = () => { this.s.assign[at.key] = sel.value === "" ? null : parseInt(sel.value, 10); renderGrid(); };
          row.appendChild(sel);
          grid.appendChild(row);
        });
        const man = el(`<button type="button" class="attr-manual-btn">${grid.classList.contains("manual") ? "Hide dropdowns" : "Assign with dropdowns instead"}</button>`);
        man.onclick = () => { window._wizManual = !grid.classList.contains("manual"); grid.classList.toggle("manual", window._wizManual); renderGrid(); };
        grid.appendChild(man);
      };
      rollBtn.onclick = () => { this._pick = null; this.s.rolledDice = []; this.s.rolled = [0,0,0,0,0,0].map(() => { const v = Dice.attribute(); this.s.rolledDice.push(Dice.lastAttr.slice()); return v; }); this.s.assign = { STR:null,CON:null,AGL:null,INT:null,WIL:null,CHA:null }; renderGrid(); };
      renderGrid();
      wrap.appendChild(rollBtn); wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Kin ---- */
    step_kin() {
      const wrap = el(`<div></div>`);
      const grid = el(`<div class="card-grid"></div>`);
      (DB.kin || []).forEach((k) => {
        const c = el(`<button class="card ${this.s.kin === k.key ? "sel" : ""}">${emblem("kin", k.key, "emb card-emb")}
          <h3>${esc(k.name)} <span class="tag">Move ${k.movement}</span></h3>
          <div class="meta">${k.abilities.map((a) => esc(a.name)).join(", ")}</div></button>`);
        c.onclick = () => { this.s.kin = k.key; this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Profession ---- */
    step_profession() {
      const wrap = el(`<div></div>`);
      const grid = el(`<div class="card-grid"></div>`);
      (DB.professions || []).forEach((p) => {
        const c = el(`<button class="card ${this.s.profession === p.key ? "sel" : ""}">${emblem("prof", p.key, "emb card-emb")}
          <h3>${esc(p.name)} <span class="tag">${esc(p.keyAttribute)}</span></h3>
          <div class="meta">${p.key === "mage" ? "Spellcaster — choose a school" : "Heroic ability: " + p.heroicAbilities.join(" / ")}</div></button>`);
        c.onclick = () => { this.s.profession = p.key; if (p.key !== "mage") this.s.mageSchool = null; this.s.bardHarmonism = false; this.s.trained = new Set(); this.s.spells = { tricks: [], known: [] }; this.s.heroicPicks = (p.heroicAbilities.length === 1 ? [p.heroicAbilities[0]] : []); this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      if (this.s.profession === "mage") {
        wrap.appendChild(el(`<p class="section-title" style="margin-top:18px"><b>Choose your school of magic</b></p>`));
        const sg = el(`<div class="card-grid"></div>`);
        Magic.mageSchools().forEach(([key, label]) => {
          const c = el(`<button class="card ${this.s.mageSchool === key ? "sel" : ""}">${emblem("school", key, "emb card-emb")}<h3>${esc(label)}</h3>${CORE_SCHOOLS.includes(key) ? "" : `<div class="meta">Book of Magic</div>`}</button>`);
          c.onclick = () => { this.s.mageSchool = key; this.s.trained = new Set(); this.render(); };
          sg.appendChild(c);
        });
        wrap.appendChild(sg);
        if (Magic.enabled()) wrap.appendChild(el(`<p class="stat-line">Dracomancy is learn-in-play only; Harmonism is for bards.</p>`));
      }
      if (this.s.profession === "bard" && Magic.enabled()) {
        const row = el(`<div class="panel" style="margin-top:16px"><b>Harmonism</b><br><span class="stat-line">Bards may study Harmonism (cast via Performance). You'll choose 3 magic tricks and 3 rank-1 spells.</span></div>`);
        const tog = el(`<button class="toggle ${this.s.bardHarmonism ? "on" : ""} u-mt2"><span class="knob"></span></button>`);
        tog.onclick = () => { this.s.bardHarmonism = !this.s.bardHarmonism; if (!this.s.bardHarmonism) this.s.spells = { tricks: [], known: [] }; this.render(); };
        row.appendChild(tog); wrap.appendChild(row);
      }
      return wrap;
    },

    /* ---- Step: Age ---- */
    step_age() {
      const wrap = el(`<div></div>`);
      const grid = el(`<div class="card-grid"></div>`);
      (DB.ages || []).forEach((a) => {
        const modList = Object.entries(a.mods);
        const mods = modList.length ? modList.map(([k, v]) => `<span class="mod-chip ${v > 0 ? "up" : "down"}">${k} ${v > 0 ? "+" : ""}${v}</span>`).join("") : esc("no attribute changes");
        const c = el(`<button class="card ${this.s.age === a.key ? "sel" : ""}">
          <h3>${esc(a.name)}</h3><div class="meta age-meta ${modList.length ? "has-chips" : ""}">${a.trainedSkills} trained skills<span class="mod-sep"> · </span><span class="mod-chips">${mods}</span></div></button>`);
        c.onclick = () => { this.s.age = a.key; this.render(); };
        grid.appendChild(c);
      });
      wrap.appendChild(grid);
      if (this.s.age && this.s.rolled) {
        const a = this.finalAttrs();
        wrap.appendChild(el(`<div class="panel" style="margin-top:16px"><b>Final attributes</b><div class="rolled-row">${
          (DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
          <p class="stat-line">HP ${a.CON} · WP ${a.WIL} · Move ${(this.kinObj()?.movement||0)+Calc.movementMod(a.AGL)} · STR dmg ${Calc.dmgBonusLabel(a.STR)} · AGL dmg ${Calc.dmgBonusLabel(a.AGL)}</p></div>`));
      }
      return wrap;
    },

    /* ---- Step: Trained skills ---- */
    step_skills() {
      const wrap = el(`<div></div>`);
      const age = this.ageObj();
      const profList = this.professionSkillList();
      const isMage = this.s.profession === "mage";
      const schoolName = isMage && this.s.mageSchool ? this.s.mageSchool[0].toUpperCase() + this.s.mageSchool.slice(1) : null;
      if (isMage && schoolName) this.s.trained.add(schoolName); // school is always trained
      const counter = el(`<div class="panel notice sticky-count" id="skill-count"></div>`);
      wrap.appendChild(counter);
      const updateCount = () => {
        const total = this.s.trained.size;
        const fromProf = [...this.s.trained].filter((n) => profList.includes(n)).length;
        counter.innerHTML = `<span class="sc-n${total === age.trainedSkills ? " ok" : ""}"><b>${total}</b>/${age.trainedSkills} trained</span><span class="sc-n${fromProf >= 6 ? " ok" : ""}"><b>${fromProf}</b>/6 from profession</span>`;
      };
      const makeChip = (name, locked) => {
        const on = this.s.trained.has(name);
        const sk = (DB.skills || []).find((x) => x.name === name);
        const chip = el(`<button class="skill-chip ${on ? "on" : ""} ${locked ? "locked" : ""}">${esc(name)}${sk ? ` <span class="stat-line">${sk.attribute}</span>` : ""}</button>`);
        chip.onclick = () => { if (locked) return; if (on) this.s.trained.delete(name); else this.s.trained.add(name); render(); };
        return chip;
      };
      const listWrap = el(`<div></div>`);
      const render = () => {
        listWrap.innerHTML = "";
        listWrap.appendChild(el(`<p class="section-title"><b>Profession skills</b> <span class="stat-line">(choose ≥6)</span></p>`));
        const pg = el(`<div class="chip-wrap"></div>`);
        profList.forEach((n) => pg.appendChild(makeChip(n, isMage && n === schoolName)));
        listWrap.appendChild(pg);
        listWrap.appendChild(el(`<p class="section-title"><b>Other skills</b> <span class="stat-line">(free picks)</span></p>`));
        const og = el(`<div class="chip-wrap"></div>`);
        (DB.skills || []).filter((sk) => sk.kind !== "magic" && !profList.includes(sk.name)).forEach((sk) => og.appendChild(makeChip(sk.name, false)));
        listWrap.appendChild(og);
        updateCount();
      };
      render();
      wrap.appendChild(listWrap);
      return wrap;
    },

    /* ---- Step: Magic (mage or Harmonism bard) ---- */
    step_magic() {
      const wrap = el(`<div></div>`);
      const isHarmonist = this.s.profession === "bard" && this.s.bardHarmonism;
      const school = isHarmonist ? "harmonism" : this.s.mageSchool;
      const schoolPool = Magic.poolFor(school);
      // Harmonists cannot learn General Magic; mages may also pick from General.
      const genPool = isHarmonist ? { tricks: [], spells: [] } : Magic.corePool("general");
      const allTricks = [...(schoolPool.tricks || []).map((t) => ({ ...t, src: school })), ...(genPool.tricks || []).map((t) => ({ ...t, src: "general" }))];
      const allRank1 = [...(schoolPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: school })), ...(genPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: "general" }))];
      wrap.appendChild(el(`<p class="stat-line wiz-tip">Choose <b>3 tricks</b> and <b>3 rank-1 spells</b>${isHarmonist ? " from Harmonism (cast with Performance)." : ` — ${esc(Magic.cap(school))} or General.`}</p>`));
      const mk = (arr, bucket, max, label) => {
        const sec = el(`<div class="panel"></div>`);
        sec.appendChild(el(`<p class="section-title"><b>${label}</b> <span class="stat-line" id="cnt-${bucket}"></span></p>`));
        const wrapc = el(`<div class="chip-wrap"></div>`);
        const refresh = () => { sec.querySelector(`#cnt-${bucket}`).textContent = `(${this.s.spells[bucket].length} / ${max})`; };
        arr.forEach((item) => {
          const on = this.s.spells[bucket].some((x) => x.name === item.name);
          const chip = el(`<button class="skill-chip ${on ? "on" : ""}">${esc(item.name)}${item.rank ? ` <span class="stat-line">R${item.rank}</span>` : ""}</button>`);
          chip.onclick = () => {
            const idx = this.s.spells[bucket].findIndex((x) => x.name === item.name);
            if (idx >= 0) this.s.spells[bucket].splice(idx, 1);
            else { if (this.s.spells[bucket].length >= max) { showToast("You've already chosen " + max + ".", "error"); return; } this.s.spells[bucket].push({ name: item.name, rank: item.rank || 0, school: item.src, text: item.text }); }
            chip.classList.toggle("on"); refresh();
          };
          wrapc.appendChild(chip);
        });
        sec.appendChild(wrapc); refresh();
        return sec;
      };
      wrap.appendChild(mk(allTricks, "tricks", 3, "Magic tricks (rank 0)"));
      wrap.appendChild(mk(allRank1, "known", 3, "Rank-1 spells"));
      return wrap;
    },

    /* ---- Step: Heroic ability ---- */
    heroicCap() { return Settings.soloMode() ? 2 : 1; },
    step_heroic() {
      const wrap = el(`<div></div>`);
      const p = this.prof();
      const cap = this.heroicCap();
      if (!Array.isArray(this.s.heroicPicks)) this.s.heroicPicks = this.s.heroic ? [this.s.heroic] : [];
      wrap.appendChild(el(`<p class="stat-line wiz-tip">${cap > 1 ? "Solo: choose <b>two</b>." : p.heroicAbilities.length > 1 ? "Choose <b>one</b>." : "Your profession gives you this one."} Requirements don't apply at creation. <span id="hpick-count"></span></p>`));
      const grid = el(`<div class="card-grid"></div>`);
      const pool = [...p.heroicAbilities];
      if (Settings.soloMode() && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.heroicAbilities) {
        DRAGONBANE_SOLO.heroicAbilities.forEach((ha) => { if (!pool.includes(ha.name)) pool.push(ha.name); });
      }
      const updCount = () => { const e = wrap.querySelector("#hpick-count"); if (e) e.textContent = `(${this.s.heroicPicks.length} / ${cap})`; };
      pool.forEach((name) => {
        const ab = findHeroicAbility(name) || { name, text: "" };
        const sel = this.s.heroicPicks.includes(name);
        const c = el(`<button class="card ${sel ? "sel" : ""}"><h3>${esc(name)} <span class="tag">${ab.wp == null ? "No WP" : "WP " + ab.wp}</span></h3><div class="meta">${esc(ab.text)}</div></button>`);
        c.onclick = () => {
          const i = this.s.heroicPicks.indexOf(name);
          if (i >= 0) this.s.heroicPicks.splice(i, 1);
          else { if (this.s.heroicPicks.length >= cap) { showToast(`Choose ${cap} ${cap === 1 ? "ability" : "abilities"}.`); return; } this.s.heroicPicks.push(name); }
          this.render();
        };
        grid.appendChild(c);
      });
      wrap.appendChild(grid); updCount();
      return wrap;
    },

    /* ---- Step: Gear ---- */
    step_gear() {
      const wrap = el(`<div></div>`);
      const p = this.prof();
      wrap.appendChild(el(`<p class="stat-line wiz-tip">Pick or roll a package. Its dice (coins, rations) roll when you finish.</p>`));
      const rollBtn = el(`<button class="btn secondary" style="margin-bottom:12px">🎲 Roll a random package</button>`);
      const grid = el(`<div class="card-grid"></div>`);
      const renderRows = () => {
        grid.innerHTML = "";
        (p.gear || []).forEach((g, i) => {
          const c = el(`<button class="card ${this.s.gearRow === i ? "sel" : ""}"><h3>Roll ${esc(g.roll)}</h3><div class="meta">${esc(g.items)}</div></button>`);
          c.onclick = () => { this.s.gearRow = i; renderRows(); };
          grid.appendChild(c);
        });
      };
      rollBtn.onclick = () => { const rows = p.gear || []; if (!rows.length) return; this.s.gearRow = Math.floor(Math.random() * rows.length); renderRows(); };
      renderRows();
      wrap.appendChild(rollBtn); wrap.appendChild(grid);
      if (!(p.gear || []).length) wrap.appendChild(el(`<p class="notice">No gear table for this profession; you can add equipment later.</p>`));
      return wrap;
    },

    /* ---- Step: Details ---- */
    step_details() {
      const wrap = el(`<div class="panel"></div>`);
      const field = (key, label, ph) => {
        const f = el(`<div class="form-field"><label>${label}</label></div>`);
        const inp = key === "name" ? el(`<input type="text" placeholder="${ph}">`) : el(`<textarea rows="2" placeholder="${ph}"></textarea>`);
        inp.value = this.s.identity[key] || "";
        inp.oninput = () => { this.s.identity[key] = inp.value; };
        if (key === "name" && DB.names) {
          const btnWrap = el(`<div class="u-row15-mt"></div>`);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:var(--fs-sm)">🎲 Random Hero Name</button>`);
          genBtn.onclick = () => {
            const kinKey = this.s.kin || "human";
            const profKey = this.s.profession || "artisan";
            const kNames = (DB.names.kin && DB.names.kin[kinKey]) || DB.names.kin.human;
            const pNick = (DB.names.nicknames && DB.names.nicknames[profKey]) || [];
            const first = kNames[Math.floor(Math.random() * kNames.length)];
            const nick = pNick.length && Math.random() < 0.65 ? " \"" + pNick[Math.floor(Math.random() * pNick.length)] + "\"" : "";
            inp.value = first + nick;
            this.s.identity.name = inp.value;
          };
          btnWrap.appendChild(genBtn);
          f.appendChild(inp); f.appendChild(btnWrap); return f;
        }
        if (key !== "name" && DB.flavor && DB.flavor[key]) {
          const btnWrap = el(`<div class="u-row15-mt"></div>`);
          const labelName = key.charAt(0).toUpperCase() + key.slice(1);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:var(--fs-sm);padding:4px 8px">🎲 Random ${labelName}</button>`);
          genBtn.onclick = () => {
            const list = DB.flavor[key] || [];
            if (!list.length) return;
            inp.value = list[Math.floor(Math.random() * list.length)];
            this.s.identity[key] = inp.value;
          };
          btnWrap.appendChild(genBtn);
          f.appendChild(inp); f.appendChild(btnWrap); return f;
        }
        f.appendChild(inp); return f;
      };
      wrap.appendChild(field("name", "Name *", "Your hero's name"));
      wrap.appendChild(field("appearance", "Appearance", "A few distinctive details"));
      wrap.appendChild(field("weakness", "Weakness", "A flaw or vice"));
      wrap.appendChild(field("memento", "Memento", "A meaningful keepsake"));
      return wrap;
    },

    /* ---- Step: Review ---- */
    step_review() {
      const c = this.build();
      const wrap = el(`<div></div>`);
      const a = c.attributes;
      wrap.appendChild(el(`<div class="panel">
        <h3>${esc(c.identity.name || "Unnamed")}</h3>
        <p class="meta">${esc(this.kinObj().name)} · ${esc(this.prof().name)}${this.s.mageSchool ? " (" + esc(this.s.mageSchool) + ")" : ""} · ${esc(this.ageObj().name)}</p>
        <div class="rolled-row">${(DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
        <p class="stat-line">HP ${c.derived.hpMax} · WP ${c.derived.wpMax} · Move ${c.derived.movement} · STR dmg ${c.derived.dmgBonusSTR ? "+"+c.derived.dmgBonusSTR : "—"} · AGL dmg ${c.derived.dmgBonusAGL ? "+"+c.derived.dmgBonusAGL : "—"}</p>
        <p><b>Trained:</b> ${Object.entries(c.skills).filter(([,v])=>v.trained).map(([n,v])=>`<span class="tag">${esc(n)} ${v.level}</span>`).join(" ")}</p>
        <p><b>Abilities:</b> ${c.abilities.map((x)=>`<span class="tag">${esc(x.name)}</span>`).join(" ")}</p>
        ${c.spells.known.length || c.spells.tricks.length ? `<p><b>Magic:</b> ${[...c.spells.tricks,...c.spells.known].map((x)=>`<span class="tag">${esc(x.name)}</span>`).join(" ")}</p>` : ""}
        <p class="stat-line"><b>Gear:</b> ${c.inventory.items.map(esc).join(", ") || "—"} · ${c.inventory.money.gold}g ${c.inventory.money.silver}s ${c.inventory.money.copper}c</p>
      </div>`));
      return wrap;
    },

    validate(step) {
      const s = this.s;
      if (step === "attributes") { if (!s.rolled) return "Roll your attributes first."; if (Object.values(s.assign).some((v) => v == null)) return "Assign all six rolled scores to attributes."; }
      if (step === "kin" && !s.kin) return "Choose a kin.";
      if (step === "profession") { if (!s.profession) return "Choose a profession."; if (s.profession === "mage" && !s.mageSchool) return "Choose a school of magic."; }
      if (step === "age" && !s.age) return "Choose an age.";
      if (step === "skills") {
        const age = this.ageObj(); const profList = this.professionSkillList();
        if (s.trained.size !== age.trainedSkills) return `Pick exactly ${age.trainedSkills} trained skills (you have ${s.trained.size}).`;
        const fromProf = [...s.trained].filter((n) => profList.includes(n)).length;
        if (fromProf < 6) return `At least 6 trained skills must come from your profession (you have ${fromProf}).`;
      }
      if (step === "magic") { if (s.spells.tricks.length !== 3) return "Choose exactly 3 magic tricks."; if (s.spells.known.length !== 3) return "Choose exactly 3 rank-1 spells."; }
      if (step === "heroic") { const cap = this.heroicCap(); if ((s.heroicPicks || []).length !== cap) return `Choose ${cap} heroic ${cap === 1 ? "ability" : "abilities"}.`; }
      if (step === "details" && !s.identity.name.trim()) return "Give your hero a name.";
      return null;
    },

    // Assemble the full character object from wizard state.
    build() {
      const attrs = this.finalAttrs();
      const kin = this.kinObj();
      const skills = buildSkills(attrs, this.s.trained, this.s.mageSchool);
      const abilities = [];
      (kin.abilities || []).forEach((a) => abilities.push({ name: a.name, source: "kin", wp: a.wp, text: a.text }));
      (this.s.heroicPicks || []).forEach((name) => { const h = findHeroicAbility(name); abilities.push({ name, source: "profession", wp: h ? h.wp : null, text: h ? h.text : "" }); });
      const gearRow = this.prof().gear && this.s.gearRow != null ? this.prof().gear[this.s.gearRow] : null;
      const gear = gearRow ? parseGear(gearRow.items) : { items: [], money: { gold: 0, silver: 0, copper: 0 } };
      const movement = (kin.movement || 0) + Calc.movementMod(attrs.AGL);
      return {
        id: uid(), createdAt: new Date().toISOString(), schemaVersion: 1,
        identity: { name: this.s.identity.name.trim(), kin: kin.name, profession: this.prof().name, mageSchool: this.s.mageSchool, age: this.ageObj().name,
          appearance: this.s.identity.appearance, weakness: this.s.identity.weakness, memento: this.s.identity.memento, portraitUrl: null },
        attributes: attrs,
        derived: { movement, hpMax: attrs.CON, wpMax: attrs.WIL, dmgBonusSTR: Calc.damageBonus(attrs.STR), dmgBonusAGL: Calc.damageBonus(attrs.AGL) },
        state: { hp: attrs.CON, wp: attrs.WIL, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
        skills,
        abilities,
        // Harmonism bards cast via Performance (no INT school skill); record it for the caster.
        spells: Object.assign({}, this.s.spells, (this.s.profession === "bard" && this.s.bardHarmonism) ? { castSkill: "Performance", castSchool: "Harmonism" } : {}),
        inventory: { items: gear.items, tiny: [], mementos: this.s.identity.memento ? [this.s.identity.memento] : [], money: gear.money },
        notes: ""
      };
    },
    save() {
      const c = this.build();
      const list = Store.list(); list.push(c); Store.save(list);
      Sheet.open(c.id);
      this.forged(c);
    },
    // One-shot "hero forged" flourish: the new crest in a laurel with sparkles.
    forged(c) {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const w = (c.identity.name || "?").trim().split(/\s+/);
      const ini = (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase();
      const ov = el(`<div class="forged-ov" aria-hidden="true">${forgedArt(crest(c.identity.name, c.identity.kin, ini))}</div>`);
      const done = () => ov.remove();
      ov.onclick = done; document.body.appendChild(ov); setTimeout(done, 1900);
    }
  };

  /* =================================================================
   * Pre-generated characters (Dragonbane Core Set)
   * ================================================================= */

export const Pregens = {
    findSpell(name, school) {
      const sp = DB.spells || {};
      const pools = [sp.general, sp[school]].filter(Boolean);
      for (const pool of pools) {
        const inTricks = (pool.tricks || []).find((t) => t.name === name);
        if (inTricks) return { name, rank: 0, text: inTricks.text };
        const inSpells = (pool.spells || []).find((t) => t.name === name);
        if (inSpells) return { name, rank: inSpells.rank, text: inSpells.text, school };
      }
      return { name, rank: 0, text: "" };
    },
    // Turn a pregen definition into a full character object.
    instantiate(p) {
      const attrs = { ...p.attributes };
      const kin = (DB.kin || []).find((k) => k.key === p.kin);
      const prof = (DB.professions || []).find((x) => x.key === p.profession);
      const age = (DB.ages || []).find((x) => x.key === p.age);
      const trainedSet = new Set(p.trained);
      const skills = buildSkills(attrs, trainedSet, p.mageSchool);
      const abilities = [];
      (kin.abilities || []).forEach((a) => abilities.push({ name: a.name, source: "kin", wp: a.wp, text: a.text }));
      if (p.heroic) { const h = findHeroicAbility(p.heroic); abilities.push({ name: p.heroic, source: "profession", wp: h ? h.wp : null, text: h ? h.text : "" }); }
      const spells = {
        tricks: (p.spells.tricks || []).map((n) => this.findSpell(n, p.mageSchool)),
        known: (p.spells.known || []).map((n) => this.findSpell(n, p.mageSchool))
      };
      const items = [
        ...(p.weapons || []),
        ...(p.armor ? [/armor|mail|plate/i.test(p.armor) ? p.armor : p.armor + " armor"] : []),
        ...(p.helmet ? [p.helmet] : []),
        ...(p.gear || [])
      ];
      return {
        id: uid(), createdAt: new Date().toISOString(), schemaVersion: 1, fromPregen: p.name,
        identity: { name: p.name, kin: kin.name, profession: prof.name, mageSchool: p.mageSchool, age: age.name,
          appearance: p.appearance, weakness: p.weakness, memento: p.memento, portraitUrl: null },
        attributes: attrs,
        derived: { movement: (kin.movement || 0) + Calc.movementMod(attrs.AGL), hpMax: attrs.CON, wpMax: attrs.WIL, dmgBonusSTR: Calc.damageBonus(attrs.STR), dmgBonusAGL: Calc.damageBonus(attrs.AGL) },
        state: { hp: attrs.CON, wp: attrs.WIL, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
        skills, abilities, spells,
        inventory: { items, tiny: [], mementos: p.memento ? [p.memento] : [], money: { gold: 0, silver: 0, copper: 0 } },
        notes: ""
      };
    },
    open() {
      const root = el(`<div></div>`);
      root.appendChild(el(`<div class="wiz-head"><button class="btn ghost" id="pg-back">← Heroes</button><div class="wiz-progress">Pre-generated heroes</div></div>`));
      root.appendChild(el(`<p class="stat-line">Ready-to-play characters from the Dragonbane Core Set. Pick one to add it to your roster — you can rename or adjust it afterwards.</p>`));
      const grid = el(`<div class="card-grid u-mt3"></div>`);
      (window.DRAGONBANE_PREGENS || []).forEach((p) => {
        const kin = (DB.kin || []).find((k) => k.key === p.kin);
        const prof = (DB.professions || []).find((x) => x.key === p.profession);
        const age = (DB.ages || []).find((x) => x.key === p.age);
        const a = p.attributes;
        const c = el(`<button class="card pg-card">
          <h3>${esc(p.name)}</h3>
          <div class="meta">${emblem("prof", prof.key, "emb card-emb")}${esc(kin.name)} · ${esc(prof.name)}${p.mageSchool ? " (" + esc(p.mageSchool) + ")" : ""} · ${esc(age.name)}</div>
          <p class="stat-line" style="margin:6px 0">${esc(p.blurb)}</p>
          <div class="stat-block">${(DB.attributes||[]).map((at)=>`<div class="stat-cell">${SHIELD_BG}${emblem("attr", at.key)}<span class="stat-num">${a[at.key]}</span><span class="stat-key">${at.key}</span></div>`).join("")}</div>
          <span class="pg-choose" aria-hidden="true">Choose →</span>
        </button>`);
        c.onclick = () => {
          const ch = this.instantiate(p);
          const list = Store.list(); list.push(ch); Store.save(list);
          Sheet.open(ch.id);
        };
        grid.appendChild(c);
      });
      root.appendChild(grid);
      mountScreen(root);
      root.querySelector("#pg-back").onclick = () => Router.go("home");
    }
  };

  /* =================================================================
   * Modal overlay helper
   * ================================================================= */
