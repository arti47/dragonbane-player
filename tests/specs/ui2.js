/* ui2.js — guards the audit-#2 UI behaviours (no content changes):
     help ⓘ sits in each screen's title row and opens its steps in a dialog;
     the sheet mini-bar pins after scrolling and its HP − works;
     the wizard's tap-a-value → tap-an-attribute assignment;
     the combat round toolbar keeps secondary actions in a ⋯ menu;
     roll dialogs fold their spent controls after a roll. */
module.exports = {
  name: "ui2",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    // Help button placement on every main screen.
    for (const r of ["home", "party", "solo", "rules", "about"]) {
      await page.evaluate((rt) => document.querySelector(`#app-nav button[data-route='${rt}']`).click(), r);
      await page.waitForTimeout(120);
      const ok = await page.evaluate(() => !!document.querySelector("#screen .section-title .help-btn"));
      t.ok(`${r}: help ⓘ in the title row`, ok);
    }
    await page.evaluate(() => document.querySelector("#screen .help-btn").click());
    await page.waitForTimeout(120);
    const help = await page.evaluate(() => { const m = document.querySelector(".modal-card"); return m ? m.textContent : ""; });
    t.ok("help ⓘ opens its steps in a dialog", /How to use/.test(help) && /Toggle content|Book of Magic/.test(help));
    await page.evaluate(() => document.querySelector(".modal-x").click());

    // Wizard tap-assign.
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']").click());
    await page.waitForTimeout(100);
    await page.click("#new-hero"); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll("#screen button")].find((b) => /Roll attributes/.test(b.textContent)).click());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelectorAll(".roll-chip")[2].click());
    await page.waitForTimeout(60);
    await page.evaluate(() => document.querySelectorAll(".attr-slot")[0].click());
    await page.waitForTimeout(60);
    const wiz = await page.evaluate(() => ({ slot: document.querySelectorAll(".attr-slot")[0].textContent.trim(), chip: document.querySelectorAll(".roll-chip")[2].textContent.trim(), used: document.querySelectorAll(".roll-chip")[2].classList.contains("used"), sel: document.querySelectorAll(".attr-row select")[0].value }));
    t.ok(`wizard: tapped value lands in STR (${wiz.slot})`, wiz.slot === wiz.chip && wiz.used && wiz.sel === "2");
    t.ok("wizard: progress bar present", await page.evaluate(() => !!document.querySelector(".wiz-track .wiz-bar i")));

    // Sheet mini-bar.
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']").click());
    await page.waitForTimeout(100);
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await page.waitForTimeout(300);
    t.ok("sheet: mini-bar hidden at top", await page.evaluate(() => !document.querySelector(".mini-bar").classList.contains("show")));
    await page.evaluate(() => window.scrollTo(0, 1200)); await page.waitForTimeout(300);
    t.ok("sheet: mini-bar pins after scrolling", await page.evaluate(() => document.querySelector(".mini-bar").classList.contains("show")));
    const hp0 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0].state.hp);
    await page.evaluate(() => document.querySelector(".mini-v.hp .mini-step").click()); await page.waitForTimeout(80);
    const hp1 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0].state.hp);
    t.eq("sheet: mini-bar HP − lowers HP by 1", hp1, hp0 - 1);

    // Roll dialog folds spent controls.
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector(".tab[data-tab='skills']").click(); });
    await page.waitForTimeout(80);
    await page.evaluate(() => document.querySelector(".sk-name").click()); await page.waitForTimeout(120);
    await page.evaluate(() => document.querySelector(".modal-card .roll-go").click()); await page.waitForTimeout(150);
    const fold = await page.evaluate(() => { const c = document.querySelector(".modal-card"); return { stage: !!c.querySelector(".roll-stage"), ctlHidden: getComputedStyle(c.querySelector(".roll-ctl")).display === "none" }; });
    t.ok("roll dialog: stage shown + boon/bane row folded", fold.stage && fold.ctlHidden);
    await page.evaluate(() => document.querySelector(".modal-x").click());

    // Combat ⋯ menu.
    await page.evaluate(() => { window._combatAddOpen = true; document.querySelector("#app-nav button[data-route='party']").click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select")[1]; s.selectedIndex = 1; s.dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(150);
    const cm = await page.evaluate(() => ({ primary: [...document.querySelectorAll(".round-actions > .btn")].map((b) => b.textContent.trim()), menu: [...document.querySelectorAll(".round-menu .btn")].map((b) => b.textContent.trim()), card: !!document.querySelector(".play-card") }));
    t.ok(`combat: primary actions visible (${cm.primary.join(", ")})`, cm.primary.length === 2);
    t.ok("combat: End combat lives in the ⋯ menu", cm.menu.some((x) => /End combat/.test(x)));
    t.ok("combat: initiative shown as a playing card", cm.card);

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
