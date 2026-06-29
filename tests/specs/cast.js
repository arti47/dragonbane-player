/* cast.js — spells open a non-empty cast modal (guards the "spells open with no
   text" / broken-cast class of bug). Opens the mage pregen, expands the magic
   sections, and casts several spells, asserting each resolution modal renders
   the spell's text and is not an empty shell. */
module.exports = {
  name: "cast",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ bookOfMagic: true });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    // Aodhan (index 0) is the Core Set mage.
    await page.click("#use-pregen");
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0]?.click());
    await page.waitForTimeout(400);

    // Open every magic accordion on the sheet.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { if (/Magic|Spell|Trick/i.test(d.textContent)) d.open = true; }));
    await page.waitForTimeout(150);

    const castCount = await page.evaluate(() => document.querySelectorAll(".cast-btn").length);
    t.ok("mage has castable spells/tricks", castCount > 0);

    const toTest = Math.min(castCount, 5);
    let opened = 0, withText = 0;
    for (let i = 0; i < toTest; i++) {
      const info = await page.evaluate((idx) => {
        const btns = [...document.querySelectorAll(".cast-btn")];
        const b = btns[idx];
        if (!b) return null;
        const name = (b.closest(".cast-row")?.querySelector("b")?.textContent || "").trim();
        b.click();
        return { name };
      }, i);
      if (!info) continue;
      await page.waitForTimeout(180);
      const modal = await page.evaluate(() => {
        const cards = [...document.querySelectorAll(".modal-card")];
        const m = cards[cards.length - 1];
        if (!m) return null;
        const body = m.querySelector(".modal-body") || m;
        return { text: (body.textContent || "").replace(/\s+/g, " ").trim(), len: (body.textContent || "").trim().length };
      });
      if (modal) {
        opened++;
        // A real cast modal has substantial body content (effect text + controls),
        // not just a title bar — the regression we are guarding against.
        if (modal.len > 25) withText++;
      }
      await page.evaluate(() => [...document.querySelectorAll(".modal-x")].pop()?.click());
      await page.waitForTimeout(80);
    }

    t.eq("each tested cast opened a modal", opened, toTest);
    t.eq("each cast modal has body text (not an empty shell)", withText, toTest);
    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    await page.close();
  },
};
