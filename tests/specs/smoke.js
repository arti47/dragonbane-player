/* smoke.js — app boots and the import-heavy runtime paths fire with no JS errors.
   This is the primary guard for the ES-module split: a missing import surfaces
   here as a pageerror or a dead interaction. */
module.exports = {
  name: "smoke",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true, bookOfMagic: true, gmAutomation: true });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const booted = await page.evaluate(() => ({
      nav: !!document.querySelector("#app-nav button"),
      db: !!window.DRAGONBANE,
      screen: document.querySelector("#screen").children.length > 0,
    }));
    t.ok("nav rendered", booted.nav);
    t.ok("DRAGONBANE data loaded", booted.db);
    t.ok("home screen rendered", booted.screen);

    // Pregen → sheet
    await page.click("#use-pregen");
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0]?.click());
    await page.waitForTimeout(400);
    const sheet = await page.evaluate(() => ({
      vitals: !!document.querySelector(".vital"),
      skills: /Skills/.test(document.body.textContent),
    }));
    t.ok("pregen sheet shows vitals", sheet.vitals);
    t.ok("pregen sheet shows skills", sheet.skills);

    // Skill roll (Roller ← Sheet ← core)
    await page.evaluate(() => {
      const e = [...document.querySelectorAll("button,.skill-name")].find((e) => /Awareness|Sneaking|Persuasion|Bushcraft/.test(e.textContent) && e.textContent.length < 30);
      if (e) e.click();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll(".modal-card button")].find((b) => /Roll/i.test(b.textContent))?.click());
    await page.waitForTimeout(150);
    const rolled = await page.evaluate(() => {
      const m = document.querySelector(".modal-card");
      return !!m && /\d/.test(m.textContent) && /(Success|Fail|Dragon|Demon|≤|vs)/i.test(m.textContent);
    });
    t.ok("skill roll produces a result", rolled);
    await page.evaluate(() => document.querySelector(".modal-x")?.click());
    await page.waitForTimeout(80);

    // Every tab renders
    for (const r of ["party", "solo", "rules", "about", "home"]) {
      await page.evaluate((rt) => document.querySelector(`#app-nav button[data-route='${rt}']`)?.click(), r);
      await page.waitForTimeout(200);
      const ok = await page.evaluate(() => document.querySelector("#screen").children.length > 0);
      t.ok(`tab '${r}' renders`, ok);
    }

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
