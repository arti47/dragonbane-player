# Dragonbane Player 

A character creator and tracker for the **Dragonbane** tabletop RPG, with a real-time shared party. Runs on phone, browser, and computer as an installable, offline-capable web app (PWA). Based on the Dragonbane **core rules**.

> Not affiliated with or endorsed by Free League Publishing. For personal use with the Dragonbane rules.

---

## Status

Active development — **Phases 1 through 9 Complete**. All core systems are built and verified: character creation wizard, interactive character sheet, full dice roller (boons/banes/pushing/conditions), real-time Firebase multiplayer sync, GM tabletop automation, Book of Magic expansion, and Solo GM assistant mode. See [`CLAUDE.md`](CLAUDE.md) for the full specification and changelog.

## Using it

Four tabs, plus a round seal in the middle of the nav that always shows your next move (Roll, Your turn, Next turn, Rest, Ask…):

- **Hero** — your heroes. Make one with **Quick hero** (one tap, rules-legal), **Pre-made** (Core Set) or **Build** (step by step). The sheet shows HP/WP rings around your crest, condition seals, skill tiles to roll, spell cards and a paper-doll inventory; **✎ Edit** reveals the setup controls.
- **Fight** — initiative strip, one fighter at a time (or the full list), big Attack · Cast · Move · Other buttons.
- **Story** — **Solo** (scene, oracle and tools, every result written into a story timeline) or **GM** (phase wheel, party crests, table tools).
- **Book** — the rules as illustrated chapters with search, and **Settings** (play-style presets, experience level, every switch under *Advanced*).

Press and hold a condition, attribute, skill, ability or spell anywhere to read its rule card. First launch asks three questions (how well you know the game, how you'll play, get a hero) and beginners get a short guided tour.

## Run it locally

It's a static site — serve the folder with any web server:

```bash
# Python
python3 -m http.server 8000
# or Node
npx serve .
```

Then open `http://localhost:8000`. By default it runs in **local/offline mode**: your characters are saved on the device, no account or network required.

> Opening `index.html` directly via `file://` works for a quick look, but the service worker (offline/install) only activates over `http(s)://`.

## Enable cloud sync (shared party)

The shared-party features (real-time sync, campaign join codes, combat-round helper) use Firebase. To turn them on:

1. Create a project at <https://console.firebase.google.com>.
2. Add a **Web App** (`</>`) and copy its config.
3. In **Authentication**, enable **Anonymous** sign-in (and optionally **Google**).
4. Create a **Realtime Database** (or Firestore) and **Storage** (for portraits).
5. Paste your config into [`firebase-config.js`](firebase-config.js) and set `FIREBASE_ENABLED = true`.
6. Lock down your database security rules before sharing.

The Firebase web config keys are not secret (they ship in client code), but your **security rules** are what protect data — keep them strict. Never commit a service-account key.

## Deploy

Any static host works (Firebase Hosting, Netlify, GitHub Pages, Cloudflare Pages). Upload the folder as-is.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and markup |
| `src/*.js` | Application logic as native ES modules — wizard, character sheet, dice roller, combat tracker, solo mode, sync (entry point `src/main.js`; no bundler). |
| `styles.css` | Illuminated-manuscript theme (light / dark / system) |
| `fonts/` | Self-hosted OFL fonts (EB Garamond, IM Fell English) + licences |
| `data.js` | Dragonbane core rules library |
| `data-magic.js` | Book of Magic expansion library (revised spells, new spells, 9 new schools) |
| `data-solo.js` | Solo mode oracle, tables, and AI attack routines |
| `data-monsters.js` | Bestiary library (53 true monsters with D6 attack tables) |
| `data-npcs.js` | Humanoids, bosses, undead, animals, and playable kin archetypes |
| `data-pregens.js` | The 5 Core Set pre-generated heroes |
| `firebase-config.js` | Firebase regional RTDB config and storage flags |
| `database.rules.json` | Firebase Realtime Database security rules |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA: installable + offline caching |
| `tests/` + `package.json` | Dev-only headless regression harness (not shipped with the app) |
| `CLAUDE.md` | Full spec, data model, roadmap, and changelog |

## Development & testing

The app ships as a **dependency-free static PWA** — just serve the folder (e.g.
`python3 -m http.server`) and open it; there is no build step. The `src/*.js`
files are native ES modules loaded directly by the browser.

A headless regression suite lives under `tests/` (Playwright + Chromium). It is
**dev-only** — not part of the deployed app.

```bash
npm install        # installs playwright-core (dev dependency)
npm test           # boots the app headless and runs all specs
node tests/run.js spillage   # run only matching spec(s)
```

The suite (`tests/specs/`) covers: app boot + ES-module wiring (`smoke`),
mobile text-overflow at 360/390/430px (`spillage`), rules-accurate derived stats
(`derivation`), spell-cast modals (`cast`), slot-based encumbrance
(`inventory`), keyboard/screen-reader accessibility (`a11y`), the GM
dashboard (`gm`), and the redesigned screens (`redesign`: tabs, context seal,
onboarding, quick hero legality, sheet layers, dice table, fight, story, Book).
Service workers are blocked during tests. It prints a per-area pass/fail summary and exits non-zero on
any failure. If Chromium isn't auto-detected, point to it with
`CHROMIUM_BIN=/path/to/chrome`.

## License / content

App code: personal-use project. Dragonbane game rules and terminology are © Free League Publishing; this tool reproduces rules data for personal play only.
