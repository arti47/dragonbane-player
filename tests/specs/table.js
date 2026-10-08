/* table.js — guards group play at a real table (runs in local mode; the synced
   paths share the same code with campaigns/{id}/table + /rolls behind them):
     beginner mode (plain-words roll explanation, advanced panels hidden);
     shared roll log; GM phase banner + phase tools; roll requests answered from the
     banner with the result back on the GM screen; GM-called party actions;
     "your turn" card with an action menu + End my turn; foe HP shown as bands to
     non-GM players; solo copy of a party hero; the death-roll tally is visible. */
module.exports = {
  name: "table",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ gmScreen: true, soloMode: false }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const nav = async (r) => { await page.evaluate((rt) => window.__go(rt), r); await page.waitForTimeout(150); };

    // Beginner mode on (About toggle).
    await nav("about");
    await page.evaluate(() => document.querySelector("#lvl-beginner").click());
    await page.waitForTimeout(100);
    t.ok("beginner: body class set", await page.evaluate(() => document.body.classList.contains("beginner")));

    // A mage pre-gen (Aodhan) → advanced panels hidden; roll explained + logged.
    await nav("home");
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector(".tab[data-tab='magic']").click());
    t.ok("beginner: permanent-WP-loss row hidden", await page.evaluate(() => { const x = document.querySelector(".wp-pen"); return !!x && getComputedStyle(x).display === "none"; }));
    await page.evaluate(() => document.querySelector(".tab[data-tab='skills']").click());
    await page.evaluate(() => [...document.querySelectorAll(".sk-name")].find((b) => /Awareness/.test(b.textContent)).click());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelector(".modal-card .roll-go").click()); await page.waitForTimeout(150);
    t.ok("beginner: roll explained in plain words", await page.evaluate(() => /or lower|Dragon|Demon/.test(document.querySelector(".modal-card .roll-why")?.textContent || "")));
    await page.evaluate(() => document.querySelector(".modal-x").click());
    const log1 = await page.evaluate(() => JSON.parse(localStorage.getItem("dragonbane.rollLog") || "[]"));
    t.ok(`log: skill roll recorded (${log1.length})`, log1.length === 1 && log1[0].label === "Awareness" && log1[0].hero);

    // GM: set the phase → banner with hint + tool.
    await nav("gm");
    await page.evaluate(() => [...document.querySelectorAll(".phase-btn")].find((b) => /Resting/.test(b.textContent)).click());
    await page.waitForTimeout(150);
    const bar = await page.evaluate(() => { const b = document.querySelector("#table-bar"); return { shown: b && !b.hidden, text: b ? b.textContent : "", btn: [...(b ? b.querySelectorAll(".tb-btn") : [])].map((x) => x.textContent) }; });
    t.ok(`phase: banner shows Resting + hint (${bar.text.slice(0, 40)}…)`, bar.shown && /Resting/.test(bar.text) && /Stretch rest/.test(bar.text));
    t.ok("phase: banner offers the Rest tool", bar.btn.some((x) => /Rest/.test(x)));

    // GM: ask for a Awareness roll → player row → roll → answered on the GM screen.
    await page.evaluate(() => { const s = document.querySelector(".gm-table select[aria-label='Skill to roll']"); s.value = "Awareness"; [...document.querySelectorAll(".gm-table .btn")].find((b) => b.textContent.trim() === "Ask").click(); });
    await page.waitForTimeout(150);
    t.ok("request: banner asks for the roll", await page.evaluate(() => /GM asks.*roll\s*Awareness/.test(document.querySelector("#table-bar").textContent)));
    t.ok("request: GM sees 'waiting…'", await page.evaluate(() => /waiting/.test(document.querySelector(".gm-req").textContent)));
    await page.evaluate(() => [...document.querySelectorAll("#table-bar .tb-btn")].find((b) => /Roll now/.test(b.textContent)).click());
    await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelector(".modal-card .roll-go").click()); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector(".modal-x").click());
    await nav("gm");
    const answered = await page.evaluate(() => ({ bar: /GM asks/.test(document.querySelector("#table-bar").textContent), gm: document.querySelector(".gm-req").textContent }));
    t.ok("request: banner row cleared after rolling", !answered.bar);
    t.ok(`request: result back on the GM screen (${answered.gm.replace(/\s+/g, " ").slice(0, 60)})`, !/waiting/.test(answered.gm) && /Awareness/.test(answered.gm));

    // GM: party action → prompt → sheet rest.
    await page.evaluate(() => [...document.querySelectorAll(".gm-table .btn")].find((b) => b.textContent.trim() === "Shift rest").click());
    await page.waitForTimeout(150);
    t.ok("party action: prompt on the banner", await page.evaluate(() => /GM calls.*Shift rest/.test(document.querySelector("#table-bar").textContent)));
    await page.evaluate(() => [...document.querySelectorAll("#table-bar .tb-btn")].find((b) => /shift rest/i.test(b.textContent)).click());
    await page.waitForTimeout(250);
    t.ok("party action: prompt cleared + sheet open", await page.evaluate(() => !/GM calls/.test(document.querySelector("#table-bar").textContent) && !!document.querySelector(".hero-top")));

    // Combat: turn card with action menu (beginner, one shared device).
    await page.evaluate(() => { window._combatAddOpen = true; }); await nav("party");
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select"); s[0].selectedIndex = 1; s[0].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[0].click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select"); s[1].selectedIndex = 1; s[1].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(200);
    // Put the hero first in the order so it's their turn.
    await page.evaluate(async () => { const { Combat } = await import("/src/combat.js"); const st = Combat.load(); st.combatants.forEach((c) => { c.init = c.kind === "hero" ? 1 : 5; c.done = false; }); Combat.save(st); Combat.rerender(); });
    await page.waitForTimeout(200);
    const tc = await page.evaluate(() => { const d = document.querySelector("#turn-dock"); return { shown: d && !d.hidden, title: d ? d.querySelector(".tc-title")?.textContent : "", acts: d ? d.querySelectorAll(".tc-act").length : 0, tips: d ? d.querySelectorAll(".tc-act small").length : 0 }; });
    t.ok(`turn: 'Your turn' card (${tc.title})`, tc.shown && /Your turn/.test(tc.title));
    t.eq("turn: six actions, each explained (beginner)", `${tc.acts}/${tc.tips}`, "6/6");
    await page.evaluate(() => document.querySelector("#turn-dock .tc-done").click());
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => ({ done: JSON.parse(localStorage.getItem("dragonbane.combat")).combatants.find((c) => c.kind === "hero").done, card: !!document.querySelector("#turn-dock .turn-card") }));
    t.ok("turn: End my turn marks the hero done and hides the card", after.done && !after.card);

    // Foe HP as bands for a non-GM viewer.
    const bands = await page.evaluate(async () => {
      const { Sync } = await import("/src/sync.js"); const { Combat } = await import("/src/combat.js");
      const prev = { e: Sync.enabled, c: Sync.campaign };
      Sync.enabled = true; Sync.campaign = { id: "t", role: "player" };
      Combat.rerender();
      const r = { hp: [...document.querySelectorAll(".cb-card .cb-hp")].map((x) => x.textContent.trim()) };
      Sync.enabled = prev.e; Sync.campaign = prev.c; Combat.rerender();
      return r;
    });
    t.ok(`foe HP: player sees a band, hero keeps numbers (${bands.hp.join(" | ")})`, bands.hp.some((x) => /^(Healthy|Hurt|Badly hurt|Down)$/.test(x)) && bands.hp.some((x) => /^HP \d+\/\d+$/.test(x)));

    // Solo copy of a party hero.
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[0].campaignId = "camp_x"; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await page.evaluate(async () => { const { Settings } = await import("/src/settings.js"); Settings.set("soloMode", true); });
    await nav("home"); await nav("solo");
    await page.evaluate(() => { const s = document.querySelector(".solo-ctx-sel"); s.selectedIndex = 1; s.dispatchEvent(new Event("change")); });
    await page.waitForTimeout(150);
    t.ok("solo: asks shared vs solo copy for a party hero", await page.evaluate(() => /Make a solo copy/.test(document.querySelector(".modal-card")?.textContent || "")));
    await page.evaluate(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /Make a solo copy/.test(b.textContent)).click());
    await page.waitForTimeout(200);
    const sc = await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); const c = cs.find((x) => x.soloCopy); return c ? { name: c.identity.name, camp: c.campaignId, linked: localStorage.getItem("dragonbane.soloHeroId") === c.id, orig: cs[0].campaignId } : null; });
    t.ok(`solo: copy created, unlinked from the party, now rolling as it (${sc && sc.name})`, !!sc && /\(solo\)$/.test(sc.name) && !sc.camp && sc.linked && sc.orig === "camp_x");

    // Death-roll modal shows the tally line (was dropped by a two-node template).
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[0].state.hp = 0; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await nav("home");
    await page.evaluate(() => document.querySelectorAll(".card[data-id]")[0].click()); await page.waitForTimeout(250);
    await page.evaluate(() => [...document.querySelectorAll("#screen .panel.dying button")].find((b) => /Death roll/.test(b.textContent)).click());
    await page.waitForTimeout(120);
    t.ok("death roll: tally visible in the dialog", await page.evaluate(() => !!document.querySelector(".modal-card .cur-dr .dr-dot")));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
