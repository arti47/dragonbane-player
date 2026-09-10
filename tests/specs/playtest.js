/* playtest.js — guards the fixes for the solo-playtester findings (F1–F3).
   Fixtures are built from what the app actually produces (a hero linked in the
   Solo tab, its generator foe dropped into combat), never hand-constructed state.
     F1 — the NPC AI table offers a player attribute roll when it demands one
          ("roll WIL to resist fear") — reachable in the default solo loop.
     F2 — a Solo generator foe carries a resolvable weapon (attack + damage),
          and its combat card exposes an attack control (Bestiary parity).
     F3 — the combat help no longer says "Tap Draw initiative" (button is "Re-draw"). */
const HERO = {
  id: "pt1",
  identity: { name: "Pyra", kin: "Human", profession: "Hunter", age: "Adult" },
  attributes: { STR: 12, CON: 12, AGL: 12, INT: 10, WIL: 10, CHA: 10 },
  derived: { movement: 10, hpMax: 12, wpMax: 10, dmgBonusSTR: null, dmgBonusAGL: null },
  state: { hp: 12, wp: 10, conditions: {}, deathRolls: { successes: 0, failures: 0 } },
  skills: { "Swords": { attribute: "STR", kind: "weapon", base: 5, level: 12, trained: true, mark: false } },
  abilities: [], spells: { tricks: [], known: [] },
  inventory: { items: [], tiny: [], mementos: [], money: { gold: 0, silver: 0, copper: 0 } },
  notes: ""
};

module.exports = {
  name: "playtest",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true });
    await page.addInitScript((h) => {
      localStorage.setItem("dragonbane.characters", JSON.stringify([h]));
      localStorage.setItem("dragonbane.soloHeroId", h.id);
    }, HERO);
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);

    // Go to the Solo tab and drop a generator foe (+ hero) into combat via "Fight it".
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='solo']").click());
    await page.waitForTimeout(150);
    await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Fight it/.test(x.textContent)); if (b) b.click(); });
    await page.waitForTimeout(200);

    // F2 (data): the generator foe carries a weapon with a damage die + numeric skill.
    const foe = await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("dragonbane.combat") || "{}");
      const npc = (c.combatants || []).find((x) => x.kind === "npc");
      return npc ? { hasWeapon: !!(npc.weapons && npc.weapons[0]), dmg: npc.weapons && npc.weapons[0] && npc.weapons[0].damage, skill: npc.weapons && npc.weapons[0] && npc.weapons[0].skill } : null;
    });
    t.ok("F2: generator foe reached combat", !!foe);
    t.ok("F2: foe has a weapon", !!(foe && foe.hasWeapon));
    t.ok("F2: foe weapon has a damage die", !!(foe && foe.dmg));
    t.ok("F2: foe weapon has a numeric skill", !!(foe && typeof foe.skill === "number"));

    // We should have landed on the Combat tab; expand the foe card.
    await page.waitForTimeout(150);
    const expanded = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".combat-row")];
      const foeRow = rows.find((r) => /NPC/.test(r.textContent));
      if (!foeRow) return false;
      foeRow.click(); // open the accordion body
      return true;
    });
    t.ok("F2: foe combat card present", expanded);
    await page.waitForTimeout(150);

    // F2 (control): the foe card exposes an attack button (Bestiary parity).
    const hasAttackControl = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => /attack/i.test(b.textContent) && !/Attack Table/i.test(b.textContent)));
    t.ok("F2: foe card exposes an attack control", hasAttackControl);

    // F1: run the NPC AI table, force D6=6 (melee → "roll WIL to resist fear"),
    // and assert a player WIL-roll control appears.
    const aiOpened = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /Roll NPC Attack Table/i.test(x.textContent)); if (b) { b.click(); return true; } return false; });
    t.ok("F1: NPC AI attack table reachable in solo combat", aiOpened);
    await page.waitForTimeout(150);
    await page.evaluate(() => { window.Math.random = () => 0.99; }); // Dice.d(6) -> 6
    await page.evaluate(() => { const b = [...document.querySelectorAll(".modal-card button")].find((x) => /Roll D6 AI Action/i.test(x.textContent)); if (b) b.click(); });
    await page.waitForTimeout(150);
    const wil = await page.evaluate(() => {
      const printedFear = /roll WIL to resist fear/i.test(document.querySelector(".modal-card") ? document.querySelector(".modal-card").textContent : "");
      const wilBtn = [...document.querySelectorAll(".modal-card button")].some((b) => /Roll WIL/i.test(b.textContent));
      return { printedFear, wilBtn };
    });
    t.ok("F1: AI table printed the fear demand (D6=6 melee)", wil.printedFear);
    t.ok("F1: a Roll WIL control is offered for it", wil.wilBtn);
    // Rolling it resolves to an outcome.
    await page.evaluate(() => { const b = [...document.querySelectorAll(".modal-card button")].find((x) => /Roll WIL/i.test(x.textContent)); if (b) b.click(); });
    await page.waitForTimeout(120);
    const wilOutcome = await page.evaluate(() => /vs WIL/i.test(document.querySelector(".modal-card") ? document.querySelector(".modal-card").textContent : ""));
    t.ok("F1: WIL roll resolves to an outcome", wilOutcome);

    // F3: combat help text corrected.
    const help = await page.evaluate(() => {
      const acc = [...document.querySelectorAll("details.help-acc, details")].find((d) => /How to use — Combat/i.test(d.textContent));
      return acc ? acc.textContent : "";
    });
    t.ok("F3: help no longer says 'Tap Draw initiative'", !/Tap\s+Draw initiative/i.test(help));
    t.ok("F3: help explains auto-draw", /draws initiative automatically/i.test(help));

    await page.close();
  }
};
