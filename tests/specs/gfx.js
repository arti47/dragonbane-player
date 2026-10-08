/* gfx.js — guards the graphics pass (visual only; text content unchanged):
     drake brand emblem; heraldic crest replaces the monogram (deterministic by name);
     attribute / condition / kin emblems; HP/WP gem pips that track the value;
     backpack slot squares; heart/skull death tokens; faceted d20 on rolls;
     creature silhouettes in combat; school sigils in the Rules; PWA icons. */
module.exports = {
  name: "gfx",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({}, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);

    const brand = await page.evaluate(() => { const b = document.querySelector(".app-header .brand"); return { svg: !!b.querySelector("svg.drake"), text: b.textContent.trim() }; });
    t.ok("brand: drake emblem in the header", brand.svg);
    t.eq("brand: name text unchanged", brand.text, "Dragonbane");
    t.ok("home: empty state has a line-art illustration", await page.evaluate(() => !!document.querySelector(".home-empty svg.illo")));

    // Crest: deterministic by name, varies between names, carries the initials.
    const cr = await page.evaluate(async () => {
      const G = await import("/src/graphics.js");
      const div = document.createElement("div");
      div.innerHTML = G.crest("Orla Moonsilver", "Elf", "OM") + G.crest("Orla Moonsilver", "Elf", "OM");
      const kinds = new Set(["Aodhan", "Orla", "Makander", "Krisanna", "Bastonn", "Zed", "Ana", "Bo"].map((n) => { div.innerHTML = G.crest(n, "Human", "X"); const s = div.querySelector("svg"); return s.dataset.field + "/" + s.dataset.div; }));
      div.innerHTML = G.crest("Orla Moonsilver", "Elf", "OM") + G.crest("Orla Moonsilver", "Elf", "OM");
      const [a, b] = div.querySelectorAll(":scope > svg");
      return { same: a.dataset.field === b.dataset.field && a.dataset.div === b.dataset.div, ini: a.querySelector(".crest-ini").textContent.trim(), variety: kinds.size };
    });
    t.ok("crest: same name → same arms", cr.same);
    t.eq("crest: initials on the chief", cr.ini, "OM");
    t.ok(`crest: arms vary between names (${cr.variety} distinct of 8)`, cr.variety >= 4);

    // Wizard kin cards carry kin emblems.
    await page.click("#new-hero"); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll("#screen button")].find((b) => /Roll attributes/.test(b.textContent)).click());
    await page.evaluate(() => { document.querySelectorAll(".attr-row select").forEach((s, i) => { s.value = String(i); s.dispatchEvent(new Event("change")); }); });
    await page.evaluate(() => [...document.querySelectorAll(".wiz-nav .btn")].pop().click());
    await page.waitForTimeout(150);
    t.eq("wizard: 6 kin emblems on kin cards", await page.evaluate(() => document.querySelectorAll(".card .emb-kin").length), 6);

    // Sheet.
    await page.evaluate(() => window.__go('home'));
    await page.waitForTimeout(100);
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await page.waitForTimeout(300);
    const sh = await page.evaluate(() => ({
      crest: !!document.querySelector(".monogram.has-crest svg.crest"),
      attr: document.querySelectorAll(".hero-top .stat-cell .emb-attr").length,
      cond: document.querySelectorAll(".cond-seals .emb-cond").length,
      hpPips: document.querySelectorAll(".vital-rings .vr-seg.hp").length,
      hpOn: document.querySelectorAll(".vital-rings .vr-seg.hp.on").length,
      name: document.querySelector(".sheet-name").textContent,
    }));
    const c0 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.characters")).slice(-1)[0]);
    t.ok("sheet: crest replaces the monogram", sh.crest);
    t.eq("sheet: 6 attribute glyphs in the stat block", sh.attr, 6);
    t.eq("sheet: 6 condition seals", sh.cond, 6);
    t.eq("sheet: one HP ring segment per max HP", sh.hpPips, c0.attributes.CON);
    t.eq("sheet: lit segments = current HP", sh.hpOn, c0.state.hp);
    t.eq("sheet: hero name text unchanged", sh.name, c0.identity.name);
    await page.evaluate(() => document.querySelector(".vital.hp .step").click()); await page.waitForTimeout(80);
    t.eq("sheet: HP − dims one ring segment", await page.evaluate(() => document.querySelectorAll(".vital-rings .vr-seg.hp.on").length), c0.state.hp - 1);
    await page.evaluate(() => document.querySelector(".tab[data-tab='gear']").click());
    t.ok("sheet: encumbrance drawn as backpack slots", await page.evaluate(() => document.querySelectorAll(".enc-slots i").length > 0));

    // Faceted d20 on a skill roll (number unchanged).
    await page.evaluate(() => document.querySelector(".tab[data-tab='skills']").click());
    await page.evaluate(() => document.querySelector(".sk-name").click()); await page.waitForTimeout(120);
    await page.evaluate(() => document.querySelector(".modal-card .roll-go").click()); await page.waitForTimeout(150);
    const d = await page.evaluate(() => { const d = document.querySelector(".roll-stage .d20"); return { svg: !!d.querySelector(".d20-svg"), n: d.textContent.trim() }; });
    t.ok(`d20: faceted die shows the roll (${d.n})`, d.svg && /^\d{1,2}$/.test(d.n));
    await page.evaluate(() => document.querySelector(".modal-x").click());

    // Death tokens at 0 HP.
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[cs.length - 1].state.hp = 0; cs[cs.length - 1].state.deathRolls = { successes: 1, failures: 2 }; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await page.evaluate(() => window.__go('home')); await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelectorAll(".card[data-id]")[0].click()); await page.waitForTimeout(250);
    const dr = await page.evaluate(() => ({ s: document.querySelectorAll(".panel.dying .dr-dot.s").length, f: document.querySelectorAll(".panel.dying .dr-dot.f").length, ok: document.querySelectorAll(".panel.dying .dr-dot.s.ok").length, bad: document.querySelectorAll(".panel.dying .dr-dot.f.bad").length }));
    t.ok(`death: 3 hearts + 3 skulls, 1 lit / 2 lit (${JSON.stringify(dr)})`, dr.s === 3 && dr.f === 3 && dr.ok === 1 && dr.bad === 2);

    // Combat silhouettes.
    await page.evaluate(() => { window._combatAddOpen = true; window.__go('party'); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select")[1]; s.selectedIndex = 1; s.dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(150);
    t.ok("combat: creature silhouette on the monster card", await page.evaluate(() => !!document.querySelector(".cb-type .emb-creature")));

    // Rules: school sigils.
    await page.evaluate(() => window.__go('rules')); await page.waitForTimeout(120);
    await page.evaluate(() => { const d = document.querySelector("details.rule-accordion[data-cat='spells']"); d.open = true; d.dispatchEvent(new Event("toggle")); });
    await page.waitForTimeout(150);
    t.ok("rules: magic schools carry sigils", await page.evaluate(() => document.querySelectorAll(".school-summary .emb-school").length >= 4));

    // PWA icons.
    const man = await page.evaluate(async () => (await (await fetch("/manifest.json")).json()).icons);
    t.ok("manifest: maskable + PNG icons", man.some((i) => i.purpose === "maskable") && man.some((i) => /\.png$/.test(i.src)));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
