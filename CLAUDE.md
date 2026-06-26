# Dragonbane Player App

A player-facing character app for the **Dragonbane** fantasy tabletop RPG (Free League), built to run on **phone, browser, and computer** with a real-time shared party. Based **solely on the Dragonbane core rules** (no campaign- or setting-specific content).

> **IMPORTANT — keep this file in sync.** This `CLAUDE.md` is the canonical description of the app. **Every time any edit is made to the code, this file MUST be updated in the same change** (features, architecture, data model, file list, changelog, and roadmap status). Treat a code change with a stale `CLAUDE.md` as incomplete. This project is destined for GitHub, so this file doubles as the repository's primary documentation.

---

## 1. Overview

| | |
|---|---|
| **Game** | Dragonbane (Free League) — core rules only |
| **Audience** | Players (player-facing tool, not a GM screen) |
| **Platforms** | Phone, browser, desktop (installable PWA) |
| **Core job** | Character **creation wizard** + full in-play **tracker** |
| **Multiplayer** | Multiple characters + real-time **shared party** view |
| **Backend** | Firebase (Realtime DB/Firestore + Storage), offline-capable |
| **Offline** | Installable PWA; read/edit own sheet offline, syncs when online |
| **Theme** | Dragonbane parchment/ink look (default) + light/dark toggle |

---

## 2. Feature Specification

### 2.1 Character Creation Wizard
- Roll/assign the six attributes (**4D6, drop lowest**; assign-as-rolled then swap two), scale **3–18**.
- Choose **kin** (Human, Halfling, Dwarf, Elf, Mallard, Wolfkin) — applies innate ability and base movement.
- Choose **profession** — sets starting trained skills, starting gear, and one starting heroic ability (Mage gets magic instead).
- Choose **age** (Young / Adult / Old) — applies attribute modifiers and number of trained skills (6+2 / 6+4 / 6+6).
- Auto-derive all derived stats and skill base chances (see §3).
- Validates a legal character per the rules before finishing.

### 2.2 Dice Engine (full)
- **d20 roll-under** per skill; reports success/failure.
- **Dragon (natural 1)** = critical success; **Demon (natural 20)** = critical failure.
- **Boons / Banes** — roll 2D20, keep best (boon) / worst (bane).
- **Pushing** a failed roll — re-roll once; auto-applies a **condition** of the player's choice (enforces "can't pick a condition you already have"; blocks pushing once all six are held).
- **Weapon damage** rolls with the correct STR/AGL **damage bonus** auto-added.

### 2.3 Rules Library & Compendiums (baked in — `data.js`)
The full Dragonbane core game data organized into searchable accordion categories (`<details class="rule-accordion">`) with live text filter:
- All **6 kin** + innate abilities (and base movement).
- All **professions** with trained-skill lists and starting gear/equipment.
- All **30 core skills** with governing attribute (+ secondary/magic skills).
- All **heroic abilities** (requirements, WP cost, effect).
- All **spells** across the three schools: **Animism, Elementalism, Mentalism** (+ magic tricks, rank 0).
- **Wilderness Journeys & Travel compendium** — Shifts time measurement (~6h each), camp/rest Bushcraft rules, foraging, and D6 Mishap Table (also accessible in Solo tab).
- **Core Gameplay Loop & Stages compendium** — Time scales (10s combat rounds vs 6h wilderness shifts), combat stage sequence, and D20 pushing rules.

### 2.4 In-Play Tracking (deepest tier)
- **Conditions** — the six (Exhausted/STR, Sickly/CON, Dazed/AGL, Angry/INT, Scared/WIL, Disheartened/CHA) with their **roll penalties auto-applied** to the relevant attribute/skill rolls.
- **Death & dying** — when HP hits 0, run the death-roll sequence (success/failure tally), **rally**, and track unconsciousness.
- **Rest & recovery** — round / stretch / shift timing; Round Rest & Stretch Rest healing of HP/WP and condition removal.
- **Combat-round helper** — initiative order (Dragonbane initiative card draw 1–10), per-round action/movement reminders, and drop-in NPC/monster combatants.

### 2.5 Skill Advancement (full auto)
- Auto-marks a skill with an **advancement mark** when it crits (Dragon) or fumbles (Demon) via the roller.
- **Session-end advancement flow** — roll each marked skill; on success the skill increases; handles awarding new heroic abilities / WP where relevant.

