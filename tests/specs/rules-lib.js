/* rules-lib.js — guards the cleaned-up Rules library (layout only; guide wording unchanged):
     Guides / Reference groups with entry counts; no repeated title inside a category;
     guides as step/bullet lists, glossary as term rows, Journey Mishaps as D6 rows;
     tap-to-expand entry rows; weapons/armor tables; gear grouped by category;
     heroic-ability requirement filter; entry-level search (hide misses, open hits,
     result count) that resets on clear; the "Battered" typo replaced by the real six. */
module.exports = {
  name: "rules-lib",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({}, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.evaluate(() => window.__go('rules'));
    await page.waitForTimeout(200);

    const s = await page.evaluate(() => {
      const cat = (k) => document.querySelector(`details.rl-cat[data-cat='${k}']`);
      return {
        groups: [...document.querySelectorAll(".rl-group-h")].map((h) => h.textContent.trim()),
        guides: [...document.querySelectorAll(".rl-group")[0].querySelectorAll(".rl-cat")].map((c) => c.dataset.cat),
        heroicCount: cat("heroicAbilities").querySelector(".rl-count")?.textContent,
        dupTitle: !![...cat("howtoplay").querySelectorAll(".rule-content h3")].find((h) => /How to Play/.test(h.textContent)),
        steps: cat("howtoplay").querySelector(".rl-entry").querySelectorAll(".rl-steps li").length,
        gloss: cat("howtoplay").querySelectorAll(".rl-gloss .rl-row").length,
        mishaps: cat("journeys").querySelectorAll(".d6-row").length,
        stagesText: cat("stages").textContent,
        heroicRows: cat("heroicAbilities").querySelectorAll(".rl-entry").length,
        weaponRows: cat("equipment").querySelectorAll("tbody tr").length,
        gearGroups: cat("gear").querySelectorAll(".rl-block").length,
        collapsed: cat("gear").querySelector(".rl-entry").open === false,
      };
    });
    const D = await page.evaluate(() => ({ h: window.DRAGONBANE.heroicAbilities.length, w: window.DRAGONBANE.weapons.length + window.DRAGONBANE.armor.length + window.DRAGONBANE.helmets.length, m: window.DRAGONBANE.journeyMishaps.length }));
    t.ok(`groups: Guides + Reference (${s.groups.join(", ")})`, s.groups.join("|") === "Guides|Reference");
    t.eq("groups: guides are How to Play / Core Loop / Journeys", s.guides.join(","), "howtoplay,stages,journeys");
    t.eq("counts: heroic abilities count on the header", s.heroicCount, String(D.h));
    t.ok("no repeated 'How to Play' title inside the category", !s.dupTitle);
    t.eq("first session: 12 numbered steps", s.steps, 12);
    t.eq("glossary: 16 term rows", s.gloss, 16);
    t.eq("journeys: mishaps as D6 rows", s.mishaps, D.m);
    t.ok("core loop: no 'Battered'; lists the real six", !/Battered/.test(s.stagesText) && /Exhausted, Sickly, Dazed, Angry, Scared, Disheartened/.test(s.stagesText));
    t.eq("heroic abilities: one row each", s.heroicRows, D.h);
    t.eq("equipment: one table row per weapon/armor/helmet", s.weaponRows, D.w);
    t.ok(`gear: grouped by category (${s.gearGroups})`, s.gearGroups >= 5);
    t.ok("entries collapsed by default", s.collapsed);

    // Heroic-ability filter.
    const f = await page.evaluate(() => {
      const c = document.querySelector("details.rl-cat[data-cat='heroicAbilities']"); c.open = true;
      c.querySelector(".rl-hfilter [data-f='noreq']").click();
      const vis = [...c.querySelectorAll(".rl-entry")].filter((x) => getComputedStyle(x).display !== "none");
      const ok = vis.length > 0 && vis.every((x) => x.dataset.req === "noreq");
      c.querySelector(".rl-hfilter [data-f='all']").click(); c.open = false;
      return ok;
    });
    t.ok("heroic filter: 'No requirement' shows only no-req abilities", f);

    // Search.
    await page.fill("#rules-search", "fireball");
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const shown = [...document.querySelectorAll("details.rl-cat")].filter((c) => !c.hidden).map((c) => c.dataset.cat);
      const row = [...document.querySelectorAll(".rl-entry:not(.rl-school)")].find((x) => !x.hidden && /^Fireball/.test(x.querySelector(".rl-name").textContent.trim()));
      const hiddenOthers = [...document.querySelectorAll("details.rl-cat[data-cat='spells'] .rl-entry:not(.rl-school)")].filter((x) => x.hidden).length;
      return { shown, open: !!(row && row.open), hiddenOthers, count: document.querySelector(".search-count").textContent };
    });
    t.ok(`search: only matching categories remain (${r.shown.join(",")})`, r.shown.includes("spells") && !r.shown.includes("gear") && !r.shown.includes("kin"));
    t.ok("search: the Fireball row is open", r.open);
    t.ok(`search: non-matching spell rows hidden (${r.hiddenOthers})`, r.hiddenOthers > 10);
    t.ok(`search: result count (${r.count})`, /^\d+ results? in \d+ categor/.test(r.count));
    await page.click(".search-clear");
    await page.waitForTimeout(80);
    const c = await page.evaluate(() => ({ hidden: document.querySelectorAll(".rl-cat[hidden], .rl-entry[hidden], .rl-row[hidden]").length, open: document.querySelectorAll("details.rl-cat[open]").length, count: document.querySelector(".search-count").textContent }));
    t.ok(`clear: everything visible and re-collapsed (${JSON.stringify(c)})`, c.hidden === 0 && c.open === 0 && c.count === "");

    // Tutorial deep link still lands on How to Play.
    await page.evaluate(async () => { const { Screens } = await import("/src/screens.js"); Screens.openTutorial(); });
    await page.waitForTimeout(200);
    t.ok("tutorial deep link opens How to Play", await page.evaluate(() => document.querySelector("details.rl-cat[data-cat='howtoplay']").open));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
