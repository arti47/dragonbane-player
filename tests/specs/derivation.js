/* derivation.js — rules-accurate derived stats (CLAUDE.md §3).
   Instantiates all pregens (exercising Calc + buildSkills + stat derivation),
   then reads the persisted characters and checks each derived value against the
   rules: hpMax=CON, wpMax=WIL, movement=kin base+AGL mod, damage-bonus thresholds. */
module.exports = {
  name: "derivation",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({});
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    const count = await page.evaluate(() => (window.DRAGONBANE_PREGENS || []).length);
    t.ok("pregens available", count > 0);

    for (let i = 0; i < count; i++) {
      await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click());
      await page.waitForTimeout(120);
      await page.click("#use-pregen");
      await page.waitForTimeout(150);
      await page.evaluate((idx) => document.querySelectorAll(".card-grid .card")[idx]?.click(), i);
      await page.waitForTimeout(250);
    }

    const res = await page.evaluate(() => {
      const DB = window.DRAGONBANE;
      const chars = JSON.parse(localStorage.getItem("dragonbane.characters") || "[]");
      const mvMod = (agl) => { const r = (DB.tables.movementMod || []).find((r) => agl >= r.min && agl <= r.max); return r ? r.value : 0; };
      const kinMove = (kin) => { const k = (DB.kin || []).find((k) => k.key.toLowerCase() === String(kin).toLowerCase() || k.name.toLowerCase() === String(kin).toLowerCase()); return k ? k.movement : null; };
      const dmg = (s) => { const r = (DB.tables.damageBonus || []).find((r) => s >= r.min && s <= r.max); return r ? r.value : null; };
      return chars.map((c) => ({
        name: c.identity && c.identity.name,
        attrs: c.attributes,
        derived: c.derived,
        expMove: kinMove(c.identity.kin) != null ? kinMove(c.identity.kin) + mvMod(c.attributes.AGL) : null,
        expDmgStr: dmg(c.attributes.STR),
        expDmgAgl: dmg(c.attributes.AGL),
        skillCount: Object.keys(c.skills || {}).length,
      }));
    });

    t.eq("all pregens instantiated", res.length, count);
    res.forEach((c) => {
      t.eq(`${c.name}: hpMax == CON`, c.derived.hpMax, c.attrs.CON);
      t.eq(`${c.name}: wpMax == WIL`, c.derived.wpMax, c.attrs.WIL);
      if (c.expMove != null) t.eq(`${c.name}: movement == kin base + AGL mod`, c.derived.movement, c.expMove);
      t.eq(`${c.name}: dmgBonusSTR`, c.derived.dmgBonusSTR == null ? null : c.derived.dmgBonusSTR, c.expDmgStr);
      t.eq(`${c.name}: dmgBonusAGL`, c.derived.dmgBonusAGL == null ? null : c.derived.dmgBonusAGL, c.expDmgAgl);
      t.ok(`${c.name}: has trained skills`, c.skillCount > 0);
    });

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    await page.close();
  },
};
