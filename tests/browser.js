/* tests/browser.js — headless Chromium launch + page helpers.
   Resolves the Chromium binary robustly (Playwright's pinned build may not match
   the one installed in this environment) and standardises page setup: Firebase
   network calls are aborted (tests run fully offline/local-mode) and page errors
   are collected for assertions. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

// Find a usable Chromium. Order: explicit env override → Playwright's own guess →
// any chromium-* build under PLAYWRIGHT_BROWSERS_PATH. Returns null to let
// Playwright fall back to its default (which may still work locally).
function resolveChromium() {
  if (process.env.CHROMIUM_BIN && fs.existsSync(process.env.CHROMIUM_BIN)) return process.env.CHROMIUM_BIN;
  try { const p = chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) {}
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  let dirs = [];
  try { dirs = fs.readdirSync(base); } catch (_) { return null; }
  const tryNames = dirs.filter((d) => /^chromium-\d+/.test(d)).concat(dirs.filter((d) => /^chromium($|_)/.test(d)));
  for (const d of tryNames) {
    const p = path.join(base, d, "chrome-linux", "chrome");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function launch() {
  const executablePath = resolveChromium() || undefined;
  return chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

// Create a page wired for the app: aborts Firebase, seeds settings before any
// app code runs, collects page errors on page._errors.
async function newPage(browser, settings, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 390, height: 850 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.route("**/firebasejs/**", (r) => r.abort());
  if (settings) await page.addInitScript((s) => localStorage.setItem("dragonbane.settings", JSON.stringify(s)), settings);
  page._errors = errors;
  return page;
}

module.exports = { launch, newPage, resolveChromium };
