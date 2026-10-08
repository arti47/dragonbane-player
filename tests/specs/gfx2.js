/* gfx2.js — guards the graphics pass 2 (decorative only, no text changes):
     ribbon titles; nav seal + chain edge; per-route texture; crest mantling + motto
     scroll; shield attribute cells; vitals emblems; item pictograms; coin stacks;
     spell sigils + rank stars; ability glyphs; ruled notes; damage dice faces;
     push-condition emblems; initiative card pips + second index; hourglass sand;
     turn rail; creature art; oracle seal; tarot inspiration; day dial + compass;
     journal scroll; weapon pictograms; wizard step emblem + 4D6 faces; forged
     overlay; GM crests; empty-state illustrations. */
module.exports = {
  name: "gfx2",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true, gmScreen: true }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const ev = (f, a) => page.evaluate(f, a);
    const nav = async (r) => { await ev((rt) => window.__go(rt), r); await page.waitForTimeout(200); };
    const tab = async (k) => { await ev((x) => [...document.querySelectorAll(".tab")].find((b) => b.textContent.trim().toLowerCase().startsWith(x)).click(), k); await page.waitForTimeout(150); };

    // Frame
    const fr = await ev(() => ({ ribbon: getComputedStyle(document.querySelector("#screen .section-title > h2")).clipPath !== "none", chain: getComputedStyle(document.querySelector(".app-nav"), "::before").content !== "none", seal: getComputedStyle(document.querySelector("#ctx-action .ca-seal")).borderRadius === "50%" }));
    t.ok("frame: ribbon screen title", fr.ribbon);
    t.ok("frame: nav chain edge + wax-seal context button", fr.chain && fr.seal);

    // Wizard: step emblem + 4D6 faces (six groups of four, lowest struck)
    await page.click("#new-hero"); await page.waitForTimeout(150);
    t.ok("wizard: step emblem in the header", await ev(() => !!document.querySelector(".wiz-head .wiz-art svg")));
    await ev(() => [...document.querySelectorAll("#screen button")].find((b) => /Roll attributes/.test(b.textContent)).click()); await page.waitForTimeout(100);
    const d6 = await ev(() => ({ g: document.querySelectorAll(".d6-group").length, f: document.querySelectorAll(".d6-group .d6f").length, s: document.querySelectorAll(".d6-group .d6f.struck").length }));
    t.eq("wizard: 4D6 faces (groups/faces/struck)", `${d6.g}/${d6.f}/${d6.s}`, "6/24/6");

    // Sheet (mage pre-gen)
    await nav("home"); await page.click("#use-pregen"); await page.waitForTimeout(150);
    await ev(() => document.querySelectorAll(".card-grid .card")[0].click()); await page.waitForTimeout(300);
    const sh = await ev(() => ({ arms: !!document.querySelector(".arms .mantling") && !!document.querySelector(".arms .motto"), shields: document.querySelectorAll(".stat-cell .shield-bg").length, vit: document.querySelectorAll(".vital .vital-emb svg").length, ab: !!document.querySelector(".ab-row .ab-glyph"), wm: getComputedStyle(document.querySelector("#screen")).getPropertyValue("--wm").length > 0 }));
    t.ok("sheet: crest mantling + motto scroll", sh.arms);
    t.eq("sheet: six shield attribute cells", sh.shields, 6);
    t.eq("sheet: heart + flame vitals emblems", sh.vit, 2);
    t.ok("sheet: ability glyph", sh.ab);
    await tab("magic");
    t.ok("magic: school sigil + rank stars + trick candle", await ev(() => !!document.querySelector(".cast-sigil svg") && !!document.querySelector(".rank-stars .rs") && !!document.querySelector(".trick-glyph")));
    await tab("gear");
    const gr = await ev(() => ({ glyphs: document.querySelectorAll(".inv-name .inv-glyph").length, rows: document.querySelectorAll(".inv-name").length, coins: document.querySelectorAll(".coin .coin-stack").length, text: document.querySelector(".inv-name").textContent }));
    t.ok(`gear: every item has a pictogram (${gr.glyphs}/${gr.rows})`, gr.glyphs === gr.rows && gr.rows > 0);
    t.eq("gear: coin stack per coin", gr.coins, 3);
    t.ok(`gear: item text unchanged by the pictogram (${gr.text})`, !/[<>]/.test(gr.text) && gr.text.trim().length > 0);
    await tab("story");
    t.ok("story: ruled notes + weakness mark", await ev(() => !!document.querySelector("textarea.ruled") && !!document.querySelector(".mark-line .mark-glyph")));

    // Skill roll → push chips carry condition emblems when failed; damage dice faces
    await tab("overview");
    const faces = await ev(async () => {
      const { Dice } = await import("/src/core.js"); const { dieFaces } = await import("/src/graphics.js");
      Dice.capture(); const tot = Dice.roll("2D8+1D4"); const f = Dice.take();
      const html = dieFaces(f); return { n: f.length, sum: f.reduce((a, [, v]) => a + v, 0), tot, shapes: (html.match(/class="dface d(\d+)"/g) || []).length };
    });
    t.ok(`dice: captured faces sum to the roll (${faces.sum}=${faces.tot}, ${faces.shapes} shapes)`, faces.n === 3 && faces.sum === faces.tot && faces.shapes === 3);

    // Combat: card pips + second index, hourglass, rail, creature art, slain seal
    await ev(() => { window._combatAddOpen = true; }); await nav("party");
    await ev(() => { const s = document.querySelectorAll(".inv-add select"); s[0].selectedIndex = 1; s[0].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[0].click(); }); await page.waitForTimeout(150);
    await ev(() => { const s = document.querySelectorAll(".inv-add select"); s[1].selectedIndex = 1; s[1].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); }); await page.waitForTimeout(250);
    const cb = await ev(() => ({ pips: !!document.querySelector(".play-card .pc-pips"), idx2: !!document.querySelector(".play-card .pc-pip2"), hg: !!document.querySelector(".round-badge .hg-sand.running"), rail: getComputedStyle(document.querySelector(".combat-list"), "::before").content !== "none", art: !!document.querySelector(".cb-body .cb-art svg") }));
    t.ok("combat: card pips + second corner index", cb.pips && cb.idx2);
    t.ok("combat: hourglass sand runs mid-round", cb.hg);
    t.ok("combat: turn-order rail + creature art", cb.rail && cb.art);
    await ev(async () => { const { Combat } = await import("/src/combat.js"); const st = Combat.load(); const m = st.combatants.find((c) => c.kind !== "hero"); m.hp = 0; m.defeated = true; Combat.save(st); Combat.rerender(); }); await page.waitForTimeout(200);
    t.ok("combat: slain seal on a defeated foe", await ev(() => { const r = document.querySelector(".cb-card.defeated > .combat-row"); return !!r && getComputedStyle(r, "::after").content !== "none"; }));

    // Solo: oracle seal, tarot, day dial, compass, foe card, journal empties
    await nav("solo");
    let seal = false;
    for (let i = 0; i < 12 && !seal; i++) { await ev(() => document.querySelector("#solo-f-roll").click()); seal = await ev(() => !!document.querySelector("#solo-f-out .oracle-seal")); }
    t.ok("solo: oracle answer gets a seal", seal);
    t.ok("solo: empty threads/NPCs get illustrations", await ev(() => document.querySelectorAll(".empty-illo .illo-spool, .empty-illo .illo-frame").length === 2));
    await ev(() => document.querySelector("#solo-i-all").click()); await page.waitForTimeout(100);
    const tr = await ev(() => ({ n: document.querySelectorAll(".tarot").length, text: document.querySelector("#solo-i-out .fortune").textContent.replace(/\s+/g, " ").trim() }));
    t.ok(`solo: inspiration as three tarot cards, text intact (${tr.text.slice(0, 40)})`, tr.n === 3 && /· .+ · /.test(tr.text));
    await ev(() => [...document.querySelectorAll("#screen button")].find((b) => /Random shift/.test(b.textContent)).click()); await page.waitForTimeout(100);
    t.ok("solo: day dial + compass rose", await ev(() => !!document.querySelector(".day-dial") && !!document.querySelector(".rose-art .compass-rose")));
    t.ok("solo: foe generator as a bestiary card", await ev(() => !!document.querySelector(".foe-gen .foe-art svg")));

    // Rules: weapon pictograms; GM: crests + empty roll-log art
    await nav("rules");
    t.ok("rules: weapon/armor pictograms", await ev(() => document.querySelectorAll(".rl-table .rl-glyph").length > 20));
    await nav("gm");
    t.ok("gm: party crest", await ev(() => !!document.querySelector(".gm-name .gm-crest")));

    // Forged overlay renders and removes itself on tap
    const fo = await ev(async () => { const { Wizard } = await import("/src/wizard.js"); Wizard.forged({ identity: { name: "Orla Moonsilver", kin: "elf" } }); const o = document.querySelector(".forged-ov"); const had = !!o && !!o.querySelector(".forged-crest .crest") && !!o.querySelector(".forged-laurel"); o.click(); return { had, gone: !document.querySelector(".forged-ov") }; });
    t.ok("wizard: hero-forged crest + laurel, dismissed on tap", fo.had && fo.gone);

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
