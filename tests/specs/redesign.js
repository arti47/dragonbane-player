/* redesign.js — guards the radical redesign (R1–R7): structure, onboarding, sheet,
   rolling, combat, story and book changes. Presentation only — rules behaviour is
   covered by the other specs. */
module.exports = {
  name: "redesign",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({}, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const ev = (f, a) => page.evaluate(f, a);
    const go = async (r) => { await ev((x) => window.__go(x), r); await page.waitForTimeout(200); };
    const ctx = () => ev(() => document.querySelector("#ctx-action").textContent.trim());

    // ---- R1 structure ----
    const nav = await ev(() => [...document.querySelectorAll("#app-nav button[data-route]")].map((b) => b.dataset.route).join(","));
    t.eq("R1: four tabs", nav, "home,party,story,book");
    t.ok("R1: context seal docked in the nav", await ev(() => !!document.querySelector("#app-nav #ctx-action .ca-seal")));
    t.eq("R1: empty home → New hero", await ctx(), "New hero");
    await go("story");
    t.ok("R1: Story with no mode on shows the chooser", await ev(() => document.querySelectorAll(".sp-card").length === 2 && document.querySelector("#screen").dataset.route === "story"));
    t.eq("R1: Story tab is current", await ev(() => document.querySelector("#app-nav [aria-current='page']").dataset.route), "story");
    await go("book");
    t.eq("R1: Book opens the rules first", await ev(() => document.querySelector("#screen").dataset.route), "rules");
    t.ok("R1: Book mode switch (Rules | Settings)", await ev(() => document.querySelectorAll(".mode-switch .ms-btn").length === 2));
    await ev(() => document.querySelector(".mode-switch [data-mode='about']").click()); await page.waitForTimeout(200);
    await go("home"); await go("book");
    t.eq("R1: Book reopens the last section", await ev(() => document.querySelector("#screen").dataset.route), "about");

    // Hero → sheet → Roll picker
    await go("home");
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await ev(() => document.querySelectorAll(".card-grid .card")[2].click()); await page.waitForTimeout(300);
    t.eq("R1: on the sheet → Roll", await ctx(), "Roll");
    await ev(() => document.querySelector("#ctx-action").click()); await page.waitForTimeout(200);
    const tiles = await ev(() => document.querySelectorAll(".modal-card .dice-board .db-tile").length);
    t.ok(`R1: Roll opens the skill tiles (${tiles})`, tiles >= 30);
    await ev(() => document.querySelector(".modal-card .db-tile").click()); await page.waitForTimeout(250);
    t.ok("R1: tapping a tile opens that skill's roll", await ev(() => /Roll|≤/.test(document.querySelector(".modal-card").textContent)));
    await ev(() => document.querySelector(".modal-x")?.click());

    // Dying → Death roll
    const id = await ev(() => JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id);
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { Sheet } = await import("/src/sheet.js"); Store.update(id, (c) => { c.state.hp = 0; }); Sheet.render(); }, id); await page.waitForTimeout(150);
    t.eq("R1: dying hero → Death roll", await ctx(), "Death roll");
    await ev(async (id) => { const { Store } = await import("/src/store.js"); Store.update(id, (c) => { c.state.hp = 5; }); }, id);

    // A fight running → Fight elsewhere, Next turn on Fight (GM on one device)
    await ev(() => { window._combatAddOpen = true; }); await go("party");
    await ev(() => { const s = document.querySelectorAll(".inv-add select"); s[1].selectedIndex = 1; s[1].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); }); await page.waitForTimeout(250);
    t.eq("R1: on Fight mid-round → Next turn", await ctx(), "Next turn");
    await go("book");
    t.eq("R1: elsewhere mid-round → Fight", await ctx(), "Fight");
    await ev(() => document.querySelector("#ctx-action").click()); await page.waitForTimeout(200);
    t.eq("R1: Fight jumps to the tracker", await ev(() => document.querySelector("#screen").dataset.route), "party");

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();

    // ---- R2 levels + onboarding + quick hero ----
    const p2 = await newPage({}, { width: 390, height: 844 });
    await p2.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p2.waitForTimeout(200);
    const e2 = (f, a) => p2.evaluate(f, a);
    t.eq("R2: existing devices default to Veteran (expert)", await e2(async () => (await import("/src/settings.js")).Settings.level()), "expert");
    await e2(async () => { localStorage.removeItem("dragonbane.welcomed"); (await import("/src/onboard.js")).Onboard.start(); }); await p2.waitForTimeout(150);
    t.eq("R2: first run asks how well you know the game (3 cards)", await e2(() => document.querySelectorAll(".onboard .ob-card").length), 3);
    await e2(() => document.querySelector(".ob-card[data-k=beginner]").click()); await p2.waitForTimeout(80);
    t.ok("R2: New → beginner level on this device", await e2(() => document.body.classList.contains("lvl-beginner") && document.body.classList.contains("beginner")));
    await e2(() => document.querySelector(".ob-card[data-k=solo]").click()); await p2.waitForTimeout(80);
    t.ok("R2: Solo → solo mode on", await e2(() => JSON.parse(localStorage.getItem("dragonbane.settings")).soloMode === true));
    await e2(() => document.querySelector(".ob-card[data-k=quick]").click()); await p2.waitForTimeout(500);
    t.ok("R2: Quick hero → a hero sheet is open", await e2(() => document.querySelector("#screen").dataset.route === "sheet" && JSON.parse(localStorage.getItem("dragonbane.characters")).length === 1));
    t.ok("R2: onboarding closed and remembered", await e2(() => !document.querySelector(".onboard") && localStorage.getItem("dragonbane.welcomed") === "1"));
    await p2.waitForTimeout(500);
    t.ok("R2: beginner gets the coach tour on the sheet", await e2(() => !!document.querySelector(".coach-bubble") && !!document.querySelector(".coach-spot")));
    await e2(() => document.querySelector(".coach-bubble .btn").click()); await p2.waitForTimeout(150);
    t.ok("R2: coach advances (step 2)", await e2(() => /2 \/ 5/.test(document.querySelector(".coach-bubble .cb-step").textContent)));
    await e2(() => [...document.querySelectorAll(".coach-bubble .btn")].find((b) => /Skip/.test(b.textContent)).click()); await p2.waitForTimeout(100);
    t.ok("R2: Skip tour ends it for good", await e2(() => !document.querySelector(".coach-bubble") && localStorage.getItem("dragonbane.coach") === "done"));
    // Quick hero is always rules-legal (drives the wizard's own validate()).
    const qh = await e2(async () => {
      const { Wizard } = await import("/src/wizard.js"); const DB = window.DRAGONBANE; let bad = 0;
      for (let i = 0; i < 40; i++) {
        const c = Wizard.quick(); if (!c) { bad++; continue; }
        const age = DB.ages.find((a) => a.name === c.identity.age);
        const trained = Object.values(c.skills).filter((v) => v.trained).length;
        const heroic = c.abilities.filter((a) => a.source === "profession").length;
        if (trained !== age.trainedSkills || c.state.hp !== c.attributes.CON || c.state.wp !== c.attributes.WIL) bad++;
        if (c.identity.profession === "Mage" ? (c.spells.tricks.length !== 3 || c.spells.known.length !== 3) : heroic !== 2) bad++; // Solo on → 2 heroic abilities
      }
      document.querySelectorAll(".forged-ov").forEach((x) => x.remove());
      return bad;
    });
    t.eq("R2: 40 quick heroes, all legal (solo: two heroic abilities)", qh, 0);
    // Experience control in Settings
    await e2(() => window.__go("about")); await p2.waitForTimeout(200);
    await e2(() => document.querySelector("#lvl-standard").click()); await p2.waitForTimeout(200);
    t.ok("R2: Some → standard level (advanced panels hidden, no plain-words help)", await e2(async () => (await import("/src/settings.js")).Settings.level() === "standard" && document.body.classList.contains("lvl-standard") && !document.body.classList.contains("beginner")));
    await e2(() => window.__go("home")); await p2.waitForTimeout(150);
    t.ok("R2: home has three make-tiles", await e2(() => ["#quick-hero", "#use-pregen", "#new-hero"].every((s) => !!document.querySelector(".make-row " + s))));
    t.ok(`R2: no JS page errors (${p2._errors.length})`, p2._errors.length === 0);
    p2._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p2.close();
  },
};