### 2.6 Inventory, Encumbrance & Money (full auto)
- Inventory items each carry a **weight**; app sums encumbrance vs limit (**½ STR rounded up**).
- **Over-encumbered** warning + prompts the STR roll to move.
- **Tiny items** and **mementos** tracked in their own sections (don't count toward encumbrance).
- **Money** in **gold / silver / copper** with coin-encumbrance (100+ coins = 1 item).

### 2.7 Magic in Play (full)
- Known **magic tricks (rank 0)** and **spells (rank 1–3)** from the character's school.
- Tap to cast: deducts **WP (cost = rank)**, with option to spend extra WP to **boost** (range/damage/etc.), rolls the relevant magic skill, flags Dragon/Demon.

### 2.8 Character Flavor (full)
- Name, kin, profession, age, **appearance**, **weakness**, **memento**, freeform **notes/journal**.
- **Portrait image** upload (synced via Firebase Storage).

---

## 3. Derived Stats & Tables (reference)

- **Damage Bonus** (separate for STR and AGL): ≤12 → none; 13–16 → **+D4**; 17+ → **+D6**.
- **Movement** = kin base modified by AGL.
  - Kin base: Human 10, Halfling 8, Dwarf 8, Elf 10, Mallard 8, Wolfkin 12.
  - AGL mod: 1–6 → −4; 7–9 → −2; 10–12 → 0; 13–15 → +2; 16–18 → +4.
- **Hit Points (HP)** max = **CON** (increased by *Robust* heroic ability).
- **Willpower Points (WP)** max = **WIL** (increased by *Focused* heroic ability).
- **Skill base chance** by governing attribute: 1–5 → 3; 6–8 → 4; 9–12 → 5; 13–15 → 6; 16–18 → 7.
- **Age effects** (max 18): Young → AGL & CON +1, 6+2 trained skills; Adult → no mod, 6+4; Old → STR/AGL/CON −2, INT/WIL +1, 6+6.
- **Skills** scale 1–18, d20 roll-under; **conditions** from pushing rolls.
- **Encumbrance** limit = ½ STR (round up); coins: <100 tiny, 100–199 = 1 item, etc.

*(All values above are drawn from the Dragonbane core rules via the project's NotebookLM notebook and will be expanded into the full `data.js` library.)*

---

## 4. Architecture

### 4.1 Multiplayer & Identity
- **Multiple characters** per device + a **shared party view** (combined initiative, party HP/conditions at a glance).
- **Firebase** backend: **Realtime Database (RTDB)** (selected over Firestore for low latency, presence, and lower high-frequency update costs) + Storage for portraits.
- **Auth:** Instant launch into Local/Anonymous mode (zero friction). **Optional Google account linking** lives inside the Settings tab to back up characters across devices.
- **Campaigns:** A player creates a campaign and gets a short **join code** formatted as a memorable fantasy phrase (e.g. `red-dragon-sword`); others enter the code to join the same party.
- **Permissions:** **Player-only UI now**, but the schema and Firebase Security Rules explicitly include `role: "player" | "gm"` from day one so a GM screen can be built later without database migrations.

### 4.2 PWA / Offline & Updates
- Installable (add-to-home-screen), app-like launch.
- **Local Only Mode:** Preserves `localStorage` alongside Firebase for offline standalone play without API keys.
- **Cloud Offline Persistence:** Firebase RTDB IndexedDB caching handles offline edits when connected to a campaign.
- **PWA Updates:** Includes an in-app *"Update Available: Click to Reload"* toast/banner when the Service Worker detects new code, guaranteeing all players run identical rules and UI.

### 4.3 Firebase Setup Model
- App ships with a **clearly-marked placeholder config block** and runs immediately in a **local/offline mode** (no sync) so it works out of the box.
- Dropping in real Firebase keys switches it to **live cloud sync**.
- Setup instructions live in `README.md` (and summarized here).

---

## 5. File Structure (small organized project)

| File | Purpose | Status |
|---|---|---|
| `index.html` | App shell / markup | ✅ COMPLETE — shell done (header, nav, screen mount, script loads); wizard/tracker markup fully wired. |
| `app.js` | Application logic (wizard, tracker, dice, sync) | ✅ ALL PHASES COMPLETE (Phases 1–9): wizard, sheet, roller, combat tracker, solo assistant, cloud sync, accordions/compendiums, tabletop automation & GM guards. |
| `styles.css` | Theming (Dragonbane look + light/dark) | ✅ Dragonbane theme (light + dark) + wizard/sheet styles (chips, attr grid, forms, steps) — verified in browser |
| `data.js` | Dragonbane rules library (kin, professions, skills, abilities, spells, equipment) | ✅ COMPLETE — kin, conditions, derived tables, ages, 30 skills + 3 magic schools, 10 professions (+ full gear tables), 44 heroic abilities, all spells (4 schools), weapons/shields/armor/helmets, general gear, instruments, currency |
| `data-magic.js` | Book of Magic library (revised spells, new spells for existing schools, 9 new schools) | ✅ COMPLETE & WIRED — 6 revised spells + 39 new spells for existing schools (+familiar table) + all 9 new schools; 254 magic entries total, fully wired into wizard and casting. |
| `data-solo.js` | Solo rules: oracle, likelihoods, random tables, solo heroic abilities | ✅ COMPLETE & WIRED — Fortune Chart oracle, Inspiration Table (3D20), Dragon/Demon twists, Solo NPC generator + quick combat add, D6 NPC Attack Table AI roller, and Solo Heroic Abilities wired into wizard and initiative. |
| `data-monsters.js` | Dragonbane Bestiary library (53 true monsters) | ✅ COMPLETE & WIRED — 12 core monsters + Robber Knight + 40 compendium additions. Auto-hit attacks roll damage via `Roller.monsterAttack`. |
| `data-npcs.js` | Dragonbane Humanoid NPCs, Bosses, Undead & Animals library | ✅ COMPLETE & WIRED — Guard, Cultist, Thief, Villager, Hunter, Bandit, Adventurer, Scholar, Bosses, Goblins, Orcs, Skeletons, animals + 17 playable kin archetypes. Rolls d20 attacks via `Roller.npcAttack`. |
| `data-pregens.js` | The 5 Dragonbane Core Set pre-generated characters | ✅ COMPLETE & WIRED — Aodhan, Orla, Makander, Krisanna, Bastonn. Instantiated via "Use a pre-gen" on Heroes screen. |
| `database.rules.json` | Firebase Realtime Database security rules | ✅ COMPLETE — enforces player read/write own sheet + shared combat state; GM read/write all sheets. |
| `manifest.json` | PWA manifest (installable) | ✅ done |
| `service-worker.js` | Offline caching | ✅ done — network-first for same-origin, caches all data files. |
| `firebase-config.js` | Firebase config & flags | ✅ done — configured for regional RTDB (`asia-southeast1.firebasedatabase.app`) + `FIREBASE_ENABLED` flag. |
| `icon.svg` | PWA app icon | ✅ done |
| `README.md` | GitHub readme + Firebase setup steps | ✅ done |
| `CLAUDE.md` | This file — canonical spec, kept in sync with code | ✅ active |

*(Update this table's Status column as files are created/changed.)*

---

## 6. Data Model (Firebase) — draft

> To be finalized during build. Structured GM-ready.

```
campaigns/{campaignId}
  meta: { name, joinCode, createdAt, ownerUid }
  members/{uid}: { displayName, characterId, role: "player" }   // "player" | "gm" (enforced in security rules)
  combat: { active, round, initiativeOrder[], combatants{...} }  // shared round helper

characters/{characterId}
  owner: uid
  campaignId
  identity: { name, kin, profession, age, appearance, weakness, memento, portraitUrl }
  attributes: { STR, CON, AGL, INT, WIL, CHA }
  derived:    { movement, hpMax, wpMax, dmgBonusSTR, dmgBonusAGL }
  state:      { hp, wp, conditions{...}, deathRolls{...} }
  skills:     { <skillName>: { level, trained, mark } }
  abilities:  [ ... ]   // heroic + innate kin abilities
  spells:     { tricks[], known[] }
  inventory:  { items[], tiny[], mementos[], money:{ gold, silver, copper } }
  notes:      string
  advancementLog: [ ... ]
```

---

## 7. Roadmap

### Phase 0 — Foundations
- [x] Create project scaffold (all files in §5).
- [x] `data.js` rules library — full Dragonbane core data extracted from NotebookLM. **COMPLETE.**
  - [x] Attributes, conditions, derived-stat tables, ages
  - [x] Kin (6) + innate abilities + base movement
  - [x] Skills (30 core + 3 magic schools) with governing attributes
  - [x] Professions (10) — key attribute, profession skill lists, starting heroic ability, **full D6 gear tables**
  - [x] Heroic abilities (44) — requirement, WP cost, full effect text
  - [x] Spells — General Magic + Animism / Elementalism / Mentalism (tricks + ranks 1–3)
    - [x] General Magic — 6 tricks + 7 spells (Dispel, Protector, Magic Shield, Transfer, Magic Seal, Charge, Permanence)
    - [x] Animism — 5 tricks + 10 spells (ranks 1–3)
    - [x] Elementalism — 3 tricks + 15 spells (ranks 1–3, incl. elemental summon stats)
    - [x] Mentalism — 3 tricks + 13 spells (ranks 1–3)
  - [x] Equipment — weapons (melee + ranged + shields) + mastercrafted modifier; armor (4) & helmets (2); general adventuring gear (~55 items w/ cost, weight, effect); musical instruments; currency conversion
- [x] `firebase-config.js` placeholder + local/offline fallback mode.
- [x] Base theming (`styles.css`) — Dragonbane look + light/dark toggle. *(verified in browser)*
- [x] PWA shell (`manifest.json`, `service-worker.js`, `icon.svg`) — installable + offline.
- [x] App shell (`index.html` + `app.js`) — header, bottom nav, router, storage layer (local mode), Rules browser backed by `data.js`, `README.md`. **Phase 0 COMPLETE.**

### Phase 1 — Character Creation Wizard ✅ COMPLETE (verified in browser)
- [x] Attribute roll/assign (4D6 drop lowest; assign each rolled score to an attribute; age mods applied, capped 3–18).
- [x] Kin / profession / age selection with auto-fill (mage school selector for Mages).
- [x] Derived stats + skill base-chance computation (movement, HP/WP max, damage bonuses; trained skill = 2× base chance, untrained = base chance — verified correct).
- [x] Starting trained skills (exactly age total, ≥6 from profession; school auto-trained for mages), gear (D6 package, dice rolled), heroic ability (auto/choice) or magic (3 tricks + 3 rank-1 spells from school/General).
- [x] Legal-character validation at each step; saves character + opens a read-only sheet view (full tracker is Phase 2).
- [x] **Pre-generated characters** — the 5 Core Set pregens (`data-pregens.js`) selectable via "Use a pre-gen" on the Heroes screen; instantiates a full character (derives stats + skills) and opens its sheet. Verified end-to-end (mage Aodhan and knight Makander).

### Phase 2 — Core Tracker ✅ COMPLETE (verified in browser)
- [x] Full character sheet view (attributes, derived, skills, conditions) — live & persistent.
- [x] Editable HP/WP (steppers, clamped 0–max, persist); the six conditions toggle and **auto-flag a bane (⚠)** on the affected attribute and its skills (actual roll application lands with the Phase 3 dice engine).
- [x] Inventory / encumbrance / money automation — per-item weights, add/remove, encumbrance bar vs ½-STR limit with over-encumbered warning, tiny items & mementos, gold/silver/copper steppers.
- [x] Abilities & spells display; advancement-mark toggles per skill; notes/journal; scroll preserved across live re-renders. Legacy inventory auto-migrated to structured form.

### Phase 3 — Dice Engine ✅ COMPLETE (verified in browser)
- [x] d20 roll-under per skill (tap a skill name) + Dragon (nat 1) / Demon (nat 20); auto-adds an advancement mark on a crit/fumble.
- [x] Boons/banes — net stepper (boon = 2d20 keep lowest, bane = keep highest); a condition on the skill's attribute auto-applies a bane.
- [x] Pushing → pick a condition (not already held) then re-roll; blocked on a Demon.
- [x] Weapon damage rolls (⚔ on inventory weapons) with the correct STR/AGL damage bonus (respects "no damage bonus").
- [x] Spell casting — power-level selector (2 WP/level, 6 for Dracomancy), rolls the school skill, deducts WP even on failure, Dragon perks, Demon → full Magical Mishap table (conditions/damage/WP auto-applied for results 1–8); magic tricks cost 1 WP and auto-succeed.

### Phase 3B — Book of Magic: Spells & Schools ✅ COMPLETE (verified in browser) *(depends on Phase 3 casting)*
> Expansion content, gated behind a **"Book of Magic" content toggle** (per character and/or campaign), off by default. See §10.
- [x] Extract Book of Magic data into `data-magic.js` (separate file). **DATA COMPLETE** (254 magic entries, validated).
- [x] **Revised spells** — the six core spells (Dispel, Magic Seal, Permanence, Protector, Resurrection, Sleep) extracted as official revised versions (canonical everywhere — Q3/B). App overrides `data.js` entries with these.
- [x] New spells for existing schools (General 7, Animism 16, Elementalism 8, Mentalism 8) + familiar animal table.
- [x] All 9 new schools fully statted (Demonology, Harmonism, Illusionism, Necromancy, Symbolism, Witchcraft, Alchemy, Enchanting, Dracomancy).
- [x] Content toggle wiring (`Settings` + `Magic` modules; toggle in **Settings & About**) + Rules browser shows the 9 new schools & extra spells only when on. **Revised spells applied everywhere** (always canonical).
- [x] Wizard: when toggle on, a mage may start with any eligible school (core 3 + the new ones, **Dracomancy excluded** as learn-in-play); new schools added as INT magic skills via `buildSkills`.
- [x] Wizard: **Bard as caster** — when toggle on, a Bard may study **Harmonism** (toggle in the profession step); gets a Magic step (3 tricks + 3 rank-1 Harmonism spells), still gets Musician; **casts via Performance** (`spells.castSkill`), verified in the dice engine. `Roller.cast` uses the cast skill's attribute for the condition bane.

### Phase 4 — In-Play Systems ✅ COMPLETE (verified in browser)
- [x] Death & dying (corrected to official rules) — at 0 HP a dying panel tracks successes/failures via **D20 vs CON** (roll ≤ CON = success). **3 successes → stabilize & recover D6 HP**; **3 failures → death**. **Dragon (1) = two successes**, **Demon (20) = two failures**, death rolls can't be pushed. **Taking damage while down = a failed death roll**. **Rally** (ally PERSUASION / self WIL-with-bane): you act but keep rolling. **Saved (Healing)**: an adjacent ally's HEALING roll → stop rolls + recover D6 HP.
- [x] Rest & recovery — Round rest (+D6 WP), Stretch rest (+D6 HP/WP, heal one chosen condition), Shift rest (full HP/WP, all conditions cleared).
- [x] Skill advancement — marks auto-added on Dragon/Demon (Phase 3); "End session — roll advancement" rolls D20 per marked skill (improve if > level, max 18) and clears marks.
- [x] Combat-round helper — the **Combat** tab (`Combat` module, `dragonbane.combat` storage): add heroes, Bestiary monsters (12 true monsters with auto-hitting attacks from `data-monsters.js`), or custom NPCs. Accordion combatant rows with inline HP (+/−) vitals tracking and one-click attack rolling (`Roller.monsterAttack` / `Roller.damage`).

### Phase 4B — Book of Magic: School Subsystems ✅ COMPLETE (verified in browser)
- [x] Enchanting / Alchemy — **+ Craft** / **+ Brew** buttons in the Magic panel add the result to inventory.
- [x] Necromancy / Demonology / Elementalism / Symbolism / Witchcraft / General — **Summons & Companions roster** on the sheet (HP tracking, remove).
- [x] Corruption / insanity tracking — **permanent WP-loss control** (`state.wpPenalty`).
- [x] Active-effects tracker — **Active Spells & Effects** panel (`c.effects[]`) with a **+ Track** quick-add on lasting spells.
- [x] Dracomancy learn-in-play — a **"Learn a spell or school"** modal (`Sheet.learnMagic`) in the Magic panel.

### Phase 5 — Multiplayer & Sync ✅ COMPLETE (verified in browser)
- [x] Firebase Realtime Database (RTDB) setup & schema initialization.
- [x] Security Rules: enforce player read/write own sheet + shared combat state; GM read/write all sheets.
- [x] Instant Local/Anonymous auth flow + "Link Google Account" button in Settings.
- [x] Party overview dashboard & live sheet sync.
- [x] Shared combat tracker sync (`dragonbane.combat` RTDB node).
- [x] Portrait image upload (client-side canvas compression) & PWA reload toast.

### Phase 5B — Solo Mode Wiring ✅ COMPLETE (verified in browser)
- [x] Fortune Chart oracle widget (6 columns, 3 likelihoods).
- [x] Inspiration Table widget (D20×3 prompt generator).
- [x] Solo NPC templates (Minion/Boss generator) & NPC Attack Table widget (4 roles).
- [x] Solo Heroic Abilities (Army of One, Sole Survivor) wiring into wizard/sheet.

### Phase 6 — Navigation & Rules Neatening ✅ COMPLETE (verified in browser)
- [x] Reorganized Rules Library into searchable accordion categories with live text filter.
- [x] Wilderness Journeys & Travel Reference compendium (Shifts, camp/rest Bushcraft rules, foraging, mishap table).
- [x] Core Gameplay Loop & Stages walkthrough compendium.
- [x] Dynamic Solo tab hiding when disabled in Settings.

### Phase 8 — Combat Ergonomics & Caster NPCs ✅ COMPLETE (verified in browser)
- [x] Repositioned combat row Open Sheet and Delete icons.
- [x] Wired explicit known spells arrays into canonical caster NPCs.
- [x] Implemented `Roller.npcCast` pop-up modal with d20 magic skill checks.
- [x] Clickable sync status pill & Heroes screen prompt banner.
- [x] Desperate healing restrictions, metal armor/weapon warnings, and grimoire unprepared checkboxes.

### Phase 9 — Tabletop Automation & GM Guards ✅ COMPLETE (verified in browser)
- [x] Two-way HP/WP live sync between Combat Tracker rows and Hero character sheets.
- [x] Bestiary Monster random attack buttons auto-roll damage dice and open Target Applier.
- [x] GM-only controls locking (`Combat.isGm`) for Initiative, Next Turn/Round, and Reset.
- [x] Automatic ammunition deduction (`combatAmmo`) and out-of-ammo roll blocking.
- [x] Automatic Prepare Grimoire Spells pop-up modal upon Shift Rest.

---

## 8. Changelog

| Date | Changes |
|---|---|
| 2026-06-24 | Extracted canonical scope (§1, §3) from raw conversation logs. Initial `CLAUDE.md`. |
| 2026-06-24 | Created `data.js` rules library (Attributes, conditions, 6 kin, 30 skills, 10 professions, 44 heroic abilities, 4 schools of spells, full equipment). **Phase 0 COMPLETE.** |
| 2026-06-24 | Created `data-magic.js` (254 magic entries) and `data-solo.js` (oracle/solo rules). Data extraction DONE. |
| 2026-06-24 | **Phase 1 (Wizard) COMPLETE.** 9-step wizard (roll, kin/prof/age, auto-calc, validation, pre-gen integration). Verified. |
| 2026-06-24 | **Phase 2 (Tracker) COMPLETE.** Live sheet (HP/WP/Conds/Skills/Inv/Abilities/Notes) with persistence and automation. Verified. |
| 2026-06-24 | **Phase 3 (Dice Engine) COMPLETE.** d20 roll-under, boon/bane, crit/fumble, push, damage, spellcasting/mishaps. Verified. |
| 2026-06-24 | **Phase 4 (In-Play) COMPLETE.** Rest, death/dying (official rules), advancement, combat helper/bestiary. Verified. |
| 2026-06-24 | **Phase 4B (Magic Subsystems) COMPLETE.** Summons, crafting, corruption, active effects, Dracomancy gated learning. Verified. |
| 2026-06-24 | **Phase 3B (Book of Magic Wiring) COMPLETE.** Content toggle, revised spells canonical, harmonism bard casting. Verified. |
| 2026-06-25 | **Phase 5 Architecture finalized.** RTDB, anonymous auth, join codes, canvas compression. Verified. |
| 2026-06-25 | **Combat Redesign & Bestiary COMPLETE.** Interactive combat dashboard with Bestiary integration. |
| 2026-06-25 | Updated Phase 4 roadmap item descriptions to match current feature-state and added missing changelog entry. |
| 2026-06-25 | Created `data-npcs.js` (Humanoids, Bosses, Undead, Animals) and added Rothgar Wolfsbane (Robber Knight) to `data-monsters.js`. Wired rulebook d20 NPC attack rolls (`Roller.npcAttack`) into the accordion combat tracker. SW cache v13. |
| 2026-06-25 | **All-in-One Hero Combat Rolling COMPLETE.** Upgraded `Roller.heroWeaponAttack` to combine d20 Attack Rolls (boons/banes/pushing), inline ammo steppers (`combatAmmo`), automatic Dragon Crit (1) double-dice damage buttons, and one-click Mage/Bard known spell quick-casting directly inside accordion combat cards. SW cache v14. |
| 2026-06-25 | **D6 Monster Attack Table Rolling COMPLETE.** Added prominent `🎲 Roll D6 Monster Attack Table` button to Bestiary monster cards in the combat tracker. Maps 1–6 (or evenly distributed 1–2/3–4/5–6 for 3-attack monsters) to canonical attack entries, immediately opening `Roller.monsterAttack` displaying the rolled D6 banner. Numbered manual override buttons `[1]` to `[6]` retained below. SW cache v15. |
| 2026-06-25 | **Massive Compendium Ingestion COMPLETE.** Added 40 new canonical True Monsters (Demon variants, Dragon stages, Giants, Troll sub-types, Amoeba, Basilisk, Centaur, Lindworm, Titan, Tree Kin, etc.) into `data-monsters.js` with D6 attack tables. Added 17 playable kin archetypes (Cat People, Frog People, Hobgoblins, Karkions, Lizard People, Ogres, Satyr Bard) into `data-npcs.js`. SW cache v16. |
| 2026-06-25 | **Frictionless Combat Automation COMPLETE.** Upgraded `Combat.view` to display 1-click primary weapon (`⚔️`) and random monster (`🎲`) attack buttons directly visible on collapsed combat row headers. Added live turn tracking badges (`Acted ✓` / `Turn [ ]`) and a `Reset Turns` button. Wired `Roller.renderDamageApplier` into all damage pop-ups (`heroWeaponAttack`, `monsterAttack`, `npcAttack`) featuring an inline target picker dropdown, auto-deducting target Armor, applying damage directly to HP, and automatically marking 0 HP opponents with dark gray strikethrough and `💀 DEFEATED` badges. SW cache v17. |
| 2026-06-25 | **Combat Tab Hero Weapons Fix COMPLETE.** Fixed missing attack buttons for Player Characters on the Combat tracker by properly resolving equipped weapons from `h.inventory.items` matched against `DB.weapons` rather than checking non-existent `h.inventory.weapons`. SW cache v18. |
| 2026-06-25 | **Hero Combat Attack Roll Bugfix COMPLETE.** Fixed hallucinated `Dice.under`, `toast`, and `c.state.marks` references in `Roller.heroWeaponAttack` that caused "Roll Attack" button clicks to fail silently. Corrected to use canonical `Roller.d20net`, standard `alert`, and character `c.skills[skillName].mark` data model. SW cache v19. |
| 2026-06-25 | **Combat Damage Applier Targets Fix COMPLETE.** Fixed hallucinated `Store.get("combat")` and `Store.set("combat")` references across `Roller.renderDamageApplier`, `heroWeaponAttack`, `monsterAttack`, and `npcAttack` that caused the damage modal to always report "No active opponent targets in combat tracker" and prevented applying combat damage. Replaced with canonical `Combat.load()`, `Combat.save()`, and live `Combat.rerender()`. SW cache v20. |
| 2026-06-25 | **Phase 5B Solo Mode Wiring COMPLETE.** Built dedicated `🧭 Solo` assistant navigation screen featuring interactive Fortune Chart Oracle (1D6/2D6 fate engine with twist highlights), Inspiration 3D20 generator (`Action+Attribute+Thing`), Dragon/Demon narrative twist roller, Solo NPC instantiator with 1-click `Quick Add to Combat Tracker`, and D6 NPC Attack Table AI roller across 4 combat roles. Wired solo heroic abilities into `Wizard` (unlocked via Solo Mode setting), wired *Sole Survivor* into skill/attack/cast roll pushing (−3 WP option to avoid suffering conditions), and wired *Army of One* into `Combat.draw` (drawing 2 unique initiative cards granting two turns). SW cache v21. |
| 2026-06-25 | **Phase 5 (Multiplayer & Sync) COMPLETE.** Implemented `Sync` module in `app.js` with Firebase Realtime Database connection, anonymous/Google authentication, fantasy join codes, optimistic cloud sync interceptors in `Store` and `Combat`, party roster overview banner, canvas portrait downscaling (~400×400), and SW PWA reload toast banner. Created `database.rules.json` and added Firebase CDN scripts to `index.html`. |
| 2026-06-25 | **Phase 6 (Navigation & Rules Neatening) COMPLETE.** Reorganized Rules Library into searchable accordion categories (`<details class="rule-accordion">`) with live text filter. Added comprehensive **Wilderness Journeys & Travel Reference** compendium (Shifts, camp/rest Bushcraft rules, foraging, mishap table) to both Rules and Solo tabs. Added **Core Gameplay Loop & Stages** walkthrough compendium (Rounds vs Shifts time scales, combat stage sequence, D20 pushing). Updated `Router.go` and `Router.init` to dynamically hide the Solo navigation button (`🧭 Solo`) when Solo Mode is disabled in Settings. Verified valid syntax. |
| 2026-06-26 | **Combat Tracker Stacked Mobile Layout COMPLETE.** Re-arranged combatant row headers (`Combat.view`) into a clean two-line stacked flex layout. Top row gives full horizontal width to the Initiative card badge and character name to prevent text squashing on narrow mobile screens. Bottom row aligns Hero/Monster/NPC tags, Quick Attack button (`⚔️`), inline Turn completion badge (`Acted ✓`), and HP vitals. Verified valid JS syntax. |
| 2026-06-26 | **Phase 8 Combat Ergonomics, NPC Spellcasting & Sync Access COMPLETE.** Repositioned combat row Open Sheet (`↗`) and Delete (`✕`) icons beside character names. Wired explicit known spells arrays into canonical caster NPCs (`data-npcs.js`) and implemented `Roller.npcCast` pop-up modal with d20 magic skill checks vs PCs. Made header sync pill (`Local`/`Synced`) clickable and added main Heroes screen prompt banner jumping straight to multiplayer party login panel. Perfected PC spellcasting with variable Power from the Body die buttons (`[D4]..[D20]`), desperate healing restrictions, metal armor/weapon warnings, and grimoire unprepared checkboxes. Verified valid JS syntax. |
| 2026-06-26 | **Firebase Auth & Regional RTDB Configuration COMPLETE.** Upgraded `Sync.ensureAuth`, `createCampaign`, `joinCampaign`, and `linkGoogle` (`app.js`) to report exact Firebase authentication errors (`auth/operation-not-allowed` and `auth/unauthorized-domain`) and added `timeoutRace` guards. Hardcoded exact regional `asia-southeast1.firebasedatabase.app` database URL into `firebase-config.js` to fix connection timeouts. Patched `Combat.save` to broadcast tracker changes to RTDB. Patched silent exceptions in `Roller.skill`, `heroWeaponAttack`, and `heroSpellCast` when characters lack initialized conditions objects. Made **Roll Damage** buttons start disabled and unlock only upon a successful attack roll. Made **Roll Attack / Cast / Skill** buttons disable immediately post-roll. Made Party Roster rows on Heroes page clickable. Fixed blank white Combat tab error when `combatants` array is missing in synced storage. Turned all Rules library Magic Schools and Character Sheet Magic sections into folding accordions. Fixed multiplayer sync bug where clicking +/− on a hero sheet bounced the user back to the main Heroes list (`attachListeners`). Preserved selected dropdown options in Combat tab across re-renders (`window._combatAddSelections`). |
| 2026-06-26 | **Phase 9 Tabletop Automation & GM Guards COMPLETE (1A–5A).** Wired two-way HP/WP synchronization between live Combat Tracker rows and permanent Hero character sheets across Firebase broadcast (`combatRef.on`). Made Bestiary Monster random attack buttons auto-roll damage dice and pop up Target Applier instantly (`Roller.monsterAttack`). Implemented `Combat.isGm` and locked Draw Initiative, Next Turn, Next Round, Reset Turns, End Combat, and Acted badges strictly to Campaign GMs. Added automatic ammunition deduction (`combatAmmo`) and out-of-ammo roll blocking on ranged bow/crossbow attacks (`heroWeaponAttack`), syncing count back to inventory item strings. Added automatic **Prepare Grimoire Spells** pop-up modal upon completing a Shift Rest (`rest("shift")`) and tagged sheet spell list items as `Prepared` vs `Grimoire (Unprepared)`. Verified valid JS syntax. |

---

## 9. Conventions & Rules of Engagement

- **Single source of truth:** all game rules data lives in `data.js` (core), `data-magic.js` (Book of Magic), and `data-solo.js` (solo rules), sourced from the project's NotebookLM notebook. Do not hardcode rules values elsewhere.
- **Sync discipline:** any code change → update §2/§4/§5/§6/§10 as needed, tick the relevant §7 roadmap box, and add a §8 changelog row — in the same edit.
- **Scope guard:** Dragonbane **core rules**, plus **Book of Magic** (gated behind a content toggle) and **Solo mode** (a distinct play mode). No Misty Vale / campaign / setting content in the app. Sources: core rulebook `2ec5709d-…`; Book of Magic `5cc43bfe-…`; solo rules `98cc2537-…` (in the notebook).
- **GitHub-bound:** keep the tree clean and documented; no secrets committed (Firebase keys go in the user-supplied config; real keys must not be committed).

---

## 10. Expansion Content & Toggles (decisions)

Decisions for the Book of Magic and Solo mode additions (2026-06-24):

**Gating**
- **Book of Magic** = a **content toggle** (per character and/or campaign), **off by default**. A core-rules table never sees the extra schools/spells unless enabled.
- **Solo** = a **distinct play mode** (not a content toggle), selected when starting/playing.

**Book of Magic — scope & rules**
- Include **everything**: new spells for the four existing schools *and* all **9 new schools** (Demonology, Harmonism, Illusionism, Necromancy, Symbolism, Witchcraft, Alchemy, Enchanting, Dracomancy), fully statted.
- **Revised spells are canonical everywhere** — the Book of Magic versions of Dispel, Magic Seal, Permanence, Protector, Resurrection, Sleep replace the core versions regardless of toggle.
- **Creation wizard (toggle on):** a mage may start with **any school except Dracomancy** (learn-in-play only); show entry requirements/notes. **Bard is a caster** via **Harmonism**, cast using **Performance (CHA)**; only bards can take Harmonism.
- **Subsystems = full** (Q6/C): model each new school's mechanics richly — created items/potions in inventory, minion/summon rosters, corruption/insanity tracking, familiars, persistent runes, active illusions, Dracomancy's in-play-only learning.

**Solo mode**
- **Full solo GM assistant** (Q7/C): oracle + random tables + journal/threads/NPCs + guided "explore the next room" loop.
- Modeled as a **1-person campaign** (Q8/B) — reuses campaign machinery, party UI hidden; can later become multiplayer / GM-peek.
- **Official Dragonbane solo rules only** (Q10/A) for the oracle, likelihoods, and tables.
- Solo-only heroic abilities (**Army of One**, **Sole Survivor**) are **selectable only in Solo campaigns** (Q11/A).

**Roadmap placement (interleaved by dependency, Q9/C):** Book of Magic spells/schools → **Phase 3B** (after casting); Book of Magic subsystems → **Phase 4B** (after tracker + in-play); Solo → **Phase 5B** (after sync). Data extraction for both is being front-loaded now (Q12/C).

---

## 11. Multiplayer & Sync Architecture (decisions)

Decisions for Phase 5 (Multiplayer & Sync) and Phase 5B (Solo Mode) architecture (2026-06-25):

**Database & Auth**
- **Firebase Realtime Database (RTDB):** Selected over Firestore. *Why:* RTDB charges for bandwidth rather than document read/writes. An RPG app produces hundreds of rapid, tiny updates (toggling conditions, spending 1 WP, HP damage). RTDB is drastically cheaper for this and natively supports ultra-low latency presence (online/offline indicators).
- **Zero-Friction Auth:** App launches instantly into Local/Anonymous mode. No login wall. *Why:* At the gaming table, players want immediate access to dice and sheets. Optional Google account linking is placed inside **Settings & About** for cross-device backup.
- **Readable Join Codes:** Uses memorable fantasy dictionary phrases (e.g., `red-dragon-sword`) instead of random alphanumeric strings. *Why:* Eliminates typos and is easy for GMs to say out loud across the table.

**Permissions & Roles**
- **GM-Ready Security Rules:** The schema (`members/{uid}.role: "player" | "gm"`) and backend security rules are written immediately in Phase 5 to grant GMs full read/write access. *Why:* Writing database migration scripts later for live Firebase data is error-prone. Laying the rule foundation now means building the GM screen later requires zero backend changes.
- **Flexible Combat Tracker:** Any connected player can draw initiative cards (1–10) or click "Next Turn" by default. *Why:* Keeps casual table gameplay fast when the GM is busy roleplaying or looking up rules. Includes a *"Lock Controls to GM"* toggle in campaign settings for strict GMs.

**Performance & Offline**
- **Client-Side Image Compression:** Portrait uploads are downscaled via HTML5 `<canvas>` to ~400x400 WebP/JPEG (~30KB–50KB) *before* uploading to Firebase Storage. *Why:* Guarantees instant syncing when 4–6 players open the party view on mobile cell networks, and preserves Firebase free-tier storage limits.
- **Hybrid Storage Modes:** Preserves `localStorage` standalone mode alongside Firebase. *Why:* Allows anyone to clone the repo and use the app offline without configuring Firebase API keys.
- **PWA Version Consistency:** Implements an *"Update Available: Click to Reload"* toast when the Service Worker fetches new code. *Why:* Ensures every player at the table runs identical calculation logic and rules, preventing desync bugs.

**Solo Mode Integration (Phase 5B)**
- **Isolated First, Co-op Ready:** Built strictly as a 1-player experience first to nail Oracle and Inspiration mechanics cleanly. Because it sits on top of the Phase 5 campaign machinery under the hood, the foundation for *"GM-less Co-op"* is automatically preserved by simply hiding party UI elements.
