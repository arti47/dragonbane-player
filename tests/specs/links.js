/* links.js — guards the links between tabs (rules-faithful):
     a hero's combat card mirrors the sheet (HP/WP, max HP/WP incl. Robust, worn armor =
     body + helmet, name, conditions); combat HP edits flow back to the sheet; damage to a
     hero already at 0 HP counts as a failed death roll from every damage path (sheet,
     combat stepper, damage applier, GM hand-out); downed heroes stay targetable; deleting
     a hero removes their combat card. */
module.exports = {
  name: "links",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ gmScreen: true }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const ev = (f, a) => page.evaluate(f, a);
    const nav = async (r) => { await ev((rt) => document.querySelector(`#app-nav button[data-route='${rt}']`).click(), r); await page.waitForTimeout(200); };

    // Knight pre-gen with Plate Armor + Great Helm worn.
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await ev(() => document.querySelectorAll(".card-grid .card")[2].click()); await page.waitForTimeout(300);
    const id = await ev(() => JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id);
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { classifyItem } = await import("/src/rules.js"); Store.update(id, (c) => { c.inventory.items.forEach((i) => { const k = classifyItem(i.name); if (k === "armor" || k === "helmet") i.equipped = true; }); }); }, id);
    await ev(() => { window._combatAddOpen = true; }); await nav("party");
    await ev(() => { const s = document.querySelectorAll(".inv-add select"); s[0].selectedIndex = 1; s[0].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[0].click(); }); await page.waitForTimeout(150);
    await ev(() => { const s = document.querySelectorAll(".inv-add select"); s[1].selectedIndex = 1; s[1].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); }); await page.waitForTimeout(200);

    const st = () => ev(async (id) => {
      const { Combat } = await import("/src/combat.js"); const { Store } = await import("/src/store.js"); const d = await import("/src/derived.js");
      const c = Store.get(id); const cb = Combat.load().combatants.find((x) => x.charId === id);
      return { c: { hp: c.state.hp, wp: c.state.wp, hpMax: d.effHpMax(c), arm: ((d.equippedArmor(c) || {}).rating || 0) + ((d.equippedHelmet(c) || {}).rating || 0), name: c.identity.name, dr: c.state.deathRolls }, cb: cb ? { hp: cb.hp, wp: cb.wp, maxHp: cb.maxHp, armor: cb.armor, name: cb.name, id: cb.id } : null };
    }, id);
    let s = await st();
    t.eq("combat armor = body armor + helmet (Plate 6 + Great Helm 2)", s.cb.armor, 8);

    await ev(async (id) => { const { Store } = await import("/src/store.js"); Store.update(id, (c) => { c.abilities.push({ name: "Robust", source: "heroic", wp: null, text: "" }); c.identity.name = "Renamed Knight"; c.state.hp -= 3; }); }, id);
    s = await st();
    t.ok(`sheet → combat: HP, Robust max HP, name (${s.cb.hp}/${s.cb.maxHp} ${s.cb.name})`, s.cb.hp === s.c.hp && s.cb.maxHp === s.c.hpMax && s.cb.name === "Renamed Knight");
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { classifyItem } = await import("/src/rules.js"); Store.update(id, (c) => { c.inventory.items.forEach((i) => { if (classifyItem(i.name) === "armor") i.equipped = false; }); }); }, id);
    s = await st();
    t.eq("removing body armor updates combat armor (helmet only)", s.cb.armor, 2);

    // Conditions show on the hero's combat card.
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { Combat } = await import("/src/combat.js"); Store.update(id, (c) => { c.state.conditions.dazed = true; }); Combat.rerender(); }, id); await page.waitForTimeout(150);
    t.ok("held condition shown on the combat card", await ev(() => [...document.querySelectorAll(".cb-card .cb-cond")].some((x) => /Dazed/.test(x.textContent))));

    // Combat HP stepper → sheet.
    await ev(() => document.querySelectorAll(".cb-body").forEach((b) => { b.style.display = "block"; }));
    const hp0 = (await st()).c.hp;
    await ev(() => { const card = [...document.querySelectorAll(".cb-card")].find((c) => c.querySelector(".cb-cond")); [...card.querySelectorAll(".cb-body button.step")].find((b) => b.textContent.trim() === "−").click(); }); await page.waitForTimeout(150);
    t.eq("combat HP − → sheet HP", (await st()).c.hp, hp0 - 1);

    // Damage at 0 HP = failed death roll, from each path.
    const down = () => ev(async (id) => { const { Store } = await import("/src/store.js"); Store.update(id, (c) => { c.state.hp = 0; c.state.deathRolls = { successes: 0, failures: 0 }; }); }, id);
    await down();
    const applier = await ev(async (id) => {
      const { Combat } = await import("/src/combat.js"); const { Roller } = await import("/src/roller.js"); const { Store } = await import("/src/store.js");
      const cb = Combat.load().combatants.find((x) => x.charId === id);
      const n = Roller.renderDamageApplier(null, 5, true, true); document.body.appendChild(n);
      const sel = n.querySelector("select"); const listed = !!sel && [...sel.options].some((o) => o.value === cb.id);
      if (sel) { sel.value = cb.id; n.querySelector("button.btn.block").click(); }
      n.remove(); return { listed, dr: Store.get(id).state.deathRolls, hp: Store.get(id).state.hp };
    }, id);
    t.ok("downed hero is still a damage-applier target", applier.listed);
    t.ok(`damage applier on a downed hero → 1 failed death roll, HP stays 0 (${JSON.stringify(applier.dr)})`, applier.dr.failures === 1 && applier.hp === 0);

    await down(); await nav("home"); await nav("party");
    await ev(() => document.querySelectorAll(".cb-body").forEach((b) => { b.style.display = "block"; }));
    await ev(() => { const card = [...document.querySelectorAll(".cb-card")].find((c) => /Hero/.test(c.querySelector(".cb-tags").textContent)); [...card.querySelectorAll(".cb-body button.step")].find((b) => b.textContent.trim() === "−").click(); }); await page.waitForTimeout(150);
    t.eq("combat HP − on a downed hero → 1 failed death roll", (await st()).c.dr.failures, 1);

    await down();
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { damageHero } = await import("/src/derived.js"); Store.update(id, (c) => { damageHero(c, 4); }); }, id);
    t.eq("shared damage rule (GM hand-out / spells) at 0 HP → 1 failure", (await st()).c.dr.failures, 1);
    await ev(async (id) => { const { Store } = await import("/src/store.js"); const { damageHero } = await import("/src/derived.js"); Store.update(id, (c) => { c.state.hp = 5; damageHero(c, 3); }); }, id);
    t.eq("damage above 0 HP just reduces HP", (await st()).c.hp, 2);

    // Deleting a hero removes their combat card.
    await ev(async (id) => { const { Store } = await import("/src/store.js"); Store.remove(id); }, id);
    t.ok("deleted hero leaves the combat tracker", await ev(async (id) => { const { Combat } = await import("/src/combat.js"); return !Combat.load().combatants.some((x) => x.charId === id); }, id));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
