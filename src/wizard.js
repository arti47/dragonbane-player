/* wizard.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
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
        </div>`));
      const bodyWrap = el(`<div id="wiz-body"></div>`);
      bodyWrap.appendChild(this["step_" + step]());
      root.appendChild(bodyWrap);

      const nav = el(`<div class="wiz-nav"></div>`);
      if (this.s.step > 0) { const b = el(`<button class="btn ghost">Back</button>`); b.onclick = () => { this.s.step--; this.render(); }; nav.appendChild(b); }
      const isLast = step === "review";
      const next = el(`<button class="btn">${isLast ? "Create hero" : "Next"}</button>`);
      next.onclick = () => { const err = this.validate(step); if (err) { showToast(err); return; } if (isLast) { this.save(); } else { this.s.step++; this.render(); } };
      nav.appendChild(next);
      root.appendChild(nav);

      mountScreen(root);
      root.querySelector("#wiz-cancel").onclick = async () => { if (await confirmModal("Discard this character?", { title: "Discard character", okText: "Discard", danger: true })) Router.go("home"); };
    },
    stepTitle(step) {
      return { attributes: "Attributes", kin: "Kin", profession: "Profession", age: "Age",
        skills: "Trained Skills", magic: "Magic", heroic: "Heroic Ability",
        gear: "Starting Gear", details: "Details", review: "Review" }[step];
    },

    /* ---- Step: Attributes ---- */
    step_attributes() {
      const wrap = el(`<div class="panel"></div>`);
      wrap.appendChild(el(`<p class="stat-line">Roll 4D6 (drop the lowest) six times, then assign each score to an attribute. Age modifiers are applied later.</p>`));
      const rollBtn = el(`<button class="btn block" style="margin-bottom:14px">${this.s.rolled ? "Re-roll all" : "Roll attributes"}</button>`);
      const grid = el(`<div class="attr-grid"></div>`);
      const renderGrid = () => {
        grid.innerHTML = "";
        if (!this.s.rolled) { grid.appendChild(el(`<p class="stat-line">Press “Roll attributes” to begin.</p>`)); return; }
        grid.appendChild(el(`<div class="rolled-row">Rolled: ${this.s.rolled.map((v, i) => `<span class="tag ${Object.values(this.s.assign).includes(i) ? "used" : ""}">${v}</span>`).join("")}</div>`));
        (DB.attributes || []).forEach((at) => {
          const row = el(`<div class="attr-row"><label>${at.key} <span class="stat-line">${at.name}</span></label></div>`);
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
      };
      rollBtn.onclick = () => { this.s.rolled = [0,0,0,0,0,0].map(() => Dice.attribute()); this.s.assign = { STR:null,CON:null,AGL:null,INT:null,WIL:null,CHA:null }; renderGrid(); };
      renderGrid();
      wrap.appendChild(rollBtn); wrap.appendChild(grid);
      return wrap;
    },

    /* ---- Step: Kin ---- */
    step_kin() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Choose your kin")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.kin || []).forEach((k) => {
        const c = el(`<button class="card ${this.s.kin === k.key ? "sel" : ""}">
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
      wrap.appendChild(el(sectionTitle("Choose your profession")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.professions || []).forEach((p) => {
        const c = el(`<button class="card ${this.s.profession === p.key ? "sel" : ""}">
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
          const c = el(`<button class="card ${this.s.mageSchool === key ? "sel" : ""}"><h3>${esc(label)}</h3>${CORE_SCHOOLS.includes(key) ? "" : `<div class="meta">Book of Magic</div>`}</button>`);
          c.onclick = () => { this.s.mageSchool = key; this.s.trained = new Set(); this.render(); };
          sg.appendChild(c);
        });
        wrap.appendChild(sg);
        if (Magic.enabled()) wrap.appendChild(el(`<p class="stat-line">Dracomancy is learn-in-play only; Harmonism is for bards.</p>`));
      }
      if (this.s.profession === "bard" && Magic.enabled()) {
        const row = el(`<div class="panel" style="margin-top:16px"><b>Harmonism</b><br><span class="stat-line">Bards may study Harmonism (cast via Performance). You'll choose 3 magic tricks and 3 rank-1 spells.</span></div>`);
        const tog = el(`<button class="toggle ${this.s.bardHarmonism ? "on" : ""}" style="margin-top:8px"><span class="knob"></span></button>`);
        tog.onclick = () => { this.s.bardHarmonism = !this.s.bardHarmonism; if (!this.s.bardHarmonism) this.s.spells = { tricks: [], known: [] }; this.render(); };
        row.appendChild(tog); wrap.appendChild(row);
      }
      return wrap;
    },

    /* ---- Step: Age ---- */
    step_age() {
      const wrap = el(`<div></div>`);
      wrap.appendChild(el(sectionTitle("Choose your age")));
      const grid = el(`<div class="card-grid"></div>`);
      (DB.ages || []).forEach((a) => {
        const mods = Object.entries(a.mods).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", ") || "no attribute changes";
        const c = el(`<button class="card ${this.s.age === a.key ? "sel" : ""}">
          <h3>${esc(a.name)}</h3><div class="meta">${a.trainedSkills} trained skills · ${esc(mods)}</div></button>`);
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
      wrap.appendChild(el(sectionTitle("Trained skills")));
      const counter = el(`<div class="panel notice" id="skill-count"></div>`);
      wrap.appendChild(counter);
      const updateCount = () => {
        const total = this.s.trained.size;
        const fromProf = [...this.s.trained].filter((n) => profList.includes(n)).length;
        counter.innerHTML = `Trained: <b>${total} / ${age.trainedSkills}</b> · from profession: <b>${fromProf} / 6</b>. Pick exactly ${age.trainedSkills} (at least 6 from your profession). Trained skills start at twice their base chance.`;
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
      wrap.appendChild(el(sectionTitle("Magic")));
      const isHarmonist = this.s.profession === "bard" && this.s.bardHarmonism;
      const school = isHarmonist ? "harmonism" : this.s.mageSchool;
      const schoolPool = Magic.poolFor(school);
      // Harmonists cannot learn General Magic; mages may also pick from General.
      const genPool = isHarmonist ? { tricks: [], spells: [] } : Magic.corePool("general");
      const allTricks = [...(schoolPool.tricks || []).map((t) => ({ ...t, src: school })), ...(genPool.tricks || []).map((t) => ({ ...t, src: "general" }))];
      const allRank1 = [...(schoolPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: school })), ...(genPool.spells || []).filter((x) => x.rank === 1).map((x) => ({ ...x, src: "general" }))];
      wrap.appendChild(el(`<p class="stat-line">As ${isHarmonist ? "a Harmonism bard (cast via Performance)" : "a " + esc(Magic.cap(school)) + " mage"}, choose <b>3 magic tricks</b> and <b>3 rank-1 spells</b>${isHarmonist ? " from Harmonism." : " (from your school or General Magic)."}</p>`));
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
      wrap.appendChild(el(sectionTitle("Heroic ability")));
      wrap.appendChild(el(`<p class="stat-line">${cap > 1 ? `Solo: choose <b>two</b> starting heroic abilities (one profession + one extra).` : `Your profession grants one starting heroic ability${p.heroicAbilities.length > 1 ? " — choose one" : ""}.`} (Skill requirements are waived for starting abilities.) <span id="hpick-count"></span></p>`));
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
      wrap.appendChild(el(sectionTitle("Starting gear")));
      wrap.appendChild(el(`<p class="stat-line">Pick a starting gear package (or roll). Dice in the list (coins, rations) are rolled when you create the hero.</p>`));
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
      wrap.appendChild(el(sectionTitle("Details")));
      const field = (key, label, ph) => {
        const f = el(`<div class="form-field"><label>${label}</label></div>`);
        const inp = key === "name" ? el(`<input type="text" placeholder="${ph}">`) : el(`<textarea rows="2" placeholder="${ph}"></textarea>`);
        inp.value = this.s.identity[key] || "";
        inp.oninput = () => { this.s.identity[key] = inp.value; };
        if (key === "name" && DB.names) {
          const btnWrap = el(`<div style="display:flex;gap:6px;margin-top:6px"></div>`);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:0.9rem">🎲 Random Hero Name</button>`);
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
          const btnWrap = el(`<div style="display:flex;gap:6px;margin-top:6px"></div>`);
          const labelName = key.charAt(0).toUpperCase() + key.slice(1);
          const genBtn = el(`<button type="button" class="btn step" style="flex:1;font-size:0.85rem;padding:4px 8px">🎲 Random ${labelName}</button>`);
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
      wrap.appendChild(el(sectionTitle("Review")));
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
      const grid = el(`<div class="card-grid" style="margin-top:12px"></div>`);
      (window.DRAGONBANE_PREGENS || []).forEach((p) => {
        const kin = (DB.kin || []).find((k) => k.key === p.kin);
        const prof = (DB.professions || []).find((x) => x.key === p.profession);
        const age = (DB.ages || []).find((x) => x.key === p.age);
        const a = p.attributes;
        const c = el(`<button class="card">
          <h3>${esc(p.name)}</h3>
          <div class="meta">${esc(kin.name)} · ${esc(prof.name)}${p.mageSchool ? " (" + esc(p.mageSchool) + ")" : ""} · ${esc(age.name)}</div>
          <p class="stat-line" style="margin:6px 0">${esc(p.blurb)}</p>
          <div class="rolled-row">${(DB.attributes||[]).map((at)=>`<span class="tag">${at.key} ${a[at.key]}</span>`).join("")}</div>
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
