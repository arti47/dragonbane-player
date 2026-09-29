/* ui4.js — guards the audit-#4 UI behaviours (no content changes):
     compact hero header off the Overview tab; single-line name; skill chance bars +
     diamond marks; weight chips; coin discs; themed checkboxes; monster D6 attack rows;
     drawn turn checkbox; wizard dropdowns tucked away + live summary + age chips;
     compact Solo mode chip; grouped settings; slim header on scroll; route watermark;
     resume card + dying hero card; lining digits in display fonts. */
module.exports = {
  name: "ui4",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const nav = async (r) => { await page.evaluate((rt) => document.querySelector(`#app-nav button[data-route='${rt}']`).click(), r); await page.waitForTimeout(150); };

    // Wizard: dropdowns hidden until asked for; live summary; age chips.
    await page.click("#new-hero"); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll("#screen button")].find((b) => /Roll attributes/.test(b.textContent)).click());
    await page.waitForTimeout(80);
    t.ok("wizard: dropdowns hidden by default", await page.evaluate(() => getComputedStyle(document.querySelector(".attr-row select")).display === "none"));
    await page.evaluate(() => document.querySelector(".attr-manual-btn").click()); await page.waitForTimeout(60);
    t.ok("wizard: 'Assign with dropdowns' reveals them", await page.evaluate(() => getComputedStyle(document.querySelector(".attr-row select")).display !== "none"));
    await page.evaluate(() => { document.querySelectorAll(".attr-row select").forEach((s, i) => { s.value = String(i); s.dispatchEvent(new Event("change")); }); });
    await page.evaluate(() => [...document.querySelectorAll(".wiz-nav .btn")].pop().click()); await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelectorAll("#wiz-body .card")[0].click()); await page.waitForTimeout(80);
    await page.evaluate(() => [...document.querySelectorAll(".wiz-nav .btn")].pop().click()); await page.waitForTimeout(100);
    await page.evaluate(() => document.querySelectorAll("#wiz-body .card")[0].click()); await page.waitForTimeout(80);
    await page.evaluate(() => [...document.querySelectorAll(".wiz-nav .btn")].pop().click()); await page.waitForTimeout(100);
    const age = await page.evaluate(() => ({ chips: document.querySelectorAll(".mod-chip.up").length + document.querySelectorAll(".mod-chip.down").length, sum: document.querySelector(".wiz-summary")?.textContent || "" }));
    t.ok(`wizard: age mods as coloured chips (${age.chips})`, age.chips >= 5);
    t.ok(`wizard: live summary (${age.sum.trim()})`, /HP \d+/.test(age.sum) && /Move \d+/.test(age.sum));
    await page.evaluate(() => document.querySelector("#wiz-cancel").click()); await page.waitForTimeout(80);
    await page.evaluate(() => [...document.querySelectorAll(".modal-card .btn")].find((b) => /Discard/.test(b.textContent)).click()); await page.waitForTimeout(150);

    // Two heroes → resume card; one dying → skull card.
    for (const i of [0, 1]) { await nav("home"); await page.click("#use-pregen"); await page.waitForTimeout(120); await page.evaluate((k) => document.querySelectorAll(".card-grid .card")[k].click(), i); await page.waitForTimeout(250); }
    const sheet = await page.evaluate(() => ({ name: getComputedStyle(document.querySelector(".sheet-name")).whiteSpace, full: !document.querySelector(".hero-top").classList.contains("compact") || document.querySelector(".tab[aria-selected='true']").dataset.tab !== "overview" }));
    t.eq("sheet: name on one line", sheet.name, "nowrap");
    await page.evaluate(() => document.querySelector(".tab[data-tab='skills']").click()); await page.waitForTimeout(60);
    const sk = await page.evaluate(() => ({ compact: document.querySelector(".hero-top").classList.contains("compact"), blockHidden: getComputedStyle(document.querySelector(".hero-top .stat-block")).display === "none", bars: document.querySelectorAll(".skill-row .sk-bar").length, rows: document.querySelectorAll(".skill-row").length, markFs: getComputedStyle(document.querySelector(".mark")).fontSize, h: document.querySelector(".hero-top").getBoundingClientRect().height }));
    t.ok(`sheet: compact header off Overview (${Math.round(sk.h)}px)`, sk.compact && sk.blockHidden && sk.h < 200);
    t.ok("sheet: a chance bar on every skill row", sk.bars > 0 && sk.bars === sk.rows);
    t.eq("sheet: mark drawn as a diamond (glyph hidden)", sk.markFs, "0px");
    await page.evaluate(() => document.querySelector(".tab[data-tab='overview']").click()); await page.waitForTimeout(60);
    t.ok("sheet: full header back on Overview", await page.evaluate(() => !document.querySelector(".hero-top").classList.contains("compact")));
    t.ok("sheet: More moves folded", await page.evaluate(() => { const d = document.querySelector(".move-more"); return !!d && !d.open; }));
    await page.evaluate(() => document.querySelector(".tab[data-tab='gear']").click()); await page.waitForTimeout(60);
    t.ok("gear: weight shown as a chip", await page.evaluate(() => document.querySelectorAll(".wt-chip").length > 0));
    await page.evaluate(() => document.querySelector(".wt-chip").click()); await page.waitForTimeout(40);
    t.ok("gear: tapping the chip edits the weight", await page.evaluate(() => document.activeElement && document.activeElement.classList.contains("wt")));
    t.eq("gear: three coin discs", await page.evaluate(() => document.querySelectorAll(".coin-disc").length), 3);

    // Themed checkbox in the stretch-rest dialog.
    await page.evaluate(() => document.querySelector(".tab[data-tab='overview']").click());
    await page.evaluate(() => [...document.querySelectorAll(".rest-btn")].find((b) => /Stretch/.test(b.textContent)).click()); await page.waitForTimeout(120);
    t.ok("checkbox: themed (no native appearance)", await page.evaluate(() => { const c = document.querySelector(".modal-card input[type=checkbox]"); return !c || getComputedStyle(c).appearance === "none"; }));
    await page.evaluate(() => document.querySelector(".modal-x")?.click());

    // Resume + dying cards.
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[0].state.hp = 0; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await nav("home");
    const home = await page.evaluate(() => ({ resume: document.querySelector(".resume-card")?.textContent || "", dying: document.querySelectorAll(".hero-card.is-dying").length, wm: getComputedStyle(document.querySelector("#screen"), "::before").maskImage || getComputedStyle(document.querySelector("#screen"), "::before").webkitMaskImage }));
    t.ok(`home: resume card for the last hero (${home.resume.replace(/\s+/g, " ").trim()})`, /Continue/.test(home.resume));
    t.eq("home: dying hero card flagged", home.dying, 1);
    t.ok("home: route watermark set", /url\(/.test(home.wm || ""));

    // Combat: monster D6 rows + drawn turn box.
    await page.evaluate(() => { window._combatAddOpen = true; }); await nav("party");
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select")[1]; s.selectedIndex = 1; s.dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelectorAll(".combat-row").forEach((r) => { const b = r.nextElementSibling; if (b && b.style.display === "none") r.click(); })); await page.waitForTimeout(150);
    const cb = await page.evaluate(() => ({ rows: document.querySelectorAll(".atk-row .d6-face").length, box: !!document.querySelector(".turn-chip .turn-box"), green: [...document.querySelectorAll(".d6-roll")].some((b) => /ok-fill/.test(b.getAttribute("style") || "")) }));
    t.ok(`combat: monster attacks as D6 rows (${cb.rows})`, cb.rows >= 3);
    t.ok("combat: turn chip draws a checkbox", cb.box);
    t.ok("combat: Roll D6 uses the accent style", !cb.green);

    // Solo compact chip; settings grouped.
    await nav("solo");
    t.ok("solo: mode note hidden when active", await page.evaluate(() => { const n = document.querySelector(".solo-ctx.is-on .solo-ctx-note"); return !!n && getComputedStyle(n).display === "none"; }));
    await nav("about");
    const st = await page.evaluate(() => ({ groups: [...document.querySelectorAll("#settings-panel h3")].map((h) => h.textContent.trim()), clamped: [...document.querySelectorAll(".toggle-row .tr-desc")].every((d) => getComputedStyle(d).webkitLineClamp === "2") }));
    t.ok(`settings: Content + Play style groups (${st.groups.join(" / ")})`, st.groups.includes("Content") && st.groups.includes("Play style"));
    t.ok("settings: descriptions clamped to 2 lines", st.clamped);

    // Header slims on scroll; digits in display fonts use the lining face.
    await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(250);
    t.ok("header: slims after scrolling", await page.evaluate(() => document.documentElement.classList.contains("hdr-slim")));
    t.ok("fonts: display stack starts with the lining-digit face", await page.evaluate(() => /Fell Digits/.test(getComputedStyle(document.querySelector(".section-title h2")).fontFamily)));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();
  },
};
