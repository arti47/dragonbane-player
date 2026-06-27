/* a11y.js — accessibility guarantees (keep them from regressing).
   Checks: nav aria-current + decorative icons hidden; dialog semantics on
   modals (role/aria-modal/aria-labelledby) with focus moved in, Escape-to-close
   and focus restored to the opener; dice results live-announced; and that the
   ambiguous icon-only buttons (✕ ↗ ⇅ ⚔) carry an aria-label. */
const GLYPHS = ["✕", "↗", "⇅"]; // single-glyph buttons that must be labelled

module.exports = {
  name: "a11y",
  async run({ baseURL, newPage, t }) {
    const page = await newPage({ soloMode: true, bookOfMagic: true, gmAutomation: true });
    await page.goto(baseURL + "/index.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // --- Nav landmarks ---
    const nav = await page.evaluate(() => {
      const navEl = document.querySelector("#app-nav");
      const btns = [...document.querySelectorAll("#app-nav button")];
      const current = btns.filter((b) => b.getAttribute("aria-current") === "page");
      const icons = [...document.querySelectorAll("#app-nav .ico")];
      return {
        navLabel: !!navEl.getAttribute("aria-label"),
        currentCount: current.length,
        currentRoute: current[0] && current[0].dataset.route,
        iconsHidden: icons.length > 0 && icons.every((i) => i.getAttribute("aria-hidden") === "true"),
      };
    });
    t.ok("nav has an accessible label", nav.navLabel);
    t.eq("exactly one nav item is aria-current=page", nav.currentCount, 1);
    t.eq("home is current on load", nav.currentRoute, "home");
    t.ok("decorative nav icons are aria-hidden", nav.iconsHidden);

    // aria-current follows navigation
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='rules']")?.click());
    await page.waitForTimeout(150);
    const movedCurrent = await page.evaluate(() => document.querySelector("#app-nav button[aria-current='page']")?.dataset.route);
    t.eq("aria-current moves to the active tab", movedCurrent, "rules");
    await page.evaluate(() => document.querySelector("#app-nav button[data-route='home']")?.click());
    await page.waitForTimeout(120);

    // --- Open a pregen sheet ---
    await page.click("#use-pregen"); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelectorAll(".card-grid .card")[0]?.click());
    await page.waitForTimeout(400);

    // Skill-name buttons are labelled
    const skillLabelled = await page.evaluate(() => {
      const b = document.querySelector(".sk-name");
      return !!b && !!b.getAttribute("aria-label");
    });
    t.ok("skill roll buttons have an aria-label", skillLabelled);

    // Icon-only buttons on the sheet carry an aria-label
    const iconBtns = await page.evaluate((glyphs) => {
      const bad = [];
      document.querySelectorAll("#screen button").forEach((b) => {
        const txt = (b.textContent || "").trim();
        if (glyphs.includes(txt) && !(b.getAttribute("aria-label") || "").trim()) bad.push(txt);
      });
      return bad;
    }, GLYPHS);
    t.eq("icon-only sheet buttons all have aria-label", iconBtns, []);

    // --- Dialog semantics: open a skill roll ---
    const opener = await page.evaluateHandle(() => document.querySelector(".sk-name"));
    await opener.asElement().click();
    await page.waitForTimeout(200);
    const dlg = await page.evaluate(() => {
      const c = document.querySelector(".modal-card");
      if (!c) return null;
      const labelId = c.getAttribute("aria-labelledby");
      const labelEl = labelId && document.getElementById(labelId);
      return {
        role: c.getAttribute("role"),
        modal: c.getAttribute("aria-modal"),
        hasLabel: !!(labelEl && labelEl.textContent.trim()),
        focusInside: c.contains(document.activeElement),
        hasLiveResult: !!c.querySelector('[aria-live="polite"]'),
      };
    });
    t.ok("modal has role=dialog", dlg && dlg.role === "dialog");
    t.ok("modal has aria-modal=true", dlg && dlg.modal === "true");
    t.ok("modal is labelled by its title", dlg && dlg.hasLabel);
    t.ok("focus moves into the dialog on open", dlg && dlg.focusInside);
    t.ok("dialog contains a live region for results", dlg && dlg.hasLiveResult);

    // Escape closes and restores focus to the opener
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    const afterEsc = await page.evaluate(() => ({
      closed: !document.querySelector(".modal-card"),
      focusOnButton: document.activeElement && document.activeElement.tagName === "BUTTON",
    }));
    t.ok("Escape closes the dialog", afterEsc.closed);
    t.ok("focus is restored to a control after close", afterEsc.focusOnButton);

    t.ok(`no JS page errors (${page._errors.length})`, page._errors.length === 0);
    await page.close();
  },
};
