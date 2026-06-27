/* gm.js — GM Screen (Phase 21).
   With the GM Screen setting on, the 🎲 GM tab appears and the dashboard works:
   party panel lists characters with vitals, the drop-into-combat pickers exist,
   the GM reference tables render, and a "hand out" condition persists to the
   character. Also checks the new Demon fumble tables are present in the data. */
module.exports = {
  name: "gm",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ gmScreen: true });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // New rules data present
    const data = await page.evaluate(() => ({
      melee: (window.DRAGONBANE.demonMelee || []).length,
      ranged: (window.DRAGONBANE.demonRanged || []).length,
      site: (window.DRAGONBANE.leavingSite || []).length,
    }));
    t.eq("Demon melee fumble table (D6)", data.melee, 6);
    t.eq("Demon ranged fumble table (D6)", data.ranged, 6);
    t.eq("Leaving-the-site table (D6)", data.site, 6);

    // GM tab is visible when the setting is on
    const navVisible = await page.evaluate(() => {
      const b = document.querySelector("#app-nav button[data-route='gm']");
      return b && getComputedStyle(b).display !== "none";
    });
    t.ok("GM nav tab visible when enabled", navVisible);

    // Create a hero, then open the GM screen
    await page.click("#use-pregen"); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0]?.click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='gm']")?.click());
    await page.waitForTimeout(250);

    const screen = await page.evaluate(() => {
      const root = document.querySelector(".screen-gm");
      return {
        mounted: !!root,
        hasParty: /Party/.test(document.body.textContent),
        partyRows: document.querySelectorAll(".gm-row").length,
        hasVitals: /HP\b/.test(document.querySelector(".gm-row")?.textContent || ""),
        dropSelects: document.querySelectorAll(".screen-gm .inv-add select").length,
        refTables: document.querySelectorAll(".screen-gm details.rule-accordion").length,
      };
    });
    t.ok("GM screen mounted", screen.mounted);
    t.ok("party panel present", screen.hasParty);
    t.ok("party lists the created hero", screen.partyRows >= 1);
    t.ok("party row shows vitals", screen.hasVitals);
    t.ok("drop-into-combat pickers present", screen.dropSelects >= 1);
    t.ok("GM reference tables render (incl. fumble tables)", screen.refTables >= 4);

    // Reference tables roll and output an entry
    const rolled = await page.evaluate(() => {
      const d = document.querySelector(".screen-gm details.rule-accordion");
      if (!d) return null;
      d.open = true;
      const btn = [...d.querySelectorAll("button")].find((b) => /Roll/.test(b.textContent));
      if (!btn) return null;
      btn.click();
      const out = d.querySelector(".roll-result");
      return out ? out.textContent : null;
    });
    t.ok("table Roll button outputs a D6 entry", !!rolled && /D6:\s*[1-6]/.test(rolled));

    // Broadcast panel shows the not-synced hint when local (no Firebase in tests)
    const broadcast = await page.evaluate(() => {
      const h = [...document.querySelectorAll(".screen-gm .panel")].find((p) => /Message players/.test(p.textContent));
      return h ? h.textContent : null;
    });
    t.ok("broadcast panel present", !!broadcast);
    t.ok("broadcast shows campaign hint when not synced", /campaign/i.test(broadcast || ""));

    // Hand out a condition and confirm it persists to the character
    await page.evaluate(() => [...document.querySelectorAll(".gm-row button")].find((b) => /Condition/.test(b.textContent))?.click());
    await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll(".modal-card .skill-chip")][0]?.click());
    await page.waitForTimeout(200);
    const applied = await page.evaluate(() => {
      const chars = JSON.parse(localStorage.getItem("dragonbane.characters") || "[]");
      const c = chars[chars.length - 1];
      return Object.values((c.state && c.state.conditions) || {}).some((v) => v === true);
    });
    t.ok("handed-out condition persists to the character", applied);

    // GM tab hidden when the setting is off
    const page2 = await newPage({});
    await page2.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page2.waitForTimeout(300);
    const hidden = await page2.evaluate(() => {
      const b = document.querySelector("#app-nav button[data-route='gm']");
      return b && getComputedStyle(b).display === "none";
    });
    t.ok("GM tab hidden when disabled", hidden);
    await page2.close();

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    await page.close();
  },
};
