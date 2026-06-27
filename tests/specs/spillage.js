/* spillage.js — no horizontal text/layout overflow on any screen.
   At 360px and 390px, walks every screen (sheet, home, combat with monsters +
   cards expanded, rules with accordions open, solo, about, cast modal) and
   asserts the page never overflows and no leaf element spills its box. Guards the
   mobile-overflow regressions fixed in the v40–v51 changelog. */

// Runs in the browser: returns page overflow + count of spilling elements.
const DETECTOR = () => {
  const vw = document.documentElement.clientWidth;
  let count = 0;
  const seen = new Set();
  document.querySelectorAll("#screen *, .modal-card *, .app-header *, .app-nav button").forEach((el) => {
    if (!el.getClientRects().length) return;
    const cs = getComputedStyle(el);
    const ovx = cs.overflowX;
    if ((ovx === "visible" || ovx === "clip") && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
      if (el.children.length === 0 || el.tagName === "BUTTON" || /move-val|cb-name|vital-val|tag|status-pill/.test(el.className || "")) {
        const key = (el.className || "") + "|" + (el.textContent || "").slice(0, 20);
        if (!seen.has(key)) { seen.add(key); count++; }
      }
    }
  });
  return { pageOverflow: document.documentElement.scrollWidth - vw, count };
};

module.exports = {
  name: "spillage",
  async run({ baseURL, newPage, t }) {
    for (const vw of [360, 390]) {
      const page = await newPage({ soloMode: true, bookOfMagic: true, gmAutomation: true, gmScreen: true }, { width: vw, height: 850 });
      page.on("dialog", (d) => d.accept("3"));
      await page.goto(baseURL + "/index.html", { waitUntil: "load" });
      await page.waitForTimeout(300);

      const check = async (label) => {
        const r = await page.evaluate(DETECTOR);
        t.ok(`${vw}px ${label}: no page overflow (${r.pageOverflow}px)`, r.pageOverflow <= 2);
        t.ok(`${vw}px ${label}: no spilling elements (${r.count})`, r.count === 0);
      };

      // Two heroes (mage + knight)
      await page.click("#use-pregen"); await page.waitForTimeout(120);
      await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0]?.click()); await page.waitForTimeout(200);
      await check("sheet(mage)");
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click()); await page.waitForTimeout(100);
      await page.click("#use-pregen"); await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelectorAll(".card-grid .card")[2]?.click()); await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click()); await page.waitForTimeout(100);
      await check("home");

      // Combat: add a hero, a monster, a boss NPC, then expand every card
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='party']")?.click()); await page.waitForTimeout(150);
      const sel = await page.$(".inv-add select"); if (sel) await sel.selectOption({ index: 1 });
      let sb = await page.$$(".inv-add .btn.secondary"); if (sb[0]) { await sb[0].click(); await page.waitForTimeout(120); }
      let sels = await page.$$(".inv-add select"); if (sels[1]) await sels[1].selectOption({ index: 1 });
      sb = await page.$$(".inv-add .btn.secondary"); if (sb[1]) { await sb[1].click(); await page.waitForTimeout(120); }
      sels = await page.$$(".inv-add select");
      if (sels[2]) {
        await sels[2].evaluate((s) => { const o = [...s.options].find((o) => /Boss|Chief|Archmage|Knight/.test(o.textContent)); if (o) { s.value = o.value; s.dispatchEvent(new Event("change")); } });
        sb = await page.$$(".inv-add .btn.secondary"); if (sb[2]) { await sb[2].click(); await page.waitForTimeout(120); }
      }
      await page.evaluate(() => document.querySelectorAll(".combat-row").forEach((r) => { const b = r.nextElementSibling; if (b && b.style.display === "none") r.click(); }));
      await page.waitForTimeout(200);
      await check("combat(expanded)");

      // Rules: open all accordions
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='rules']")?.click()); await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true))); await page.waitForTimeout(200);
      await check("rules(open)");

      // Solo + About
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='solo']")?.click()); await page.waitForTimeout(150);
      await check("solo");
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='about']")?.click()); await page.waitForTimeout(150);
      await check("about");

      // GM screen (party panel + reference tables open)
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='gm']")?.click()); await page.waitForTimeout(150);
      await page.evaluate(() => document.querySelectorAll(".screen-gm details").forEach((d) => (d.open = true))); await page.waitForTimeout(150);
      await check("gm-screen");

      // Cast modal over the mage sheet
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click()); await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelectorAll(".card[data-id]")[0]?.click()); await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { if (/Magic|Spell|Trick/i.test(d.textContent)) d.open = true; }));
      await page.evaluate(() => [...document.querySelectorAll(".cast-btn")][0]?.click());
      await page.waitForTimeout(200);
      await check("cast-modal");

      await page.close();
    }

    t.ok("spillage audit completed", true);
  },
};
