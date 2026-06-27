/* tests/run.js — regression-test harness orchestrator (Phase 20).
 *
 * Boots the app headless and runs each spec under tests/specs/. Prints a
 * per-area pass/fail summary and exits non-zero if anything fails, so CI / a
 * pre-push hook can gate on it. No app behaviour is changed — specs read real
 * persisted state and drive the real UI.
 *
 *   node tests/run.js            # run everything
 *   node tests/run.js spillage   # run only matching spec(s)
 */
const path = require("path");
const serve = require("./serve");
const { launch } = require("./browser");

const SPECS = ["smoke", "spillage", "derivation", "cast", "inventory", "a11y", "gm"];

function recorder() {
  const r = { pass: 0, fail: 0, fails: [] };
  return {
    ok(label, cond) { if (cond) r.pass++; else { r.fail++; r.fails.push(label); } },
    eq(label, actual, expected) {
      const same = JSON.stringify(actual) === JSON.stringify(expected);
      if (same) r.pass++; else { r.fail++; r.fails.push(`${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`); }
    },
    result: r,
  };
}

(async () => {
  const filter = process.argv.slice(2);
  const chosen = filter.length ? SPECS.filter((s) => filter.some((f) => s.includes(f))) : SPECS;
  if (!chosen.length) { console.error("No specs match:", filter.join(", ")); process.exit(2); }

  const root = path.join(__dirname, "..");
  const { server, url } = await serve.start(root);
  let browser;
  try { browser = await launch(); }
  catch (e) { console.error("Could not launch Chromium:", e.message); server.close(); process.exit(2); }

  const { newPage } = require("./browser");
  let totalFail = 0, totalPass = 0;
  const t0 = Date.now();

  for (const name of chosen) {
    const spec = require("./specs/" + name);
    const rec = recorder();
    try {
      await spec.run({ baseURL: url, browser, newPage: (s, v) => newPage(browser, s, v), t: rec });
    } catch (e) {
      rec.ok("spec threw: " + e.message, false);
    }
    const r = rec.result;
    totalFail += r.fail; totalPass += r.pass;
    const tag = r.fail ? "FAIL" : "ok";
    console.log(`[${name}] ${r.pass} passed / ${r.fail} failed  ${r.fail ? "✗" : "✓"} (${tag})`);
    r.fails.forEach((f) => console.log("    ✗ " + f));
  }

  await browser.close();
  server.close();

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${totalFail ? "FAILED" : "ALL PASSED"} — ${totalPass} passed, ${totalFail} failed (${secs}s)`);
  process.exit(totalFail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e.stack || e.message); process.exit(2); });
