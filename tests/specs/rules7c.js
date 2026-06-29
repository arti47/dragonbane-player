/* rules7c.js — guards the §7C rules-accuracy fixes that live in the data layer
   (single source of truth) plus the headline Ferocity behaviour:
     F12 — metal flags on armor (studded leather is metal)
     F14 — Firebird is a CORE Elementalism rank-3 spell (reachable without Book of Magic)
     F15 — every monster has a numeric Ferocity, and a Dragon rolls 3 attacks/turn */
module.exports = {
  name: "rules7c",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({});
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    // ---- F12: armor metal flags ----
    const armor = await page.evaluate(() => {
      const a = (window.DRAGONBANE.armor || []);
      const by = (n) => a.find((x) => x.name === n) || {};
      return { studded: by("Studded Leather").metal, chain: by("Chainmail").metal, plate: by("Plate Armor").metal, leather: by("Leather").metal };
    });
    t.eq("F12: Studded Leather is metal", armor.studded, true);
    t.eq("F12: Chainmail is metal", armor.chain, true);
    t.eq("F12: Plate is metal", armor.plate, true);
    t.eq("F12: Leather is not metal", armor.leather, false);

    // ---- F14: Firebird is a core Elementalism rank-3 spell ----
    const fb = await page.evaluate(() => {
      const ele = ((window.DRAGONBANE.spells || {}).elementalism || {}).spells || [];
      const f = ele.find((s) => s.name === "Firebird");
      const bomDup = (((window.DRAGONBANE_MAGIC || {}).newSpells || {}).elementalism || {}).spells || [];
      return { inCore: !!f, rank: f && f.rank, bomDup: bomDup.some((s) => s.name === "Firebird") };
    });
    t.ok("F14: Firebird is in core Elementalism", fb.inCore);
    t.eq("F14: Firebird is rank 3", fb.rank, 3);
    t.ok("F14: Firebird not duplicated in Book of Magic", !fb.bomDup);

    // ---- F15: ferocity data ----
    const fero = await page.evaluate(() => {
      const ms = (typeof DRAGONBANE_MONSTERS !== "undefined" ? DRAGONBANE_MONSTERS : []);
      const by = (id) => (ms.find((m) => m.id === id) || {}).ferocity;
      return {
        total: ms.length,
        allNumeric: ms.every((m) => typeof m.ferocity === "number" && m.ferocity >= 1),
        dragon: by("dragon"), demon: by("demon"), guardian: by("guardian_demon"), octopus: by("giant_octopus"),
      };
    });
    t.ok("F15: every monster has Ferocity >= 1", fero.allNumeric);
    t.eq("F15: Dragon Ferocity 3", fero.dragon, 3);
    t.eq("F15: Demon Ferocity 2", fero.demon, 2);
    t.eq("F15: Guardian Demon Ferocity 1", fero.guardian, 1);
    t.eq("F15: Giant Octopus Ferocity 4", fero.octopus, 4);

    // ---- F15: a Dragon rolls 3 attacks in the combat tracker ----
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='party']")?.click());
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const monSel = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => /Bestiary monster/.test(o.textContent)));
      const opt = [...monSel.options].find((o) => /^Dragon \(/.test(o.textContent));
      monSel.value = opt.value; monSel.dispatchEvent(new Event("change"));
      monSel.parentElement.querySelector("button").click();
    });
    await page.waitForTimeout(250);
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Roll D6 Monster Attack Table/.test(b.textContent))?.click());
    await page.waitForTimeout(200);
    const txt = await page.evaluate(() => { const m = document.querySelector(".modal-card"); return m ? m.textContent : ""; });
    t.ok("F15: Dragon attack modal shows Ferocity 3", /Ferocity 3/.test(txt));
    t.ok("F15: Dragon makes 3 attacks (Attack 1/3 & 3/3)", /Attack 1\/3/.test(txt) && /Attack 3\/3/.test(txt));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
