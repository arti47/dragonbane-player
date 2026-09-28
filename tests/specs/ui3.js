/* ui3.js — guards the audit-#3 UI behaviours (no content changes):
     removing an item shows an Undo toast that restores it;
     nav badges: red dot on Heroes when a hero is at 0 HP, gold dot on Combat mid-round;
     every <select> is themed (no native appearance);
     the sheet has a Print button and a print stylesheet that reveals every tab. */
module.exports = {
  name: "ui3",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({}, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await page.waitForTimeout(300);

    // Undo on inventory removal.
    await page.evaluate(() => document.querySelector(".tab[data-tab='gear']").click());
    const n0 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0].inventory.items.length);
    await page.evaluate(() => [...document.querySelectorAll(".inv-row .step.rm")].pop().click());
    await page.waitForTimeout(120);
    const n1 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0].inventory.items.length);
    t.eq("undo: item removed", n1, n0 - 1);
    t.ok("undo: toast offers Undo", await page.evaluate(() => !!document.querySelector(".toast .undo-btn")));
    await page.evaluate(() => document.querySelector(".toast .undo-btn").click());
    await page.waitForTimeout(120);
    const n2 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0].inventory.items.length);
    t.eq("undo: item restored", n2, n0);

    // Print affordance + print CSS reveals hidden panes.
    await page.evaluate(() => document.querySelector(".tab[data-tab='story']").click());
    t.ok("print: Print sheet button on Story tab", await page.evaluate(() => [...document.querySelectorAll("#screen button")].some((b) => /Print sheet/.test(b.textContent))));
    await page.emulateMedia({ media: "print" });
    const printed = await page.evaluate(() => ({ panes: [...document.querySelectorAll(".tab-panel")].every((p) => getComputedStyle(p).display !== "none"), nav: getComputedStyle(document.querySelector(".app-nav")).display }));
    t.ok("print: every tab pane visible", printed.panes);
    t.eq("print: nav hidden", printed.nav, "none");
    await page.emulateMedia({ media: "screen" });

    // Themed selects everywhere.
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='party']").click());
    await page.waitForTimeout(150);
    const native = await page.evaluate(() => [...document.querySelectorAll("select")].filter((s) => getComputedStyle(s).appearance !== "none").length);
    t.eq("selects: none use native appearance", native, 0);

    // Nav badges.
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select")[1]; s.selectedIndex = 1; s.dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(200);
    t.ok("badge: gold dot on Combat while a round runs", await page.evaluate(() => !!document.querySelector("#app-nav button[data-route='party'] .nav-dot.round")));
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[cs.length - 1].state.hp = 0; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); document.querySelector("#app-nav button[data-route='home']").click(); });
    await page.waitForTimeout(150);
    const dying = await page.evaluate(() => { const b = document.querySelector("#app-nav button[data-route='home']"); return { dot: !!b.querySelector(".nav-dot.dying"), label: b.getAttribute("aria-label") || "" }; });
    t.ok("badge: red dot on Heroes when a hero is dying", dying.dot);
    t.ok(`badge: announced to screen readers (${dying.label})`, /dying/.test(dying.label));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
