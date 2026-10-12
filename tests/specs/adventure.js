/* adventure.js — guards the Adventure feed (Story tab): scenes and sessions, prose lines
   written by rolls / damage / conditions / rests / fights, the shift clock re-opening
   once-per-shift rests, quests, the in-feed fight card, solo tools as feed actions, and
   "Continue adventure" on launch. Rules behaviour itself is covered by the other specs. */
module.exports = {
  name: "adventure",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({}, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    const ev = (f, a) => page.evaluate(f, a);
    const go = async (r) => { await ev((x) => window.__go(x), r); await page.waitForTimeout(200); };
    const wait = (ms) => page.waitForTimeout(ms);
    const texts = () => ev(() => [...document.querySelectorAll(".adv-feed .ae, .adv-feed .ae-card, .adv-feed .ae-div, .adv-feed .ae-scene")].map((e) => e.className.split(" ")[1] + "|" + e.textContent.replace(/\s+/g, " ").trim()));
    const closeModal = async () => { await ev(() => document.querySelectorAll(".modal-x").forEach((x) => x.click())); await wait(120); };

    // Story = the Adventure feed for everyone (no Solo / GM mode needed).
    await go("story");
    t.eq("story tab opens the Adventure feed", await ev(() => document.querySelector("#screen").dataset.route), "adventure");
    t.ok("mode switch: Adventure | GM", await ev(() => [...document.querySelectorAll(".mode-switch .ms-btn")].map((b) => b.dataset.mode).join() === "adventure,gm"));
    t.ok("empty feed invites a first scene", await ev(() => !!document.querySelector(".adv-scene.empty .adv-start")));

    // A hero, then a scene with a spark.
    await go("home");
    await page.click("#use-pregen"); await wait(150);
    await ev(() => document.querySelectorAll(".card-grid .card")[0].click()); await wait(300);
    await go("story");
    t.eq("context seal offers a Scene", await ev(() => document.querySelector("#ctx-action").textContent.trim()), "Scene");
    t.ok("prompt bar asks where the story goes, Start scene leads", await ev(() => /Where does the story go/.test(document.querySelector(".adv-bar").textContent) && document.querySelector(".ab-chip.primary").dataset.act === "scene"));
    await ev(() => document.querySelector(".ab-chip[data-act='scene']").click()); await wait(150);
    await ev(() => { document.querySelector("#adv-place").value = "The Ruined Watchtower"; document.querySelector(".adv-spark").click(); });
    t.ok("spark rolls Action · Attribute · Thing into the hook", await ev(() => / · .+ · /.test(document.querySelector("#adv-hook").value)));
    await ev(() => document.querySelector("#adv-scene-go").click()); await wait(200);
    t.ok("scene banner names the place", await ev(() => /The Ruined Watchtower/.test(document.querySelector(".adv-scene .as-place").textContent)));
    let tx = await texts();
    t.ok("session + scene written into the feed", tx.some((x) => /Session 1 begins/.test(x)) && tx.some((x) => x.startsWith("ae-scene") || /New scene/.test(x)));
    t.ok("places chip counts the place", await ev(() => /Places\s*1/.test(document.querySelector(".adv-chips [data-chip='places']").textContent)));
    t.ok("bar asks What do you do? in a scene", await ev(() => /What do you do\?/.test(document.querySelector(".adv-bar").textContent)));

    // Try something → a skill roll writes prose + the numbers.
    await ev(() => document.querySelector(".ab-chip[data-act='try']").click()); await wait(150);
    await ev(() => document.querySelector(".modal-card .db-tile").click()); await wait(200);
    await ev(() => (document.querySelector(".modal-card .roll-go") || [...document.querySelectorAll(".modal-card button")].find((b) => /^Roll/.test(b.textContent.trim()))).click()); await wait(900);
    await closeModal(); await wait(150);
    tx = await texts();
    const roll = tx.find((x) => x.startsWith("k-roll"));
    t.ok(`a skill roll becomes a story line with the numbers (${roll && roll.slice(0, 70)})`, !!roll && / vs \d+ · (success|failure|Dragon|Demon)/.test(roll));
    t.ok("the feed keeps its place on the Adventure screen", await ev(() => document.querySelector("#screen").dataset.route === "adventure"));

    // Damage and a condition on the hero are noticed and written up.
    await ev(async () => { const { Store } = await import("/src/store.js"); const c = Store.list()[0]; Store.update(c.id, (ch) => { ch.state.hp = Math.max(1, ch.state.hp - 2); ch.state.conditions.scared = true; }); });
    await wait(1100);
    tx = await texts();
    t.ok("damage taken → a wound line with HP", tx.some((x) => x.startsWith("k-hurt") && /takes 2 damage|wounded — 2 damage/.test(x) && /HP \d+\/\d+/.test(x)));
    t.ok("condition gained → a line", tx.some((x) => x.startsWith("k-cond") && /is now scared/.test(x)));

    // Rest once per shift; the clock turning brings it back.
    await ev(() => document.querySelector(".ab-chip[data-act='rest']").click()); await wait(150);
    await ev(() => document.querySelectorAll(".modal-card .rp-btn")[0].click()); await wait(1100);
    tx = await texts();
    t.ok("round rest written as one line (no extra WP line)", tx.some((x) => x.startsWith("k-rest") && /Round rest · \+\d WP/.test(x)) && !tx.some((x) => /regains \d+ WP/.test(x)));
    t.ok("still on the feed after resting", await ev(() => document.querySelector("#screen").dataset.route === "adventure"));
    await ev(() => document.querySelector(".ab-chip[data-act='rest']").click()); await wait(150);
    t.ok("round rest shows used this shift", await ev(() => document.querySelectorAll(".modal-card .rp-btn")[0].disabled && /used this shift/.test(document.querySelectorAll(".modal-card .rp-btn")[0].textContent)));
    await closeModal();
    await ev(() => document.querySelector(".adv-clock").click()); await wait(150);
    await ev(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /Pass a shift/.test(b.textContent)).click()); await wait(300);
    t.ok("clock turns to Day", await ev(() => /Day/.test(document.querySelector(".adv-clock b").textContent)));
    t.ok("turning the clock re-opens the round rest", await ev(() => JSON.parse(localStorage.getItem("dragonbane.characters"))[0].state.roundRestUsed === false));

    // Quests.
    await ev(() => document.querySelector(".adv-chips [data-chip='quests']").click()); await wait(150);
    await ev(() => { const i = document.querySelector(".modal-card .inv-add input"); i.value = "Find the missing scout"; document.querySelector(".modal-card .inv-add button").click(); }); await wait(150);
    await ev(() => document.querySelector(".modal-card .j-item .skill-chip").click()); await wait(150);
    await closeModal();
    tx = await texts();
    t.ok("quest added and resolved, both in the story", tx.some((x) => /New quest: Find the missing scout/.test(x)) && tx.some((x) => /Quest resolved: Find the missing scout/.test(x)));

    // A fight inside the feed.
    await ev(() => document.querySelector(".ab-chip[data-act='fight']").click()); await wait(150);
    await ev(() => { const s = document.querySelector(".modal-card select"); s.value = s.querySelector("option[value^='npc:']").value; [...document.querySelectorAll(".modal-card .btn")].find((b) => /Start the fight/.test(b.textContent)).click(); }); await wait(1100);
    t.ok("fight card replaces the prompt bar, still on the feed", await ev(() => !!document.querySelector(".adv-bar.fighting .adv-fight") && document.querySelector("#screen").dataset.route === "adventure"));
    t.ok("initiative strip with both sides", await ev(() => document.querySelectorAll(".af-strip .af-f").length >= 2 && !!document.querySelector(".af-strip .af-f.now")));
    tx = await texts();
    t.ok("Battle! line in the feed", tx.some((x) => x.startsWith("k-fight") && /Battle!/.test(x)));
    const turn = await ev(() => document.querySelector(".af-body .turn-acts") ? "hero" : document.querySelector(".af-next") ? "foe" : "?");
    t.ok(`whoever acts gets their controls (${turn})`, turn === "hero" || turn === "foe");
    t.eq("context seal points at the fight", await ev(() => document.querySelector("#ctx-action").textContent.trim()), "Fight");
    // Wound the foe through the tracker's own store → a blow line.
    await ev(async () => { const { Combat } = await import("/src/combat.js"); const s = Combat.load(); const f = s.combatants.find((c) => c.kind !== "hero"); f.hp = 0; Combat.save(s); });
    await wait(1100);
    tx = await texts();
    t.ok("a foe falling is written up", tx.some((x) => x.startsWith("k-foe") && /falls!|goes down|is defeated/.test(x)));
    await ev(() => document.querySelector(".af-stop").click()); await wait(150);
    await ev(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /End fight/.test(b.textContent)).click()); await wait(1100);
    tx = await texts();
    t.ok("fight summary card when it ends", tx.some((x) => x.startsWith("k-fightEnd") && /fight is over/.test(x) && /Defeated:/.test(x)));
    t.ok("prompt bar is back", await ev(() => !document.querySelector(".adv-fight") && !!document.querySelector(".ab-chips")));

    // End scene, end session (recap → advancement).
    await ev(() => document.querySelector(".as-end").click()); await wait(150);
    await ev(() => { document.querySelector(".modal-input").value = "The tower is ours."; [...document.querySelectorAll(".modal-card .btn")].find((b) => /End scene/.test(b.textContent)).click(); }); await wait(250);
    tx = await texts();
    t.ok("scene end card with the summary", tx.some((x) => x.startsWith("k-sceneEnd") && /The tower is ours/.test(x)));
    await ev(() => document.querySelector(".ab-chip[data-act='endsession']").click()); await wait(150);
    await ev(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /End session/.test(b.textContent)).click()); await wait(400);
    tx = await texts();
    t.ok("session recap card names the place", tx.some((x) => x.startsWith("k-sessionEnd") && /Visited The Ruined Watchtower/.test(x)));
    t.ok("then the rules' advancement flow opens", await ev(() => /advancement/i.test(document.querySelector(".modal-card")?.textContent || "")));
    await closeModal();

    // Launch on the story: "Continue adventure".
    await page.reload({ waitUntil: "networkidle" }); await wait(300);
    t.eq("app opens on the adventure in progress", await ev(() => document.querySelector("#screen").dataset.route), "adventure");
    await go("home");
    t.ok("home leads with Continue adventure", await ev(() => !!document.querySelector(".adv-continue")));
    t.eq("home seal: Continue", await ev(() => document.querySelector("#ctx-action").textContent.trim()), "Continue");
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    t.eq("no JS errors (group)", page._errors.length, 0);
    await page.close();

    // Solo: the solo tools are feed actions; their results land in the story.
    const p2 = await newPage({ soloMode: true }, { width: 390, height: 844 });
    await p2.goto(baseURL + "/index.html", { waitUntil: "networkidle" }); await p2.waitForTimeout(200);
    const e2 = (f, a) => p2.evaluate(f, a);
    await p2.click("#use-pregen"); await p2.waitForTimeout(150);
    await e2(() => document.querySelectorAll(".card-grid .card")[0].click()); await p2.waitForTimeout(300);
    await e2(() => localStorage.setItem("dragonbane.soloJournal:" + JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id, JSON.stringify({ scene: "Lost in the marsh", entries: [{ ts: 1, text: "Old note", kind: "note" }], threads: [], npcs: [] })));
    await e2(() => localStorage.setItem("dragonbane.soloHeroId", JSON.parse(localStorage.getItem("dragonbane.characters"))[0].id));
    await e2(() => window.__go("story")); await p2.waitForTimeout(250);
    t.ok("solo: old journal carried over (note + scene)", await e2(() => /Old note/.test(document.querySelector(".adv-feed").textContent) && /Lost in the marsh/.test(document.querySelector(".adv-scene").textContent)));
    t.ok("solo: Ask / Look for trouble / Twist / Mission +5 chips", await e2(() => ["ask", "inspire", "twist", "mission"].every((k) => !!document.querySelector(`.ab-chip[data-act='${k}']`))));
    await e2(() => document.querySelector(".ab-chip[data-act='ask']").click()); await p2.waitForTimeout(150);
    await e2(() => { document.querySelector("#solo-f-q").value = "Is the bridge guarded?"; document.querySelector("#solo-f-roll").click(); }); await p2.waitForTimeout(150);
    await e2(() => document.querySelector(".modal-x").click()); await p2.waitForTimeout(150);
    t.ok("solo: the oracle answer lands in the feed with the question", await e2(() => { const e = [...document.querySelectorAll(".adv-feed .ae.k-oracle")].pop(); return !!e && /Is the bridge guarded\? →/.test(e.textContent); }));
    t.ok("solo: the oracle panel returns to its shelf", await e2(() => !!document.querySelector(".solo-shelf #solo-f-roll")));
    await e2(() => document.querySelector(".ab-chip[data-act='travel']").click()); await p2.waitForTimeout(150);
    await e2(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /Travel one shift/.test(b.textContent)).click()); await p2.waitForTimeout(200);
    await e2(() => document.querySelector(".modal-x").click()); await p2.waitForTimeout(150);
    t.ok("solo: travelling a shift turns the clock and says so", await e2(() => /The party travels on/.test(document.querySelector(".adv-feed").textContent) && /Day/.test(document.querySelector(".adv-clock b").textContent)));
    t.ok("solo: story stored per hero", await e2(() => Object.keys(localStorage).some((k) => k.startsWith("dragonbane.adventure:hero:"))));
    p2._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    t.eq("no JS errors (solo)", p2._errors.length, 0);
    await p2.close();
  },
};
