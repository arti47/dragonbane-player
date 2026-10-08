/* ui5.js — guards the audit-#5 UI behaviours (no content changes):
     textareas grow with their text; "/" drawn in EB Garamond; duplicate spell text
     folded on the resolution card; one-line toolbar/select labels; wrapped titles move
     their ornament under the text; movement rating line + one button layout; wizard
     age chips without a dangling "·"; GM rolled result card; slot-square colours;
     current/max HP split; heroic picker with locked ones folded; panel title icons;
     combat card ⋯ menu on phones; dying HP track; Solo mode switch; sheet watermark;
     gilt-underline tabs; GM panel after Abilities; Dragon/Demon sheen; page edges. */
module.exports = {
  name: "ui5",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true, gmAutomation: true, gmScreen: true }, { width: 390, height: 844 });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const nav = async (r) => { await page.evaluate((rt) => window.__go(rt), r); await page.waitForTimeout(200); };
    const tab = async (k) => { await page.evaluate((x) => document.querySelector(`.tab[data-tab='${x}']`).click(), k); await page.waitForTimeout(150); };

    // Slash glyph comes from the EB Garamond "Fell Digits" face.
    t.ok("fonts: '/' mapped to the EB Garamond digits face", await page.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.type === 5 && /Fell Digits/.test(r.cssText) && /U\+2F\b|U\+002F/i.test(r.cssText)); } catch (_) { return false; } })));

    // Wizard age: no dangling separator when the chips wrap.
    await page.click("#new-hero"); await page.waitForTimeout(150);
    await page.evaluate(() => [...document.querySelectorAll("#screen button")].find((b) => /Roll attributes/.test(b.textContent)).click());
    await page.evaluate(() => { document.querySelectorAll(".attr-row select").forEach((s, i) => { s.value = String(i); s.dispatchEvent(new Event("change")); }); });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { const c = document.querySelector("#wiz-body .card"); if (c && !document.querySelector("#wiz-body .card.sel")) c.click(); }); await page.waitForTimeout(60); await page.evaluate(() => [...document.querySelectorAll(".wiz-nav .btn")].pop().click()); await page.waitForTimeout(100); }
    t.ok("wizard: age separator hidden next to chips", await page.evaluate(() => { const m = document.querySelector(".age-meta.has-chips .mod-sep"); return !!m && getComputedStyle(m).display === "none"; }));

    // Pre-gen mage → sheet.
    await nav("home");
    await page.click("#use-pregen"); await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await page.waitForTimeout(350);
    const ov = await page.evaluate(() => {
      const kids = [...document.querySelectorAll("#sheet-pane-overview > .panel, #sheet-pane-overview > details")];
      const iAb = kids.findIndex((x) => /Abilities/.test(x.querySelector("h3")?.textContent || "")), iGm = kids.findIndex((x) => x.classList.contains("gm-auto"));
      const v = document.querySelector(".vital.hp .vital-val");
      const cur = v.querySelector(".vv-cur"), max = v.querySelector(".vv-max");
      return { order: iAb >= 0 && iGm > iAb, split: !!cur && !!max && parseFloat(getComputedStyle(cur).fontSize) > parseFloat(getComputedStyle(max).fontSize), text: v.textContent.trim(),
        icon: !!document.querySelector("#sheet-pane-overview .panel > h3 .h3-ic"), rating: !!document.querySelector(".move-meter .move-rating"),
        acts: [...document.querySelectorAll(".move-acts > .move-btn")].every((b) => getComputedStyle(b).flexDirection === "column"),
        wm: getComputedStyle(document.querySelector("#screen")).getPropertyValue("--wm").includes("svg"),
        tabBg: getComputedStyle(document.querySelector(".tab[aria-selected='true']")).backgroundColor, tabLine: getComputedStyle(document.querySelector(".tab[aria-selected='true']"), "::after").content };
    });
    t.ok("sheet: GM Automation disclosure sits after Abilities", ov.order);
    t.ok(`sheet: HP value split current/max (${ov.text})`, ov.split && /^\d+ \/ \d+$/.test(ov.text));
    t.ok("sheet: plain panel titles get an icon", ov.icon);
    t.ok("sheet: movement rating on its own line + one button layout", ov.rating && ov.acts);
    t.ok("sheet: route watermark defined (no bare square)", ov.wm);
    t.ok(`tabs: active tab is a gilt underline, not a filled pill (${ov.tabBg})`, /rgba\(0, 0, 0, 0\)|transparent/.test(ov.tabBg) && ov.tabLine === '""');

    // Story: memento textarea grows to show its whole text.
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[0].identity.memento = "A worn diary full of your experiences and discoveries, bound in cracked leather and tied with a faded ribbon."; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await nav("home"); await page.evaluate(() => document.querySelectorAll(".card[data-id]")[0].click()); await page.waitForTimeout(300);
    await tab("story"); await page.waitForTimeout(150);
    const ta = await page.evaluate(() => { const t = [...document.querySelectorAll("#sheet-pane-story textarea")].find((x) => /diary/.test(x.value)); return t ? { sh: t.scrollHeight, ch: t.clientHeight } : null; });
    t.ok(`story: memento field shows all its text (${ta && ta.sh}/${ta && ta.ch})`, !!ta && ta.sh <= ta.ch + 2);

    // Gear: 4/4 slots → warn colour; attack button is gilt.
    await tab("gear");
    t.ok("gear: full slot squares use the warning tint", await page.evaluate(() => !!document.querySelector(".enc-slots.is-warn, .enc-slots.is-over")));

    // Heroic picker: available first, locked folded.
    await tab("skills");
    await page.evaluate(() => { const d = document.querySelector(".adv-menu"); if (d) d.open = true; [...document.querySelectorAll("#screen button")].find((b) => /Gain ability/.test(b.textContent)).click(); });
    await page.waitForTimeout(150);
    const hp = await page.evaluate(() => ({ first: document.querySelectorAll(".modal-card .modal-body > .card-grid .card.locked").length, folded: document.querySelectorAll(".modal-card .heroic-locked .card.locked").length, open: document.querySelector(".modal-card .heroic-locked")?.open }));
    t.ok(`heroic picker: locked abilities folded away (${hp.folded} locked, closed)`, hp.first === 0 && hp.folded > 0 && hp.open === false);
    await page.evaluate(() => document.querySelector(".modal-x").click());

    // Cast Fireball: the second copy of the spell text is folded.
    await tab("magic");
    await page.evaluate(() => [...document.querySelectorAll(".cast-btn")].find((b) => b.closest(".cast-row").textContent.includes("Fireball")).click());
    await page.waitForTimeout(150);
    let folded = null;
    for (let i = 0; i < 12 && !folded; i++) {
      await page.evaluate(() => { const b = [...document.querySelectorAll(".modal-card button")].find((x) => x.textContent.trim() === "Cast" && !x.disabled); if (b) b.click(); });
      await page.waitForTimeout(120);
      folded = await page.evaluate(() => { const c = document.querySelector(".modal-card .magic-auto-card"); if (!c) return null; const d = c.querySelector(".sa-text"); return { details: !!d, closed: d && !d.open, skip: getComputedStyle(c.querySelector(".sa-skip")).whiteSpace }; });
      if (!folded) { await page.evaluate(() => document.querySelector(".modal-x").click()); await page.waitForTimeout(80); await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("dragonbane.characters")); s[0].state.wp = 18; localStorage.setItem("dragonbane.characters", JSON.stringify(s)); }); await page.evaluate(() => [...document.querySelectorAll(".cast-btn")].find((b) => b.closest(".cast-row").textContent.includes("Fireball")).click()); await page.waitForTimeout(120); }
    }
    t.ok("cast: duplicate spell text folded into a closed disclosure", !!folded && folded.details && folded.closed);
    t.ok("cast: 'Skip Auto' stays on one line", !!folded && folded.skip === "nowrap");
    await page.evaluate(() => document.querySelectorAll(".modal-x").forEach((x) => x.click()));

    // Combat at phone width: ⋯ menu, one-line toolbar, one-line selects, dying track.
    await page.evaluate(() => { const cs = JSON.parse(localStorage.getItem("dragonbane.characters")); cs[0].state.hp = 0; localStorage.setItem("dragonbane.characters", JSON.stringify(cs)); });
    await page.evaluate(() => { window._combatAddOpen = true; }); await nav("party");
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select"); s[0].selectedIndex = 1; s[0].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[0].click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { const s = document.querySelectorAll(".inv-add select"); s[1].selectedIndex = 1; s[1].dispatchEvent(new Event("change")); document.querySelectorAll(".inv-add .btn.secondary")[1].click(); });
    await page.waitForTimeout(250);
    const cb = await page.evaluate(() => {
      const more = document.querySelector(".cb-more-btn"), menu = more.parentElement.querySelector(".cb-menu");
      const nt = [...document.querySelectorAll(".round-actions > .btn")].find((b) => /Next turn/.test(b.textContent));
      const lh = parseFloat(getComputedStyle(nt).lineHeight) || parseFloat(getComputedStyle(nt).fontSize) * 1.3;
      const sel = document.querySelector(".inv-add select");
      return { moreShown: getComputedStyle(more).display !== "none", menuHidden: getComputedStyle(menu).display === "none",
        oneLine: nt.scrollHeight < lh * 1.9 + 16, sel: getComputedStyle(sel).whiteSpace + "/" + getComputedStyle(sel).textOverflow, dying: !!document.querySelector(".hpbar.dying") };
    });
    t.ok("combat: header actions behind ⋯ on phones", cb.moreShown && cb.menuHidden);
    t.ok("combat: 'Next turn' stays on one line", cb.oneLine);
    t.eq("selects: one line with ellipsis", cb.sel, "nowrap/ellipsis");
    t.ok("combat: dying hero gets a red HP track", cb.dying);
    await page.evaluate(() => document.querySelector(".cb-more-btn").click()); await page.waitForTimeout(60);
    const opened = await page.evaluate(() => getComputedStyle(document.querySelector(".cb-more-btn").parentElement.querySelector(".cb-menu")).display === "flex");
    await page.evaluate(() => document.querySelector(".section-title h2").click()); await page.waitForTimeout(60);
    const closed = await page.evaluate(() => getComputedStyle(document.querySelector(".cb-more-btn").parentElement.querySelector(".cb-menu")).display === "none");
    t.ok("combat: ⋯ opens the menu, tapping elsewhere closes it", opened && closed);

    // Rules: the long title wraps → its ornament moves under the text.
    await nav("rules"); await page.waitForTimeout(150);
    t.ok("rules: wrapped title puts the ornament underneath", await page.evaluate(() => { const s = document.querySelector(".section-title"); return s.classList.contains("t-wrap") && getComputedStyle(s.querySelector(".rule")).order === "3"; }));

    // Solo mode is a switch.
    await nav("solo");
    t.ok("solo: 'Rolling as' hero picker on top", await page.evaluate(() => !!document.querySelector(".solo-top .solo-ctx-sel")));

    // GM reference: rolled result card, no leading dash on rows.
    await nav("gm");
    const gm = await page.evaluate(() => {
      const d = [...document.querySelectorAll(".rule-accordion")].find((x) => /Demon fumble/.test(x.textContent)); d.open = true;
      [...d.querySelectorAll("button")].find((b) => /Roll/.test(b.textContent)).click();
      return { card: !!d.querySelector(".gm-roll-out .gro-die"), dash: [...d.querySelectorAll(".d6-row span")].some((s) => /^—/.test(s.textContent.trim())) };
    });
    t.ok("gm: rolled result shown as a card with a die chip", gm.card);
    t.ok("gm: table rows lose the decorative leading dash", !gm.dash);

    // Dragon/Demon sheen rule exists (one sweep, reduced-motion aware).
    t.ok("dice: Dragon/Demon sheen animation defined", await page.evaluate(() => [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.type === 7 && r.name === "rollSheen"); } catch (_) { return false; } })));

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    page._errors.slice(0, 5).forEach((e) => t.ok("  error: " + e, false));
    await page.close();

    // Desktop: capped tab widths + faint gilt page edges.
    const dp = await newPage({}, { width: 1280, height: 900 });
    await dp.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await dp.waitForTimeout(200);
    await dp.click("#use-pregen"); await dp.waitForTimeout(150);
    await dp.evaluate(() => document.querySelectorAll(".card-grid .card")[0].click());
    await dp.waitForTimeout(300);
    const d = await dp.evaluate(() => ({ edges: getComputedStyle(document.querySelector("#screen")).backgroundImage.split("linear-gradient").length - 1, tabW: document.querySelector(".tab").getBoundingClientRect().width }));
    t.ok(`desktop: gilt page edges (${d.edges} rules)`, d.edges >= 2);
    t.ok(`desktop: tab width capped (${Math.round(d.tabW)}px)`, d.tabW <= 172);
    t.ok(`desktop: no JS page errors (${dp._errors.length})`, dp._errors.length === 0);
    await dp.close();
  },
};
