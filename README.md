# Dragonbane Player

A character creator and tracker for the **Dragonbane** tabletop RPG, with a real-time shared party. Runs on phone, browser, and computer as an installable, offline-capable web app (PWA). Based on the Dragonbane **core rules**.

> Not affiliated with or endorsed by Free League Publishing. For personal use with the Dragonbane rules.

---

## Status

Active development — **Phases 1 through 9 Complete**. All core systems are built and verified: character creation wizard, interactive character sheet, full dice roller (boons/banes/pushing/conditions), real-time Firebase multiplayer sync, GM tabletop automation, Book of Magic expansion, and Solo GM assistant mode. See [`CLAUDE.md`](CLAUDE.md) for the full specification and changelog.

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
| `styles.css` | Dragonbane theme (light/dark) |
| `data.js` | Dragonbane core rules library |
| `data-magic.js` | Book of Magic expansion library (revised spells, new spells, 9 new schools) |
| `data-solo.js` | Solo mode oracle, tables, and AI attack routines |
| `data-monsters.js` | Bestiary library (53 true monsters with D6 attack tables) |
| `data-npcs.js` | Humanoids, bosses, undead, animals, and playable kin archetypes |
| `data-pregens.js` | The 5 Core Set pre-generated heroes |
| `firebase-config.js` | Firebase regional RTDB config and storage flags |
| `database.rules.json` | Firebase Realtime Database security rules |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA: installable + offline caching |
| `CLAUDE.md` | Full spec, data model, roadmap, and changelog |

## License / content

App code: personal-use project. Dragonbane game rules and terminology are © Free League Publishing; this tool reproduces rules data for personal play only.
