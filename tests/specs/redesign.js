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
    // ---- R3 the hero sheet: play / edit layers ----
    const p3 = await newPage({}, { width: 390, height: 844 });
    await p3.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p3.waitForTimeout(200);
    const e3 = (f, a) => p3.evaluate(f, a);
    await e3(() => localStorage.setItem("dragonbane.editMode", "0"));
    await p3.click("#use-pregen"); await p3.waitForTimeout(150);
    await e3(() => document.querySelectorAll(".card-grid .card")[2].click()); await p3.waitForTimeout(300); // the knight
    const k = await e3(() => JSON.parse(localStorage.getItem("dragonbane.characters"))[0]);
    const vis = (sel) => e3((q) => { const n = document.querySelector(q); return !!n && n.getClientRects().length > 0; }, sel);
    t.ok("R3: play layer by default (✎ Edit off)", await e3(() => document.querySelector("#sheet-edit").getAttribute("aria-pressed") === "false" && !document.querySelector(".sheet-root").classList.contains("is-edit")));
    t.eq("R3: HP ring has one segment per max HP", await e3(() => document.querySelectorAll(".vital-rings .vr-seg.hp").length), k.attributes.CON);
    t.eq("R3: WP ring has one segment per max WP", await e3(() => document.querySelectorAll(".vital-rings .vr-seg.wp").length), k.attributes.WIL);
    await e3(() => document.querySelector(".vital.hp .step").click()); await p3.waitForTimeout(80);
    t.eq("R3: HP − dims one ring segment and saves", await e3(() => [document.querySelectorAll(".vr-seg.hp.on").length, JSON.parse(localStorage.getItem("dragonbane.characters"))[0].state.hp].join("/")), `${k.state.hp - 1}/${k.state.hp - 1}`);
    t.eq("R3: six condition seals on the hero card", await e3(() => document.querySelectorAll(".hero-top .cond-seal").length), 6);
    await e3(() => document.querySelector(".cond-seal").click()); await p3.waitForTimeout(150);
    t.ok("R3: tapping a seal sets that condition", await e3(() => { const c = JSON.parse(localStorage.getItem("dragonbane.characters"))[0]; return Object.values(c.state.conditions).filter(Boolean).length === 1 && document.querySelector(".cond-seal").classList.contains("on"); }));
    await e3(() => document.querySelector(".rest-one").click()); await p3.waitForTimeout(150);
    t.eq("R3: one Rest button → Round / Stretch / Shift", await e3(() => document.querySelectorAll(".modal-card .rp-btn").length), 3);
    await e3(() => document.querySelector(".modal-x").click()); await p3.waitForTimeout(80);
    // Skills: tiles grouped by attribute
    await e3(() => document.querySelector(".tab[data-tab='skills']").click()); await p3.waitForTimeout(100);
    t.eq("R3: skills grouped under the attribute they use", await e3(() => document.querySelectorAll(".skill-board .sk-group").length), new Set(Object.values(k.skills).map((v) => v.attribute)).size);
    t.eq("R3: one tile per skill", await e3(() => document.querySelectorAll(".skill-board .sk-tile").length), Object.keys(k.skills).length);
    t.ok("R3: advancement setup tools hidden in play", !(await vis(".adv-menu")));
    // Gear: paper doll + backpack + item sheet
    await e3(() => document.querySelector(".tab[data-tab='gear']").click()); await p3.waitForTimeout(100);
    t.eq("R3: paper doll has 5 worn slots (head, body, 3 hands)", await e3(() => document.querySelectorAll(".doll .doll-slot").length), 5);
    t.ok("R3: add-item row hidden in play", !(await vis("#sheet-pane-gear .inv-add")));
    await e3(() => document.querySelector(".doll-slot.empty[data-kind='armor']").click()); await p3.waitForTimeout(200);
    t.ok("R3: tapping the empty Body slot wears the armor from the pack", await e3(() => { const c = JSON.parse(localStorage.getItem("dragonbane.characters"))[0]; return c.inventory.items.some((i) => i.equipped && /plate|mail|leather/i.test(i.name)) && !!document.querySelector(".doll-slot.filled"); }));
    await e3(() => document.querySelector(".doll-slot.filled").click()); await p3.waitForTimeout(150);
    t.ok("R3: a worn item opens its sheet with Unequip + rules facts", await e3(() => /Unequip/.test(document.querySelector(".modal-card").textContent) && /Rating \d/.test(document.querySelector(".modal-card").textContent)));
    await e3(() => document.querySelector(".modal-x").click()); await p3.waitForTimeout(80);
    const nTiles = await e3(() => document.querySelectorAll(".bp-grid .bp-tile").length);
    t.ok(`R3: backpack shows each carried item as a tile (${nTiles})`, nTiles === k.inventory.items.length - 1);
    // Equip caps still enforced from the doll: 3 weapons at hand max
    const cap = await e3(async () => {
      const { Store } = await import("/src/store.js"); const { Sheet } = await import("/src/sheet.js");
      const id = JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id;
      Store.update(id, (c) => { ["Dagger", "Short sword", "Handaxe", "Spear"].forEach((n) => c.inventory.items.push({ name: n, weight: 1 })); c.inventory.items.forEach((i) => { if (/Dagger|Short sword|Handaxe/.test(i.name)) i.equipped = true; }); });
      Sheet.render(); await new Promise((r) => setTimeout(r, 100));
      return { empty: document.querySelectorAll(".doll-slot.empty[data-kind='weapon']").length, hands: document.querySelectorAll(".doll-col:last-child .doll-slot.filled").length };
    });
    t.ok(`R3: three hands full → no empty hand slot (${cap.hands} held)`, cap.empty === 0 && cap.hands === 3);
    // Magic + story on a mage
    await e3(() => window.__go("home")); await p3.waitForTimeout(100);
    await p3.click("#use-pregen"); await p3.waitForTimeout(150);
    await e3(() => document.querySelectorAll(".card-grid .card")[0].click()); await p3.waitForTimeout(300);
    await e3(() => document.querySelector(".tab[data-tab='magic']").click()); await p3.waitForTimeout(100);
    const mage = await e3(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0]);
    t.eq("R3: a card per trick and spell", await e3(() => document.querySelectorAll(".spell-deck .spell-card").length), mage.spells.tricks.length + mage.spells.known.length);
    await e3(() => document.querySelectorAll(".spell-deck")[1].querySelector(".sc-open").click()); await p3.waitForTimeout(150);
    t.ok("R3: a spell card opens its full text, cost and Cast", await e3(() => { const m = document.querySelector(".modal-card"); return !!m && /WP per power level/.test(m.textContent) && /Cast/.test(m.textContent) && m.querySelector(".ss-text").textContent.length > 20; }));
    await e3(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => b.textContent.trim() === "Cast").click()); await p3.waitForTimeout(200);
    t.ok("R3: Cast from the card opens the real cast roll", await e3(() => /Power level|WP/.test(document.querySelector(".modal-card").textContent) && /Cast:/.test(document.querySelector(".modal-card").textContent)));
    await e3(() => document.querySelector(".modal-x").click()); await p3.waitForTimeout(80);
    await e3(() => document.querySelector(".tab[data-tab='story']").click()); await p3.waitForTimeout(100);
    t.ok("R3: story in play shows the weakness, no rename field", await e3(() => /Weakness/.test(document.querySelector("#sheet-pane-story").textContent) && ![...document.querySelectorAll("#sheet-pane-story label")].some((l) => l.textContent === "Name")));
    await e3(() => document.querySelector("#sheet-edit").click()); await p3.waitForTimeout(200);
    t.ok("R3: ✎ Edit reveals rename + delete", await e3(() => document.querySelector(".sheet-root").classList.contains("is-edit") && [...document.querySelectorAll("#sheet-pane-story label")].some((l) => l.textContent === "Name") && /Delete hero/.test(document.querySelector("#sheet-pane-story").textContent)));
    t.ok(`R3: no JS page errors (${p3._errors.length})`, p3._errors.length === 0);
    p3._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p3.close();
    // ---- R4 the dice table ----
    const p4 = await newPage({}, { width: 390, height: 844 });
    await p4.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p4.waitForTimeout(200);
    const e4 = (f, a) => p4.evaluate(f, a);
    await p4.click("#use-pregen"); await p4.waitForTimeout(150);
    await e4(() => document.querySelectorAll(".card-grid .card")[2].click()); await p4.waitForTimeout(300);
    const kn = await e4(() => JSON.parse(localStorage.getItem("dragonbane.characters"))[0]);
    const agl = Object.entries(kn.skills).find(([, v]) => v.attribute === "AGL");
    await e4(([id, n]) => { const c = JSON.parse(localStorage.getItem("dragonbane.characters")); c[0].state.conditions.dazed = true; localStorage.setItem("dragonbane.characters", JSON.stringify(c)); }, [kn.id, agl[0]]);
    await e4(([id, n]) => import("/src/roller.js").then((m) => m.Roller.skill(id, n)), [kn.id, agl[0]]); await p4.waitForTimeout(200);
    const dt = await e4(() => { const m = document.querySelector(".modal-card"); return { full: m.classList.contains("dice-modal"), cells: m.querySelectorAll(".t-bar .tb-c").length, ok: m.querySelectorAll(".t-bar .tb-c.ok").length, dice: m.querySelectorAll(".dt-tray .dt-die").length, bane: !!m.querySelector(".dt-tray.bane"), big: !!m.querySelector(".roll-go .rg-die svg") }; });
    t.ok("R4: roll dialog is the dice table (full height + big d20 button)", dt.full && dt.big);
    t.eq("R4: 1–20 strip with the success zone = skill level", `${dt.cells}/${dt.ok}`, `20/${agl[1].level}`);
    t.ok("R4: a Dazed bane shows two bane dice (keep highest)", dt.dice === 2 && dt.bane);
    await e4(() => { document.querySelector(".dt-boon").click(); document.querySelector(".dt-boon").click(); }); await p4.waitForTimeout(60);
    t.ok("R4: two boons over one bane → net boon, two dice, keep lowest", await e4(() => document.querySelectorAll(".dt-tray.boon .dt-die").length === 2 && /keep lowest/.test(document.querySelector(".dt-net").textContent)));
    await e4(() => document.querySelector(".modal-card .roll-go").click()); await p4.waitForTimeout(200);
    t.ok("R4: the rolled number is marked on the strip", await e4(() => { const hit = document.querySelector(".t-bar .tb-c.hit"); const n = +document.querySelector(".roll-stage .d20-n").textContent; return !!hit && +hit.dataset.n === n; }));
    await e4(() => document.querySelector(".modal-x").click());
    await e4((id) => import("/src/sheet.js").then((m) => m.Sheet.deathRollModal(id)), kn.id); await p4.waitForTimeout(150);
    t.eq("R4: death roll uses the strip against CON", await e4(() => document.querySelectorAll(".modal-card .t-bar .tb-c.ok").length), kn.attributes.CON);
    t.ok(`R4: no JS page errors (${p4._errors.length})`, p4._errors.length === 0);
    p4._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p4.close();
  },
};
