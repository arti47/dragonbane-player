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
  },
};
