/* playfix.js — guards the fixes for the full-session playtest frictions.
     P1 — a core "Healing Potion (dose)" heals its 2D6 HP via 🧪 Use → Drink,
          and the dose is consumed only when drunk (not on opening).
     P2 — the post-cast resolution card pre-selects a living enemy, so Strike
          always lands; defeated combatants are not offered as targets.
     P3 — damage/heal dice come from the spell text + power level
          (Fireball PL1 2D6 / PL3 4D6, Fire Blast PL2 3D8), never "{PL}D6".
     P4 — navigating (Router.go) closes any open dialog. */
const HERO = {
  id: "pf1",
  identity: { name: "Brenna", kin: "Human", profession: "Mage", age: "Adult" },
  attributes: { STR: 10, CON: 14, AGL: 12, INT: 15, WIL: 14, CHA: 10 },
  derived: { movement: 10, hpMax: 14, wpMax: 14, dmgBonusSTR: null, dmgBonusAGL: null },
  state: { hp: 1, wp: 14, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
  skills: { "Awareness": { attribute: "INT", kind: "core", base: 6, level: 12, trained: true, mark: false } },
  abilities: [], spells: { tricks: [], known: [] },
  inventory: { items: [{ name: "Healing Potion (dose)", weight: 1, equipped: false }], tiny: [], mementos: [], money: { gold: 0, silver: 0, copper: 0 } },
  notes: ""
};

module.exports = {
  name: "playfix",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({});
    await page.addInitScript((h) => {
      if (!localStorage.getItem("pf.seeded")) { localStorage.setItem("dragonbane.characters", JSON.stringify([h])); localStorage.setItem("pf.seeded", "1"); }
    }, HERO);
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);

    // ---- P1: Healing Potion via the real sheet UI ----
    await page.evaluate(() => document.querySelector(".card[data-id]")?.click());
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector(".tab[data-tab='gear']")?.click());
    const opened = await page.evaluate(() => { const b = [...document.querySelectorAll("#screen button")].find((x) => /Use/.test(x.textContent) && x.closest(".inv-row")); if (b) { b.click(); return true; } return false; });
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("dragonbane.characters"))[0]; return { hp: c.state.hp, items: c.inventory.items.length }; });
    t.ok("P1: 🧪 Use opens the potion dialog", opened && !!(await page.$(".modal-card")));
    t.eq("P1: dose not consumed just by opening", before.items, 1);
    const drinkLabel = await page.evaluate(() => [...document.querySelectorAll(".modal-card button")].find((b) => /Drink/.test(b.textContent))?.textContent || "");
    t.ok(`P1: Drink shows the item's dice (${drinkLabel.trim()})`, /2D6 HP/.test(drinkLabel));
    await page.evaluate(() => [...document.querySelectorAll(".modal-card button")].find((b) => /Drink/.test(b.textContent))?.click());
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("dragonbane.characters"))[0]; return { hp: c.state.hp, items: c.inventory.items.length }; });
    t.ok(`P1: potion heals 2–12 HP (1 → ${after.hp})`, after.hp >= 3 && after.hp <= 13);
    t.eq("P1: dose consumed after drinking", after.items, 0);

    // ---- P4: navigation closes dialogs ----
    await page.evaluate(() => window.__go('rules')); // nav button → Router.go
    await page.waitForTimeout(100);
    t.eq("P4: dialogs closed on navigation", await page.evaluate(() => document.querySelectorAll(".modal-back").length), 0);

    // ---- P3: spell dice from text + power level ----
    const dice = await page.evaluate(async () => {
      const { SpellAutomation } = await import("./src/spell-automation.js");
      const find = (n) => { for (const pool of Object.values(window.DRAGONBANE.spells || {})) { const s = [...(pool.spells || []), ...(pool.tricks || [])].find((x) => x.name === n); if (s) return s; } return null; };
      const fb = find("Fireball"), blast = find("Fire Blast"), tw = find("Treat Wound");
      return { fb1: SpellAutomation.spellDice(fb, 1), fb3: SpellAutomation.spellDice(fb, 3), blast2: SpellAutomation.spellDice(blast, 2), tw2: SpellAutomation.spellDice(tw, 2) };
    });
    t.eq("P3: Fireball PL1 = 2D6", dice.fb1, "2D6");
    t.eq("P3: Fireball PL3 = 4D6", dice.fb3, "4D6");
    t.eq("P3: Fire Blast PL2 = 3D8", dice.blast2, "3D8");
    t.eq("P3: Treat Wound PL2 = 3D6", dice.tw2, "3D6");

    // ---- P2: Strike auto-targets the living enemy; defeated foes excluded ----
    const strike = await page.evaluate(async () => {
      const { SpellAutomation } = await import("./src/spell-automation.js");
      const { Combat } = await import("./src/combat.js");
      const st = Combat.load(); st.combatants = [
        { id: "dead1", name: "Fallen Orc", kind: "npc", hp: 0, maxHp: 10, armor: 0, defeated: true },
        { id: "gob1", name: "Goblin", kind: "npc", hp: 30, maxHp: 30, armor: 0 },
      ]; Combat.save(st);
      const fb = Object.values(window.DRAGONBANE.spells).flatMap((p) => p.spells || []).find((x) => x.name === "Fireball");
      const box = document.createElement("div"); document.body.appendChild(box);
      SpellAutomation.renderCard("pf1", fb, 1, false, false, 2, box);
      const sel = box.querySelector("select");
      const opts = [...sel.options].map((o) => o.textContent);
      const dieIn = [...box.querySelectorAll("input[type=text]")].find((i) => /D/.test(i.value));
      const btn = [...box.querySelectorAll("button")].find((b) => /Strike/.test(b.textContent));
      btn.click();
      await new Promise((r) => setTimeout(r, 50));
      const gob = Combat.load().combatants.find((c) => c.id === "gob1");
      const res = { selected: sel.value, opts, dice: dieIn && dieIn.value, gobHp: gob.hp, text: box.textContent };
      box.remove();
      return res;
    });
    t.eq("P2: Strike pre-selects the living enemy", strike.selected, "gob1");
    t.ok("P2: defeated combatant not offered", !strike.opts.some((o) => /Fallen Orc/.test(o)));
    t.eq("P2/P3: Fireball card shows 2D6 (no {PL})", strike.dice, "2D6");
    t.ok(`P2: Strike damaged the goblin (30 → ${strike.gobHp})`, strike.gobHp <= 28 && strike.gobHp >= 18);

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
