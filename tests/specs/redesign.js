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
    // ---- R5 the fight ----
    const p5 = await newPage({}, { width: 390, height: 844 });
    await p5.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p5.waitForTimeout(200);
    const e5 = (f, a) => p5.evaluate(f, a);
    await p5.click("#use-pregen"); await p5.waitForTimeout(150);
    await e5(() => document.querySelectorAll(".card-grid .card")[2].click()); await p5.waitForTimeout(300);
    await e5(async () => { const { Store } = await import("/src/store.js"); const id = JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id; const { classifyItem } = await import("/src/rules.js"); Store.update(id, (c) => { let w = 0; c.inventory.items.forEach((i) => { if (classifyItem(i.name) === "weapon" && w < 1) { i.equipped = true; w++; } }); }); });
    await e5(() => window.__go("party")); await p5.waitForTimeout(200);
    t.ok("R5: empty fight → the add drawer is open", await e5(() => document.querySelector(".add-panel.gm-drawer").open));
    await e5(() => { const s = document.querySelectorAll(".inv-add select"); s[0].selectedIndex = 1; s[0].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[0].click(); }); await p5.waitForTimeout(150);
    await e5(() => { const s = document.querySelectorAll(".inv-add select"); s[2].value = "goblin_scout"; s[2].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[2].click(); }); await p5.waitForTimeout(200);
    t.eq("R5: initiative strip has a card per fighter", await e5(() => document.querySelectorAll(".init-strip .is-item").length), 2);
    t.eq("R5: focus view shows one card", await e5(() => [...document.querySelectorAll(".combat-list .cb-card")].filter((c) => c.getClientRects().length).length), 1);
    t.ok("R5: the strip marks who acts now", await e5(() => !!document.querySelector(".init-strip .is-item.cur")));
    await e5(() => [...document.querySelectorAll(".init-strip .is-item")].find((b) => /Makander/.test(b.textContent)).click()); await p5.waitForTimeout(150);
    t.ok("R5: tapping a strip card focuses that fighter", await e5(() => /Makander/.test(document.querySelector(".cb-card.is-focus .cb-name").textContent)));
    t.eq("R5: a hero's card leads with Attack · Cast · Move · Other", await e5(() => [...document.querySelectorAll(".cb-card.is-focus .ta-btn b")].map((b) => b.textContent).join(",")), "Attack,Cast,Move,Other");
    await e5(() => document.querySelector(".cb-card.is-focus .ta-btn").click()); await p5.waitForTimeout(150);
    t.ok("R5: Attack with one weapon opens the attack roll", await e5(() => !!document.querySelector(".modal-card.dice-modal") && /Roll Attack/.test(document.querySelector(".modal-card").textContent)));
    await e5(() => document.querySelector(".modal-x").click());
    await e5(() => [...document.querySelectorAll(".cb-card.is-focus .ta-btn")].pop().click()); await p5.waitForTimeout(150);
    t.ok("R5: Other lists Dash, Parry, Dodge, Help", await e5(() => { const t = document.querySelector(".modal-card .pick-list").textContent; return /Dash/.test(t) && /Parry/.test(t) && /Dodge/.test(t) && /Help/.test(t); }));
    await e5(() => document.querySelector(".modal-x").click());
    const before = await e5(async () => { const { Combat } = await import("/src/combat.js"); const st = Combat.load(); return Combat.ordered(st).filter((c) => c.init != null).find((c) => !c.done).id; });
    await e5(() => document.querySelector(".cb-card.current .end-turn").click()); await p5.waitForTimeout(200);
    t.ok("R5: ✓ End turn marks the current fighter done", await e5(async (id) => { const { Combat } = await import("/src/combat.js"); return Combat.load().combatants.find((c) => c.id === id).done === true; }, before));
    await e5(() => document.querySelector(".view-tog").click()); await p5.waitForTimeout(150);
    t.eq("R5: List view shows every card", await e5(() => [...document.querySelectorAll(".combat-list .cb-card")].filter((c) => c.getClientRects().length).length), 2);
    t.ok(`R5: no JS page errors (${p5._errors.length})`, p5._errors.length === 0);
    p5._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p5.close();
    // ---- R6 story: solo timeline + oracle box; GM wheel + crests ----
    const p6 = await newPage({ soloMode: true, gmScreen: true }, { width: 390, height: 844 });
    await p6.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p6.waitForTimeout(200);
    const e6 = (f, a) => p6.evaluate(f, a);
    await p6.click("#use-pregen"); await p6.waitForTimeout(150);
    await e6(() => document.querySelectorAll(".card-grid .card")[0].click()); await p6.waitForTimeout(300);
    await e6(() => localStorage.setItem("dragonbane.soloHeroId", JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id));
    await e6(() => window.__go("story")); await p6.waitForTimeout(200);
    t.eq("R6: Story opens Solo (first enabled mode)", await e6(() => document.querySelector("#screen").dataset.route), "solo");
    t.ok("R6: no tab strip — one timeline + an action bar of five tools", await e6(() => !document.querySelector("#screen .tabs") && document.querySelectorAll(".solo-bar .sb-btn").length === 5));
    await e6(() => document.querySelector(".sb-btn[data-tool='ask']").click()); await p6.waitForTimeout(150);
    t.ok("R6: Ask opens the oracle box (question + 3 likelihoods)", await e6(() => { const m = document.querySelector(".modal-card"); return !!m && !!m.querySelector("#solo-f-q") && m.querySelectorAll(".lp-btn").length === 3; }));
    await e6(() => { document.querySelector(".lp-btn[data-like='likely']").click(); document.querySelector("#solo-f-q").value = "Is the bridge guarded?"; document.querySelector("#solo-f-roll").click(); }); await p6.waitForTimeout(150);
    t.ok("R6: the likelihood choice drives the roll (2D6 highest)", await e6(() => document.querySelector("#solo-f-like").value === "likely" && /highest/.test(document.querySelector("#solo-f-out").textContent)));
    await e6(() => document.querySelector(".modal-x").click()); await p6.waitForTimeout(100);
    t.ok("R6: the answer lands in Story so far with the question", await e6(() => { const e = [...document.querySelectorAll(".solo-tl .j-entry")].pop(); return !!e && e.classList.contains("k-oracle") && /Is the bridge guarded\? →/.test(e.textContent); }));
    t.ok("R6: the oracle panel goes back to its shelf", await e6(() => !!document.querySelector(".solo-shelf #solo-f-roll")));
    await e6(() => { document.querySelector(".sb-btn[data-tool='inspire']").click(); }); await p6.waitForTimeout(100);
    await e6(() => document.querySelector("#solo-i-all").click()); await p6.waitForTimeout(100);
    await e6(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /Thread/.test(b.textContent)).click()); await p6.waitForTimeout(80);
    await e6(() => document.querySelector(".modal-x").click()); await p6.waitForTimeout(100);
    t.eq("R6: inspiration logged too (2 entries)", await e6(() => document.querySelectorAll(".solo-tl .j-entry").length), 2);
    t.ok("R6: ＋ Thread counts on the Threads chip", await e6(() => /Threads\s*1/.test(document.querySelector(".solo-chips").textContent)));
    // GM
    await e6(() => document.querySelector(".mode-switch [data-mode='gm']").click()); await p6.waitForTimeout(250);
    t.eq("R6: GM phase wheel — six phases around a hub", await e6(() => `${document.querySelectorAll(".phase-wheel .phase-btn:not(.pw-hub)").length}/${document.querySelectorAll(".phase-wheel .pw-hub").length}`), "6/1");
    await e6(() => [...document.querySelectorAll(".phase-wheel .phase-btn")].find((b) => /Resting/.test(b.textContent)).click()); await p6.waitForTimeout(250);
    t.ok("R6: tapping a phase sets it (hub names it)", await e6(() => /Resting/.test(document.querySelector(".pw-hub").textContent) && JSON.parse(localStorage.getItem("dragonbane.table")).phase.key === "rest"));
    t.ok("R6: party crests carry HP/WP rings", await e6(() => !!document.querySelector(".gm-row .vital-rings .vr-seg.hp")));
    await e6(() => [...document.querySelectorAll(".gm-tile")].find((b) => /Ask a roll/.test(b.textContent)).click()); await p6.waitForTimeout(150);
    t.ok("R6: Ask a roll tile opens the request panel", await e6(() => !!document.querySelector(".modal-card select[aria-label='Skill to roll']")));
    await e6(() => document.querySelector(".modal-x").click()); await p6.waitForTimeout(100);
    t.ok("R6: …and returns it to the live table panel", await e6(() => !!document.querySelector("#screen .gm-table .gm-ask")));
    await e6(() => [...document.querySelectorAll(".gm-tile")].find((b) => /GM tables/.test(b.textContent)).click()); await p6.waitForTimeout(150);
    t.eq("R6: GM tables tile lists the four D6 tables", await e6(() => document.querySelectorAll(".modal-card details.rule-accordion").length), 4);
    await e6(() => document.querySelector(".modal-x").click());
    t.ok(`R6: no JS page errors (${p6._errors.length})`, p6._errors.length === 0);
    p6._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p6.close();
    // ---- R7 the Book, rule cards, settings presets ----
    const p7 = await newPage({ gmScreen: true }, { width: 390, height: 844 });
    await p7.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await p7.waitForTimeout(200);
    const e7 = (f, a) => p7.evaluate(f, a);
    await e7(() => window.__go("book")); await p7.waitForTimeout(200);
    t.ok("R7: the Book opens on its front page of chapter tiles", await e7(() => document.querySelector(".rules-lib").dataset.mode === "home" && document.querySelectorAll(".ch-tile").length === 11 && !document.querySelector("#rules-acc-wrap").getClientRects().length));
    await e7(() => document.querySelector(".ch-tile[data-ch='kin']").click()); await p7.waitForTimeout(150);
    t.ok("R7: a tile opens just that chapter", await e7(() => { const vis = [...document.querySelectorAll(".rl-cat")].filter((c) => c.getClientRects().length); return document.querySelector(".rules-lib").dataset.mode === "chapter" && vis.length === 1 && vis[0].dataset.cat === "kin" && vis[0].open; }));
    await e7(() => document.querySelector(".ch-back").click()); await p7.waitForTimeout(100);
    t.ok("R7: ← All chapters returns to the front page", await e7(() => document.querySelector(".rules-lib").dataset.mode === "home"));
    await p7.fill("#rules-search", "fireball"); await p7.waitForTimeout(250);
    t.ok("R7: searching searches every chapter", await e7(() => document.querySelector(".rules-lib").dataset.mode === "search" && [...document.querySelectorAll(".rl-cat")].some((c) => c.dataset.cat === "spells" && c.getClientRects().length)));
    await p7.click(".search-clear"); await p7.waitForTimeout(100);
    await e7(() => document.querySelector(".ch-tile[data-ch='gmtables']").click()); await p7.waitForTimeout(120);
    t.eq("R7: GM tables chapter (GM on) lists the four D6 tables", await e7(() => document.querySelectorAll(".rl-cat.is-ch .rl-entry").length), 4);
    // Rule cards
    await e7(() => window.__go("home")); await p7.waitForTimeout(100);
    await p7.click("#use-pregen"); await p7.waitForTimeout(150);
    await e7(() => document.querySelectorAll(".card-grid .card")[0].click()); await p7.waitForTimeout(300);
    await e7(() => document.querySelector(".cond-seal").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))); await p7.waitForTimeout(150);
    t.ok("R7: right-click / long-press a condition → its rule card", await e7(() => { const m = document.querySelector(".modal-card .rule-card"); return !!m && /bane/.test(m.textContent) && /push/.test(m.textContent); }));
    await e7(() => document.querySelector(".modal-x").click()); await p7.waitForTimeout(80);
    const lp = await e7(async () => {
      const seal = document.querySelectorAll(".cond-seal")[1];
      const r = seal.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + 5, clientY: r.top + 5, pointerId: 1, button: 0 };
      seal.dispatchEvent(new PointerEvent("pointerdown", o)); await new Promise((res) => setTimeout(res, 650));
      seal.dispatchEvent(new PointerEvent("pointerup", o)); seal.click(); await new Promise((res) => setTimeout(res, 150));
      const c = JSON.parse(localStorage.getItem("dragonbane.characters"))[0];
      return { card: !!document.querySelector(".modal-card .rule-card"), toggled: Object.values(c.state.conditions || {}).some(Boolean) };
    });
    t.ok("R7: a long press shows the card and does not also toggle the seal", lp.card && !lp.toggled);
    await e7(() => document.querySelector(".modal-x")?.click());
    await e7(() => document.querySelector(".stat-cell").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }))); await p7.waitForTimeout(120);
    t.ok("R7: attribute rule card names what it does (STR → damage bonus)", await e7(() => /damage bonus/i.test(document.querySelector(".modal-card .rule-card").textContent)));
    await e7(() => document.querySelector(".modal-x")?.click());
    // Settings presets
    await e7(() => window.__go("about")); await p7.waitForTimeout(200);
    t.eq("R7: three play-style presets", await e7(() => document.querySelectorAll(".preset-card").length), 3);
    t.ok("R7: every switch sits under Advanced settings (closed)", await e7(() => { const d = document.querySelector(".adv-set"); return !!d && !d.open && !!d.querySelector(".toggle"); }));
    await e7(() => [...document.querySelectorAll(".preset-card")].find((b) => /Solo/.test(b.textContent)).click()); await p7.waitForTimeout(200);
    t.ok("R7: Solo preset turns solo mode on and shows as chosen", await e7(() => JSON.parse(localStorage.getItem("dragonbane.settings")).soloMode === true && [...document.querySelectorAll(".preset-card")].find((b) => /Solo/.test(b.textContent)).getAttribute("aria-pressed") === "true"));
    await e7(() => [...document.querySelectorAll(".preset-card")].find((b) => /Full rules/.test(b.textContent)).click()); await p7.waitForTimeout(200);
    t.ok("R7: Full rules preset → Book of Magic + GM automation", await e7(() => { const st = JSON.parse(localStorage.getItem("dragonbane.settings")); return st.bookOfMagic === true && st.gmAutomation === true; }));
    t.ok(`R7: no JS page errors (${p7._errors.length})`, p7._errors.length === 0);
    p7._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await p7.close();
  },
};
