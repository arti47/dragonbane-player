/* inventory.js — slot-based encumbrance (CLAUDE.md §6.1, Phase 13).
   Opens each pregen and asserts the sheet's encumbrance line reports the correct
   slot limit (⌈STR/2⌉), then verifies the equip flow removes an item from the
   slot count (equipped armor/helmet/weapons are exempt). */
module.exports = {
  name: "inventory",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({});
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const count = await page.evaluate(() => (window.DRAGONBANE_PREGENS || []).length);

    for (let i = 0; i < count; i++) {
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click());
      await page.waitForTimeout(120);
      await page.click("#use-pregen");
      await page.waitForTimeout(150);
      await page.evaluate((idx) => document.querySelectorAll(".card-grid .card")[idx]?.click(), i);
      await page.waitForTimeout(300);

      const info = await page.evaluate(() => {
        const chars = JSON.parse(localStorage.getItem("dragonbane.characters") || "[]");
        const c = chars[chars.length - 1];
        const line = [...document.querySelectorAll("#screen .stat-line")].map((n) => n.textContent).find((tx) => /item slots used/.test(tx)) || "";
        const m = line.match(/(\d+)\s*\/\s*(\d+)\s*item slots used/);
        return { name: c.identity.name, str: c.attributes.STR, shownLimit: m ? Number(m[2]) : null };
      });
      const expLimit = Math.ceil(info.str / 2);
      t.eq(`${info.name}: slot limit == ceil(STR/2)`, info.shownLimit, expLimit);
    }

    // Equip flow on the last-opened sheet: equipping an item should drop the used count.
    const equip = await page.evaluate(async () => {
      const readUsed = () => {
        const line = [...document.querySelectorAll("#screen .stat-line")].map((n) => n.textContent).find((tx) => /item slots used/.test(tx)) || "";
        const m = line.match(/(\d+)\s*\/\s*(\d+)\s*item slots used/);
        return m ? Number(m[1]) : null;
      };
      const before = readUsed();
      const btn = [...document.querySelectorAll("#screen button")].find((b) => b.textContent.trim() === "Equip");
      if (!btn) return { skipped: true };
      btn.click();
      await new Promise((r) => setTimeout(r, 200));
      const after = readUsed();
      const equippedSection = /Equipped/.test(document.body.textContent);
      return { before, after, equippedSection };
    });
    if (equip.skipped) {
      t.ok("equip flow (no equippable item on this sheet — skipped)", true);
    } else {
      t.ok("equipping reduces used slots", equip.after != null && equip.before != null && equip.after < equip.before);
      t.ok("equipped section appears", equip.equippedSection);
    }

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    await page.close();
  },
};
