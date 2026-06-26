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

### 2.9 Planned — Rules-Accuracy Completion (see §7B roadmap)
> These features are **specified but not yet built**. Full implementation specs (rule,
> target file/function, behavior, schema, acceptance) live in **§7B**, ordered by
> rules-impact. Summary by theme:
- **Combat roll accuracy:** STR-requirement bane, two-handed grip (−3 STR req), heavy-armor/helmet skill banes, working metal-magic restriction, *Lightning Fast* / *Veteran* initiative, turn swap/wait.
- **Conditions:** condition-overflow penalty (all six held → lose D6 WP, or D6 HP if WP 0).
- **Inventory (full slot-system rebuild):** ½STR slot limit, equipped exemptions (armor/helmet/3 weapons-at-hand), coin-weight slots, ration/ammo grouping, over-encumbered STR-roll prompt, weapon/shield durability.
- **Advancement & identity:** Overcome Weakness (2 marks + cooldown), end-of-session 5-question questionnaire, teacher training (+1 cap), heroic-ability requirement locking + free ability at skill 18.
- **Vitals & magic:** *Robust*/*Focused* auto-adjust max HP/WP, familiar WP splitting.
- **Movement & reactions:** prone/stand, door half-move, leaping (Acrobatics), parry/dodge reaction (flips card, +2m on dodge).
- **Solo completion:** +5 mission marks, extra free heroic ability at creation, fail-forward.
- **Advanced GM automation (one optional toggle):** global time clock, round-rest once-per-shift, light-source burn-out, sleep deprivation, cold & disease, fear attacks/table, concentration interruption.
- **Bug fixes:** dead `DB.solo` references, missing `Store.clear()`, dead metal-magic check, hero-armor-always-0.

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
| `index.html` | App shell / markup | 🟨 shell done (header, nav, screen mount, script loads); wizard/tracker markup added in later phases |
| `app.js` | Application logic (wizard, tracker, dice, sync) | ✅ ALL PHASES COMPLETE (Phases 1–6, 3B, 4B, 5, 5B): wizard, sheet, roller, combat tracker, solo assistant, cloud sync, accordions/compendiums. |
| `styles.css` | Theming (Dragonbane look + light/dark) | ✅ Dragonbane theme (light + dark) + wizard/sheet styles (chips, attr grid, forms, steps) — verified in browser |
| `data.js` | Dragonbane rules library (kin, professions, skills, abilities, spells, equipment) | ✅ COMPLETE — kin, conditions, derived tables, ages, 30 skills + 3 magic schools, 10 professions (+ full gear tables), 44 heroic abilities, all spells (4 schools), weapons/shields/armor/helmets, general gear, instruments, currency |
| `data-magic.js` | Book of Magic library (revised spells, new spells for existing schools, 9 new schools) | ✅ DATA COMPLETE — 6 revised spells + 39 new spells for existing schools (+familiar table) + all 9 new schools (Demonology, Harmonism, Illusionism, Necromancy, Symbolism, Witchcraft, Alchemy, Enchanting, Dracomancy); **254 magic entries total**, validated via node. NOT yet wired into `index.html` or the wizard (Phase 3B feature work remains) |
| `data-solo.js` | Solo rules: oracle, likelihoods, random tables, solo heroic abilities | ✅ COMPLETE & WIRED — Fortune Chart oracle, Inspiration Table (3D20), Dragon/Demon twists, Solo NPC generator + quick combat add, D6 NPC Attack Table AI roller, and Solo Heroic Abilities (*Army of One, Sole Survivor*) wired into wizard and initiative. |
| `data-monsters.js` | Dragonbane Bestiary library (12 true monsters + Rothgar Wolfsbane Robber Knight) | ✅ COMPLETE & WIRED — Demon, Dragon, Ghost, Giant, Giant Spider, Griffon, Harpy, Manticore, Minotaur, Troll, Wight, Vampiric Bats Swarm, Robber Knight. Auto-hit attacks roll damage via `Roller.monsterAttack`. |
| `data-npcs.js` | Dragonbane Humanoid NPCs, Bosses, Undead & Animals library | ✅ COMPLETE & WIRED — Guard, Cultist, Thief, Villager, Hunter, Bandit, Adventurer, Scholar, Bosses (Bandit Chief, Knight Champion, Archmage), Goblins (Scout, Warrior, Chief), Orcs (Warrior, Shaman, Chieftain, Grunta & Merle), Skeletons (Warrior, Archer, Champion), 11 common animals. Rolls d20 attacks via `Roller.npcAttack`. |
| `data-pregens.js` | The 5 Dragonbane Core Set pre-generated characters | ✅ done & wired — Aodhan, Orla, Makander, Krisanna, Bastonn (attributes, trained skills, abilities, spells, gear, flavor). "Use a pre-gen" on the Heroes screen instantiates one (derives stats/skills) — verified in browser |
| `manifest.json` | PWA manifest (installable) | ✅ done |
| `service-worker.js` | Offline caching | ✅ done — **network-first** for same-origin (always picks up fresh code online; cache fallback offline), caches `data-magic.js`/`data-solo.js` too. (Changed from cache-first, which served stale code.) |
| `firebase-config.js` | Placeholder Firebase config (user fills in keys) | ✅ done — placeholder + `FIREBASE_ENABLED` flag; app runs in local mode until filled |
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
  state:      { hp, wp, conditions{...}, deathRolls{...}, wpPenalty, rallied,
                moveSpent, isDashing, isMounted, combatAmmo }
  skills:     { <skillName>: { level, trained, mark } }
  abilities:  [ ... ]   // heroic + innate kin abilities
  spells:     { tricks[], known[], castSkill?, castSchool? }
  inventory:  { items[], tiny[], mementos[], money:{ gold, silver, copper } }
  companions: [ { id, name, hp, hpMax, notes } ]   // summons/familiars/companions
  effects:    [ { id, name, concentration, notes } ]
  notes:      string
  advancementLog: [ ... ]
```

### 6.1 Planned schema additions (§7B Rules-Accuracy roadmap)

These fields are introduced by the planned phases in §7B. Defaults shown; all are
optional and back-filled by `normalizeInventory`-style migration when absent.

```
state.weaknessCooldown : boolean = false        // Phase 14 Overcome Weakness
state.teacherTrained   : { [skill]: true } = {}  // Phase 14 Teacher training
state.familiar         : { name, wp, wpMax } | null = null   // Phase 15
state.prone            : boolean = false          // Phase 16 change position
state.time             : { round:0, stretch:0, shift:0 }     // Phase 18 clock
state.roundRestUsed    : boolean = false          // Phase 18 once-per-shift
state.awakeShifts      : number = 0               // Phase 18 sleep deprivation
state.afflictions      : { cold:false, disease:null } // Phase 18 cold/disease
inventory.items[].equipped   : boolean = false    // Phase 13 — DONE. Implemented as a
                                                  // per-item flag (not a separate equipped{} object):
                                                  // 1 armor + 1 helmet + ≤3 weapons are slot-exempt.
inventory.items[].durability : number             // Phase 13 durability — DONE
inventory.items[].qty        : number = 1         // Phase 13 stackables (rations/ammo)
inventory.items[].lit        : boolean            // Phase 18 light sources
combatant.prevInit     : number | null = null     // Phase 11 Veteran retention
settings.gmAutomation  : boolean = false          // Phase 18 shared toggle

// New data-library tables (single source of truth — never hardcode in app.js):
data.js: armor[].banes[], helmets[].banes[], armor/weapons[].metal,
         gear[].lightDie, advancementQuestions[], fearTable[]
data-solo.js: failForward[]
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

### Phase 5 — Multiplayer & Sync
- [x] Firebase Realtime Database (RTDB) setup & schema initialization.
- [x] Security Rules: enforce player read/write own sheet + shared combat state; GM read/write all sheets.
- [x] Instant Local/Anonymous auth flow + "Link Google Account" button in Settings.
- [x] Party overview dashboard & live sheet sync.
- [x] Shared combat tracker sync (`dragonbane.combat` RTDB node).
- [x] Portrait image upload (client-side canvas compression) & PWA reload toast.

### Phase 5B — Solo Mode Wiring *(depends on Phase 5)*
- [x] Fortune Chart oracle widget (6 columns, 3 likelihoods).
- [x] Inspiration Table widget (D20×3 prompt generator).
- [x] Solo NPC templates (Minion/Boss generator) & NPC Attack Table widget (4 roles).
- [x] Solo Heroic Abilities (Army of One, Sole Survivor) wiring into wizard/sheet.

---

## 7B. Rules-Accuracy Completion Roadmap (planned)

> These themed phases close the gap between the current app and a fully
> rules-accurate *Dragonbane* player tracker (see the feature audit, 2026-06-26).
> **Ordering is by rules-impact** (highest-accuracy wins first); each phase has a
> **Priority** label. **None are started yet** (`- [ ]`).
>
> **How to read each item (full implementation spec):** every feature lists
> **Rule** (the canonical Dragonbane mechanic + exact numbers), **Target** (the
> file · module · function to edit), **Behavior/UI** (what to build and where it
> appears), **Schema** (new data fields: name · type · default · location), and
> **Acceptance** (how to confirm it works in the browser). Implement one item at
> a time, tick its box, update §6 if you add schema fields, and add a §8
> changelog row — in the same change (per §9 sync discipline). Bump
> `CACHE_VERSION` in `service-worker.js` whenever cached files change.
>
> **Single source of truth:** all rules numbers belong in `data.js` /
> `data-magic.js` / `data-solo.js`. Do not hardcode rules values in `app.js` —
> read them from the data libraries (add a table there if one is missing).

### Phase 10 — Bug Fixes (Priority: CRITICAL — these are broken behaviors)
- [x] **Fix dead `DB.solo` references (solo NPC attack table never shows in combat).** ✅ Repointed `Roller.rollNpcAttackTable` and the `Combat.view` NPC-card gate to `DRAGONBANE_SOLO.npcAttackTable`; combat button now gated by `Settings.soloMode()`.
  - Rule: N/A (code bug). The solo NPC Attack Table lives in `DRAGONBANE_SOLO.npcAttackTable`, not `DRAGONBANE.solo`.
  - Target: `app.js` · `Roller.rollNpcAttackTable` (~line 1482) and `Combat.view` (~line 2626). Both guard on `DB.solo && DB.solo.npcAttacks`, which is always `undefined`.
  - Behavior/UI: Replace the guard/data source with `DRAGONBANE_SOLO.npcAttackTable` (and its `.rows` / `.roles`). The "🎲 Roll NPC Attack Table (AI Action)" button on NPC combat cards must render and roll correctly. Only show it when Solo Mode is enabled (`Settings.soloMode()`), to match the Solo-tab gating.
  - Schema: none.
  - Acceptance: With Solo Mode on, add a custom NPC in Combat, open its card → the AI-action button appears and rolling a role returns a row from `data-solo.js`.
- [x] **Add missing `Store.clear()` (the "Clear all storage" button throws).** ✅ Added `Store.clear()` (removes characters + combat keys, resets `activeCharacterId`; keeps theme/settings/campaign).
  - Rule: N/A (code bug).
  - Target: `app.js` · `Store` object (~line 22). `Screens.about` (~line 3108) calls `Store.clear()` which does not exist.
  - Behavior/UI: Implement `clear()` to remove the characters key, combat key, campaign key, and settings as appropriate (at minimum `localStorage.removeItem(this.KEY)` + `localStorage.removeItem("dragonbane.combat")`), then let the existing `Router.go("home")` run. Do not wipe theme unless intended.
  - Schema: none.
  - Acceptance: Settings → "Clear all storage" → confirm → heroes list empties with no console error.
- [x] **Make the metal-armor / metal-weapon spell restriction actually fire.** ✅ `Roller.cast` now detects metal via `equippedArmor`/`equippedHelmet` `.metal` flags (data-driven) plus a data-driven `DB.weapons[].metal` flag; the metal warning fires for real.
  - Rule: A mage casting while wearing metal armor or wielding a metal weapon is penalized/blocked (see §6.Phase-11 metal rule). Reuse the same equip data introduced in Phase 13.
  - Target: `app.js` · `Roller.cast` (~line 1570). The current check reads `c.gear?.armor?.name` (no such field) and `item.equipped` (never set), so it never triggers.
  - Behavior/UI: Detect metal via the equipped-armor slot and equipped weapons added in Phase 13 (`c.inventory.equipped`), matching armor names against `DB.armor` `metal:true` flags and weapon names against a `metal` feature. Until Phase 13 lands, gate this fix behind that dependency (do not ship a half-check).
  - Schema: depends on Phase 13 equip slots; add `metal: true|false` to relevant `DB.armor` / `DB.weapons` entries in `data.js`.
  - Acceptance: Equip chainmail (or a sword) → opening a spell cast shows the metal warning; equip leather/no weapon → no warning.
- [x] **Fix hero combatant armor always 0 in the damage applier.** ✅ `Combat.view` hero-add now reads `equippedArmor(h).rating` so the damage applier auto-subtracts a hero's worn armor (verified: Plate → Armor 6 on the card).
  - Rule: A defender's armor rating subtracts from incoming damage.
  - Target: `app.js` · `Combat.view` hero-add (~line 2350): `armor: (h.gear && h.gear.armor ? h.gear.armor.rating : 0)` — heroes have no `gear.armor`.
  - Behavior/UI: Resolve the hero's equipped armor (Phase 13 equip slot, or by matching inventory items to `DB.armor`) and store its rating on the combatant so `Roller.renderDamageApplier` auto-subtracts it. Until Phase 13, derive from the equipped-armor item name → `DB.armor` rating.
  - Schema: reads Phase 13 `inventory.equipped.armor`.
  - Acceptance: Add a hero wearing leather (rating 1) to Combat → applying 5 damage with "Ignore Armor" off removes 4 HP.

### Phase 11 — Combat Roll Accuracy (Priority: HIGH)
- [x] **STR-requirement bane on attacks.** ✅ `Roller.heroWeaponAttack` applies a −1 bane (at roll time, stacking with conditions) when `c.attributes.STR < weapon.str` for melee weapons, with a live explanatory note.
  - Rule: If the wielder's STR is below a weapon's STR requirement, attack rolls with it get a bane.
  - Target: `app.js` · `Roller.heroWeaponAttack` (~line 1208). Weapons carry `str` in `DB.weapons`.
  - Behavior/UI: When `c.attributes.STR < weapon.str`, start the attack with net −1 (bane) and show a labeled note ("STR ${STR} < requirement ${weapon.str} → bane"). Stack with the existing condition bane.
  - Schema: none (uses `DB.weapons[].str`).
  - Acceptance: A STR 8 hero attacking with a Longsword (STR 13) opens the attack roll already at Bane ×1 with the explanatory note.
- [x] **Two-handed grip reduces STR requirement by 3.** ✅ For 1H melee weapons, a "Two-handed grip" checkbox in the attack modal compares STR against `weapon.str − 3` for the bane calc above.
  - Rule: Wielding a one-handed melee weapon in two hands lowers its STR requirement by 3 (cannot also use a shield/off-hand).
  - Target: `app.js` · `Roller.heroWeaponAttack`. Use `weapon.grip` from `DB.weapons`.
  - Behavior/UI: For `grip === "1H"` melee weapons, show a "Two-handed grip (−3 STR req)" checkbox in the attack modal; when checked, compare STR against `weapon.str - 3` for the bane calc above.
  - Schema: none.
  - Acceptance: STR 7 hero + Broadsword (STR 10): unchecked → bane; "Two-handed grip" checked → no STR bane (10−3=7).
- [x] **Heavy-armor / helmet skill banes.** ✅ Added structured `banes[]`/`metal`/`rangedBane` to `DB.armor`/`DB.helmets`; `Roller.skill` banes worn-armor skills (Plate → Acrobatics/Evade/Sneaking, etc.) and `heroWeaponAttack` banes ranged attacks under a Great Helm.
  - Rule: Equipped armor imposes banes — Studded Leather → Sneaking; Chainmail → Evade & Sneaking; Plate → Acrobatics, Evade & Sneaking. Open Helmet → Awareness; Great Helm → Awareness & all ranged attacks. (Text already in `DB.armor[].effect` / `DB.helmets[].effect`.)
  - Target: `data.js` (add structured `banes: ["Sneaking", ...]` arrays to each armor/helmet entry); `app.js` · `Roller.skill` and `Roller.heroWeaponAttack` apply them.
  - Behavior/UI: When the relevant skill (or a ranged attack) is rolled and the matching armor/helmet is equipped (Phase 13 equip slot), start at bane −1 with a note. Great Helm's "all ranged attacks" applies in `heroWeaponAttack` when `isRanged`.
  - Schema: add `banes: string[]` to `DB.armor` and `DB.helmets`; reads `inventory.equipped` (Phase 13).
  - Acceptance: Hero in Plate rolling Evade opens at Bane ×1; in leather, no bane.
- [x] **Initiative: Lightning Fast & Veteran.** ✅ `Combat.draw` retains `prevInit` for *Veteran* (keeps last round's card) and draws two cards keeping the lower for *Lightning Fast*; *Army of One* secondary still gets its own fresh card.
  - Rule: *Lightning Fast* — when drawing initiative, draw two cards and keep one (once per round). *Veteran* — at round start, keep your previous round's card instead of drawing.
  - Target: `app.js` · `Combat.draw` (~line 2307). Currently only *Army of One* is handled.
  - Behavior/UI: In `draw`, for each hero combatant, look up `Store.get(charId).abilities`. *Veteran*: if the combatant has a stored `init` from last round and the ability, keep it (skip a new card). *Lightning Fast*: deal two cards and keep the lower (better) one, marking it used for the round. Document interaction order (Veteran resolves before dealing new cards).
  - Schema: combatant gains `prevInit: number|null` (default null) so Veteran can retain across rounds.
  - Acceptance: Add a Veteran hero, draw, Next Round → same card retained. Add a Lightning Fast hero → two cards considered, best kept (observe via repeated draws trending low).
- [x] **Turn swap / wait.** ✅ `Combat.swapInit` + a `⇅` row button let the GM exchange initiative cards between any two combatants (re-sorts the order, clears their done flags).
  - Rule: A combatant may voluntarily act later, swapping turn order with a willing other combatant (initiative-card swap).
  - Target: `app.js` · `Combat.view` combatant row actions; `Combat.mutate`.
  - Behavior/UI: Add a "Wait / Swap" control on a combatant row that lets the GM pick another combatant to swap `init` values with (re-sorts the order). GM-guarded via `Combat.guardGm`.
  - Schema: none.
  - Acceptance: Two combatants; swap → their initiative numbers and ordering exchange.

### Phase 12 — Conditions & Status Accuracy (Priority: HIGH)
- [x] **Condition overflow (all six held).** ✅ Added `Roller.applyConditionOverflow` (−D6 WP, or −D6 HP if WP 0) and wired it into the push flows of `Roller.skill`, `Roller.heroWeaponAttack`, and `Roller.cast`: pushing is now always allowed on a failed non-demon roll, and when all six conditions are held it applies the D6 penalty instead of a new condition. Also fixed a latent bug where `heroWeaponAttack`'s push chips were appended via `outerHTML` (dropping their click handlers) — now appended as live DOM nodes.
  - Rule: You cannot hold the same condition twice. If you already have all six conditions and would gain another, instead lose D6 WP (or D6 HP if WP is already 0).
  - Target: `app.js` · the push flows in `Roller.skill`, `Roller.heroWeaponAttack`, `Roller.cast`; and the Conditions toggles in `Sheet.render` (~line 2060).
  - Behavior/UI: When a push/effect would add a condition but all six are set, skip the picker and instead roll D6: if `wp > 0` subtract from WP, else subtract from HP; show the result ("All conditions held → −${n} WP"). Pushing remains allowed in this state (it currently blocks once all six are held — change to apply the D6 penalty instead).
  - Schema: none.
  - Acceptance: Set all six conditions, push a failed roll → no picker, D6 WP deducted; with WP 0, D6 HP deducted instead.

### Phase 13 — Encumbrance & Inventory Rebuild (Priority: HIGH)
> **Full rules-accurate rebuild** of the inventory/encumbrance model (replaces the current "sum of item weights vs ½STR" approach).
- [x] **Slot-based encumbrance core.** ✅ `encUsed` rewritten as a slot model (limit = ⌈STR/2⌉, ceil(weight) per item, equipped/tiny excluded); the slot-count line now renders (fixed a latent `el()` two-node-template drop).
  - Rule: Carrying capacity = STR ÷ 2, rounded up. Each normal item = 1 slot; items of Weight 2/3/… consume that many slots. Tiny items (Weight 0) are unlimited and tracked separately.
  - Target: `app.js` · new `encUsed`/`encLimit` logic (~line 1723) + `Sheet.render` inventory panel. `data.js` weights already present.
  - Behavior/UI: Compute used slots = Σ ceil(weight) over carried (non-equipped, non-tiny) items + coin slots + grouped ration/ammo slots (below). Keep the encumbrance bar; show "X / limit slots".
  - Schema: none beyond existing `inventory.items[].weight`.
  - Acceptance: STR 11 → limit 6; three Weight-1 items + one Weight-2 item = 5 slots.
- [x] **Equipped exemptions: armor, helmet, 3 weapons-at-hand.** ✅ Items carry `equipped` + an Equip/Unequip control; an "Equipped (no encumbrance)" section excludes them from slots; caps enforced (1 armor, 1 helmet, ≤3 weapons). `equippedArmor`/`equippedHelmet` derive worn gear.
  - Rule: Worn armor, worn helmet, and up to three "weapons at hand" (shields count) do not consume inventory slots.
  - Target: `app.js` · `Sheet.render` inventory; new equip UI.
  - Behavior/UI: Add equip controls — an Armor slot, a Helmet slot, and up to 3 Weapon/Shield slots. Equipped items render in their own "Equipped (no encumbrance)" section and are excluded from slot totals. Enforce the 3-weapon cap. Equipped armor/helmet/weapons feed Phase 11 banes & metal check and Phase 10 hero-armor.
  - Schema: `inventory.equipped: { armor: itemRef|null, helmet: itemRef|null, weapons: itemRef[] (max 3) }` (default `{armor:null, helmet:null, weapons:[]}`). Store either the item object or an index/id into `inventory.items`.
  - Acceptance: Equip leather + helmet + 2 weapons → none count toward slots; a 4th weapon-at-hand is rejected.
- [x] **Coin-weight slots.** ✅ `encUsed` adds 1 slot per 100 total coins (`DB.currency.coinsPerItem`); shown in the slot line.
  - Rule: <100 coins = 0 slots; 100–199 = 1 slot; 200–299 = 2; etc. (per 100 total coins). Uses `DB.currency.coinsPerItem = 100`.
  - Target: `app.js` · encumbrance calc + money panel in `Sheet.render`.
  - Behavior/UI: Sum gold+silver+copper counts, slots = floor(total / 100), add to used slots; show "(coins: N → M slots)".
  - Schema: none.
  - Acceptance: 150 total coins → +1 slot; 240 → +2 slots.
- [x] **Ration & ammunition grouping.** ✅ Rations group 4-per-slot, quivers = 1 slot regardless of arrows, slingstones = 0 (name-based in `encUsed`, qty parsed from "(×N)").
  - Rule: Every 4 food rations = 1 slot. A quiver of arrows = 1 slot regardless of arrows remaining. Slingstones = 0 slots.
  - Target: `app.js` · encumbrance calc; recognize items by name/category (`data.js` gear `category`).
  - Behavior/UI: When counting slots, group field rations in stacks of 4 (ceil(count/4)), force quiver items to 1 slot, force slingstones to 0. Tie into the ammo counter used by `heroWeaponAttack`.
  - Schema: optional `inventory.items[].qty` for stackables (default 1); else parse the existing "(×N)" suffix.
  - Acceptance: 8 rations = 2 slots; a quiver with 12 arrows = 1 slot; slingstones = 0.
- [x] **Over-encumbered → STR roll prompt.** ✅ When over the limit, a "⚖ Roll STR to move" button opens a d20-≤-STR check on the sheet.
  - Rule: While over the limit, you must succeed a STR roll to move in combat or travel a shift (failure = you don't move / progress).
  - Target: `app.js` · `Sheet.render` (movement panel) + `Combat.view`.
  - Behavior/UI: When `used > limit`, the move panel and combat row show an "Over-encumbered — roll STR to move" button that opens `Roller.skill`-style STR check; surface the result. Keep the existing red warning.
  - Schema: none.
  - Acceptance: Exceed the limit → STR-roll prompt appears on the sheet and the combat row.
- [x] **Weapon & shield durability tracking.** ✅ Equipped weapons/shields with a `DB.weapons.durability` show a current/max stepper; 0 → 💥 broken. Stored as `inventory.items[].durability`.
  - Rule: Weapons/shields have a durability rating (`DB.weapons[].durability`); parrying heavy blows or using fragile gear ticks it down; at 0 the item breaks.
  - Target: `app.js` · inventory rows + parry actions; `data.js` durability already present.
  - Behavior/UI: Show a durability counter (current/max) on equipped weapons/shields with −/+ steppers and a "broken" state at 0 (disables attack/parry until repaired). Optionally auto-prompt on parry actions.
  - Schema: `inventory.items[].durability: number` (default = `DB.weapons` value when equipped/first used).
  - Acceptance: Tick a shield's durability to 0 → marked broken; cannot parry until repaired.

### Phase 14 — Advancement & Identity (Priority: MEDIUM)
- [x] **Overcome Weakness flow.** ✅ `Sheet.overcomeWeakness` — an "⚡ Overcome Weakness" button awards 2 marks (pick 2 unmarked skills), clears the weakness, sets `state.weaknessCooldown`; a new weakness can be set only after the cooldown clears at session end.
  - Rule: Acting against your Weakness can let you overcome it — award 2 advancement marks (instead of 1), delete the weakness, and a 1-session cooldown before a new weakness may be chosen.
  - Target: `app.js` · `Sheet.render` Character/flavor panel.
  - Behavior/UI: Add an "Overcome Weakness" button by the Weakness field. On click: grant 2 marks (apply to chosen unmarked skills, reuse the advancement-marking UI), clear `identity.weakness`, set a cooldown flag. While on cooldown, show "New weakness available next session" and block setting a new one; clear the flag in `endSession`.
  - Schema: `state.weaknessCooldown: boolean` (default false); reuses skill `mark`.
  - Acceptance: Click Overcome → 2 marks awarded, weakness cleared, cooldown shown; after End Session, a new weakness can be entered.
- [x] **End-of-session questionnaire (5 questions).** ✅ `Sheet.endSession` now shows the 5 `DB.advancementQuestions`; each Yes lets you mark one unmarked skill, then `rollAdvancement` rolls all marks. Skills reaching 18 prompt a free heroic ability.
  - Rule: At session end, answer the five advancement questions; each "yes" lets you place one advancement mark on an unmarked skill of your choice (in addition to marks earned from Dragons/Demons).
  - Target: `app.js` · `Sheet.endSession` (~line 1889) — currently only rolls existing marks.
  - Behavior/UI: Before the advancement roll, show a modal listing the five canonical questions (store the text in `data.js`, e.g. `DB.advancementQuestions`). For each "yes", let the player tick one unmarked skill to mark. Then proceed to the existing per-mark D20 advancement roll.
  - Schema: add `advancementQuestions: string[]` to `data.js` (the 5 official questions).
  - Acceptance: End Session → questionnaire appears; answering 3 "yes" lets you mark 3 skills, which then roll for advancement.
- [x] **Teacher training.** ✅ `Sheet.trainTeacher` — pick a skill, one advancement D20, capped via `state.teacherTrained[skill]` (a skill can be teacher-trained once).
  - Rule: Spend a shift training a skill with an NPC teacher (skill 15+) to get one immediate advancement roll for that skill; a given teacher can only raise you by +1.
  - Target: `app.js` · `Sheet` (new action near skills/advancement).
  - Behavior/UI: A "Train with teacher" control: pick a skill, confirm teacher skill ≥15, roll one advancement D20 (improve if > level, max 18). Track that you've benefited from this teacher for this skill (+1 cap).
  - Schema: `state.teacherTrained: { [skillName]: true }` (default {}).
  - Acceptance: Train a skill → one advancement roll occurs; repeating with the same teacher/skill is blocked.
- [x] **Heroic-ability requirement locking + skill-18 free ability.** ✅ `heroicReqMet` parses the rulebook req phrasings; `Sheet.gainHeroicAbility` locks unmet abilities (verified: 22/43 locked). Skill-18 advancement (session or teacher) prompts the free-ability picker.
  - Rule: A heroic ability can't be taken unless its skill requirement is met (e.g. Catlike needs Acrobatics 12). When a skill first reaches 18, the character immediately gains a new heroic ability for free.
  - Target: `app.js` · `Sheet.learnMagic`/a new "Gain heroic ability" picker; advancement in `endSession`/`deathRoll`/training where levels change.
  - Behavior/UI: Add a heroic-ability picker (sheet) that lists `DB.heroicAbilities` and **disables** those whose `req` isn't met by current skills. When any skill advances to 18, prompt "Choose a free heroic ability" using the same picker (requirement still enforced unless rules say otherwise — keep the requirement check).
  - Schema: none (uses `abilities[]`).
  - Acceptance: With Acrobatics 11, Catlike is locked; raise to 12 → selectable; advancing a skill to 18 pops the free-ability picker.

### Phase 15 — Vitals & Magic Extras (Priority: MEDIUM)
- [x] **Robust / Focused auto-adjust max HP/WP.** ✅ `effHpMax`/`effWpMax` now add +2 per Robust/Focused in `abilities[]` (via `abilityCount`), used at the HP/WP steppers, rests, and combat add. Verified: Focused 18→20 WP, Robust 11→13 HP.
  - Rule: *Robust* permanently raises max HP by 2 per pick; *Focused* raises max WP by 2 per pick (both stackable).
  - Target: `app.js` · derived-stat usage; wherever `derived.hpMax`/`wpMax` are read (`effWpMax`, sheet, combat).
  - Behavior/UI: Compute effective max HP = `attributes.CON + 2×(count of Robust in abilities)`; effective max WP = `attributes.WIL + 2×(Focused count) − wpPenalty`. Use everywhere HP/WP max is shown/clamped. Acquiring/removing the ability updates the max live.
  - Schema: none (derive from `abilities[]`); optionally cache in `derived` on change.
  - Acceptance: Add Robust → max HP +2 and the HP stepper allows the new max; add two Focused → max WP +4.
- [x] **Familiar WP splitting.** ✅ A caster-only Familiar panel (`state.familiar`) binds a familiar with cap ⌊maxWP/2⌋ and transfers WP between two independent pools; releasing returns its WP to the mage.
  - Rule: A mage may assign up to half their max WP to a familiar; the familiar's pool and the mage's pool are tracked separately.
  - Target: `app.js` · `Sheet.render` (Summons/Companions or a dedicated Familiar panel).
  - Behavior/UI: A "Familiar" control to allocate WP (0…⌊maxWP/2⌋) from the mage to the familiar; show two pools with independent steppers; enforce the cap; returning WP adds back to the mage (never exceeding mage max).
  - Schema: `state.familiar: { name: string, wp: number, wpMax: number } | null` (default null).
  - Acceptance: Mage with max WP 10 can move up to 5 WP into the familiar; pools update independently and respect the cap.

### Phase 16 — Movement & Reactions (Priority: MEDIUM)
- [x] **Change position (prone / stand).** ✅ A 🧍/🛌 free-action toggle in the movement panel sets `state.prone` (no movement cost).
  - Rule: Dropping prone or standing up is a free action (affects being targeted/attacking).
  - Target: `app.js` · `Sheet.render` movement panel and/or `Combat.view` row.
  - Behavior/UI: A "Prone/Stand" toggle (free action, no movement cost) showing current posture.
  - Schema: `state.prone: boolean` (default false).
  - Acceptance: Toggle prone on/off; state persists and shows on the sheet/combat row.
- [x] **Door interaction (dock half movement).** ✅ A "🚪 Door (−½)" button spends ⌈pool/2⌉ of the movement pool (verified 14→7).
  - Rule: Passing through a closed door costs half your movement for the turn.
  - Target: `app.js` · movement panel (`moveBtns`).
  - Behavior/UI: Add a "Through door (−½ pool)" button that subtracts half of `calcMaxMove()` from the remaining pool (distinct from the generic +4m difficult-terrain button).
  - Schema: none (uses `state.moveSpent`).
  - Acceptance: With pool 10, pressing the door button spends 5m.
- [x] **Leaping (Acrobatics if > ¼ move).** ✅ A "🤸 Leap" button prompts for distance; > movement/4 opens an Acrobatics `Roller.skill` check, otherwise auto-success with the threshold shown.
  - Rule: Leaping a gap longer than ¼ of your movement rate requires an Acrobatics roll.
  - Target: `app.js` · movement panel.
  - Behavior/UI: A "Leap" control: enter distance; if distance > movement/4, open an Acrobatics `Roller.skill` check; else auto-succeed. Show the threshold.
  - Schema: none.
  - Acceptance: Movement 10, leap 3m → Acrobatics prompt (threshold 2.5m); leap 2m → auto-success.
- [x] **Parry / Dodge reaction.** ✅ `Combat.reaction` adds 🛡 Parry (weapon/shield skill) and 🤸 Dodge (Evade) buttons on hero combat cards that roll the skill and consume the turn (acted+done = card flip); a successful dodge offers a +2 m free move.
  - Rule: Parrying or dodging is a reaction that consumes your upcoming action (flips your initiative card). A successful dodge grants a free 2m move. You can't parry and dodge the same attack.
  - Target: `app.js` · `Combat.view` row actions and/or `Sheet`.
  - Behavior/UI: "Parry" (weapon/shield skill roll) and "Dodge" (Evade roll) buttons that mark the combatant's turn used (`acted/done`, flip card), and on a successful dodge offer a "+2m free move". Respect that a combatant can react only once per attack.
  - Schema: none (uses combatant `acted`/`done`).
  - Acceptance: Use Dodge in combat → the combatant's turn is consumed; on success a +2m option appears.

### Phase 17 — Solo Completion (Priority: MEDIUM)
- [x] **Solo "+5 Advancement Marks" mission button.** ✅ `Sheet.soloMissionMarks` (Skills panel, Solo-only) marks 5 chosen skills then runs `rollAdvancement`.
  - Rule (solo): On completing a mission, gain 5 advancement marks to assign to skills of your choice (replaces the group end-of-session marking). See `DRAGONBANE_SOLO.advancement`.
  - Target: `app.js` · `SoloMode.view` and/or `Sheet` (visible when `Settings.soloMode()`).
  - Behavior/UI: A "Mission complete: +5 marks" button that lets the player tick 5 unmarked skills, then optionally run the advancement roll. Hidden when Solo Mode is off.
  - Schema: none (reuses skill `mark`).
  - Acceptance: With Solo Mode on, press the button → assign 5 marks → advancement roll uses them.
- [x] **Solo: one extra free Heroic Ability at creation.** ✅ Wizard refactored to `heroicPicks[]` with cap = `heroicCap()` (2 in Solo, 1 otherwise); validation/build updated. Verified both the non-solo (1 pick) and solo (2 picks) wizard runs create a hero with the right abilities.
  - Rule (solo): A solo character gets one additional free heroic ability at creation.
  - Target: `app.js` · `Wizard.step_heroic` / `Wizard.build` (and Pregens if relevant). Currently solo abilities are merely added to the choice pool (still one pick).
  - Behavior/UI: When `Settings.soloMode()`, allow selecting **two** heroic abilities at creation (one normal + one extra), both added to `abilities[]`. Update validation to require the correct count.
  - Schema: none.
  - Acceptance: With Solo Mode on, the wizard heroic step accepts two abilities; both appear on the created sheet.
- [x] **Solo "failing forward".** ✅ Added `DRAGONBANE_SOLO.failForward` (D6 table); `Roller.skill` shows a "🎲 Fail forward" button on a failed Solo roll that rolls a complication.
  - Rule (solo): Instead of hard failure, solo play converts failed skill checks into mishaps/complications (e.g. lose an item rather than fall to your death).
  - Target: `app.js` · `Roller.skill` (and optionally cast/attack) when `Settings.soloMode()`.
  - Behavior/UI: On a failed (non-demon) solo roll, after the push option, offer a "Fail forward" suggestion that rolls a complication (reuse `DRAGONBANE_SOLO.dragonDemonEffects` demon column or a new solo complication table in `data-solo.js`).
  - Schema: optional new `failForward: string[]` table in `data-solo.js`.
  - Acceptance: With Solo Mode on, a failed skill roll offers a "Fail forward" complication.

### Phase 18 — Advanced GM Automation (Priority: LOW) *(gated behind one shared toggle)*
> All features below are **optional**, hidden by default, and revealed together by a
> single **"Advanced / GM Automation"** toggle in **Settings & About** (same
> pattern as Book of Magic / Solo Mode). Add `Settings.gmAutomation()` →
> `!!get("gmAutomation")`. Keep the default player UI uncluttered.
- [x] **Add the shared toggle.** ✅ `Settings.gmAutomation()` + an "Advanced / GM Automation" toggle row in Settings & About; all Phase-18 UI checks it.
  - Target: `app.js` · `Settings` (add `gmAutomation()`); `Screens.about` settings panel (new toggle row).
  - Behavior/UI: A toggle row "Advanced / GM Automation" with a one-line description listing what it enables. All Phase-18 UI checks `Settings.gmAutomation()` before rendering.
  - Schema: `settings.gmAutomation: boolean` (default false) in `dragonbane.settings`.
  - Acceptance: Toggling it on reveals all Phase-18 panels; off hides them.
- [x] **Global time dashboard (Rounds / Stretches / Shifts).** ✅ A GM panel shows `state.time` with +Round/+Stretch/+Shift buttons (`Sheet.advanceClock`); +Shift drives sleep, +Stretch drives light burn-out.
  - Rule: Time scales — Round ≈ 10s, Stretch (several minutes), Shift ≈ 6h (Morning/Day/Evening/Night).
  - Target: `app.js` · new panel (Sheet or a small header widget) gated by the toggle.
  - Behavior/UI: Counters/steppers for rounds, stretches, and shift-of-day; advancing a shift can trigger dependent systems (light, sleep, round-rest reset).
  - Schema: `state.time: { round: 0, stretch: 0, shift: 0 }` (default zeros) or a campaign-level clock.
  - Acceptance: Advancing the clock updates counters and (when present) drives the systems below.
- [x] **Round rest "once per shift" enforcement.** ✅ `rest("round")` sets `state.roundRestUsed` and blocks a second round rest until a shift rest / +Shift clears it.
  - Rule: Round rest (+D6 WP) can be used only once per shift.
  - Target: `app.js` · `Sheet.rest("round")`.
  - Behavior/UI: After a round rest, disable it until a Shift rest or the time dashboard advances a shift; show "used this shift".
  - Schema: `state.roundRestUsed: boolean` (default false), cleared on shift rest / shift advance.
  - Acceptance: Two round rests in a row → second is blocked until a shift passes.
- [x] **Light-source burn-out.** ✅ Added `lightDie` to `DB.gear` light entries; lit items (`items[].lit`, toggled in the GM panel) roll their die on +Stretch (`Sheet.lightStretch`) — a 1 extinguishes.
  - Rule: Each stretch, roll the light's die (Torch D6, Oil Lamp D6, Lantern D8, Candle D4); on a 1 it goes out (`data.js` gear effects).
  - Target: `app.js` · light items in inventory + the time dashboard.
  - Behavior/UI: For carried/lit light sources, each elapsed stretch prompts the correct die; on a 1 mark it extinguished. Add structured `lightDie` to `DB.gear` light entries.
  - Schema: add `lightDie: 4|6|8` to light gear in `data.js`; `inventory.items[].lit: boolean`.
  - Acceptance: A lit torch prompts a D6 each stretch; rolling 1 marks it out.
- [x] **Sleep deprivation.** ✅ +Shift increments `state.awakeShifts`; at ≥3 it drains D6 WP per shift and `rest()` blocks WP/condition recovery; a shift rest resets it.
  - Rule: Missing sleep for 3 shifts blocks WP and condition healing and drains D6 WP per awake shift; reaching 0 WP forces an un-wakeable sleep.
  - Target: `app.js` · time dashboard + `Sheet`.
  - Behavior/UI: Track awake-shifts; at ≥3, block WP/condition recovery in `rest()` and deduct D6 WP per shift advance; at WP 0 show "forced sleep". Sleeping (a shift rest) resets the counter.
  - Schema: `state.awakeShifts: number` (default 0).
  - Acceptance: Advance 3 awake shifts → healing blocked + D6 WP drained per shift; sleeping resets it.
- [x] **Cold & disease trackers.** ✅ `state.afflictions` cold/disease(virulence 3D6) toggles + `Sheet.afflictionRoll` CON checks (failure → D6 damage + Sickly).
  - Rule: Cold/disease prompt recurring CON rolls; failure deals D6 damage and/or applies *Sickly*. (Disease has a virulence/duration.)
  - Target: `app.js` · `Sheet` (status section) + time dashboard.
  - Behavior/UI: "Cold" and "Disease" toggles; while active, each relevant interval prompts a CON `Roller.skill`-style check; on failure apply D6 damage and the *Sickly* condition. Disease tracks a virulence value.
  - Schema: `state.afflictions: { cold: boolean, disease: { virulence: number }|null }` (default `{cold:false, disease:null}`).
  - Acceptance: Enable Cold → CON-roll prompt; failing deals D6 and sets Sickly.
- [x] **Fear attacks + fear table.** ✅ Added `DB.fearTable`; `Sheet.fearAttack` rolls WIL (Fearless auto-resists), failure sets Scared + a D6 fear-table result.
  - Rule: A fear attack forces a WIL roll; failure applies *Scared* and a result on the fear table (Paralysis / Fleeing / Rage).
  - Target: `app.js` · `Sheet`/`Combat`; add a `fearTable` to `data.js`.
  - Behavior/UI: A "Fear attack" button → WIL `Roller.skill` check; on failure set *Scared* and roll/show the fear-table outcome.
  - Schema: add `fearTable: [...]` to `data.js`.
  - Acceptance: Trigger a fear attack → WIL roll; failure sets Scared and shows a fear-table result.
- [x] **Concentration interruption.** ✅ The sheet HP stepper calls `Sheet.concentrationCheck` on damage (gmAutomation): a WIL roll per concentration effect, failure ends it.
  - Rule: A concentration spell is broken (WIL roll to maintain) if the caster takes damage or suffers fear while concentrating.
  - Target: `app.js` · HP-decrement paths (`Sheet` stepper ~line 1943, `Combat` `doHp`, damage applier) check active concentration effects (`c.effects[].concentration`).
  - Behavior/UI: When a concentrating character takes damage/fear, prompt a WIL roll; on failure end the matching concentration effect.
  - Schema: none (uses `effects[].concentration`).
  - Acceptance: With a tracked concentration effect, taking damage prompts a WIL roll; failing removes the effect.

---

## 8. Changelog

| Date | Changes |
|---|---|
| 2026-06-26 | **Follow-ups to the §7B work — both loose ends closed.** (1) Replaced the metal-weapon name heuristic in `Roller.cast` with a real `metal: true|false` flag on all 35 `DB.weapons` entries (metal blades/heads true; wood/stone/bows/crossbows/shields false) — rules now live in the data layer. (2) Verified the Solo two-heroic-ability creation path end-to-end in a headless browser: the wizard heroic step accepts 2 picks (counter 2/2) and the created solo hero carries both abilities. SW cache v37. |
| 2026-06-26 | **Phase 18 (Advanced GM Automation) COMPLETE — entire §7B roadmap done.** Added `Settings.gmAutomation()` + a shared "Advanced / GM Automation" toggle that reveals a GM panel on the sheet: a time clock (`state.time`, `advanceClock`), round-rest once-per-shift (`state.roundRestUsed`), light burn-out (`DB.gear[].lightDie` + `items[].lit`, `lightStretch`), sleep deprivation (`state.awakeShifts` ≥3 → D6 WP drain + blocked recovery), cold & disease (`state.afflictions` + `afflictionRoll`), fear attacks (`DB.fearTable` + `fearAttack`), and concentration interruption (HP-damage → `concentrationCheck` WIL roll). Verified headless (clock advances, sleep-deprived at 3 shifts, fear→Scared+table, light burn modal on +Stretch, 0 errors). SW cache v36. |
| 2026-06-26 | **Phase 17 (Solo Completion) COMPLETE.** Added a Solo-only "🏅 Mission complete (+5 marks)" button (`Sheet.soloMissionMarks`) that marks 5 chosen skills then rolls advancement. Refactored the wizard heroic step to `heroicPicks[]` with `heroicCap()` = 2 in Solo / 1 otherwise (validation + build updated) so a solo character gets a second free heroic ability at creation. Added `DRAGONBANE_SOLO.failForward` (D6 complication table) with a "Fail forward" button on failed Solo skill rolls. Verified headless (mission +5, fail-forward complication, full non-solo wizard creates a hero with its ability, 0 errors). SW cache v35. |
| 2026-06-26 | **Phase 16 (Movement & Reactions) COMPLETE.** Movement panel gains a prone/stand free-action toggle (`state.prone`), a "🚪 Door (−½)" button (spends ⌈pool/2⌉), and a "🤸 Leap" button (Acrobatics roll when distance > movement/4, else auto). Added `Combat.reaction` with 🛡 Parry / 🤸 Dodge buttons on hero combat cards: rolls the skill, consumes the turn (acted+done → card flip), and offers a +2 m free move on a successful dodge. Verified headless (Door 14→7, prone toggle, dodge success marks Acted, 0 errors). SW cache v34. |
| 2026-06-26 | **Phase 15 (Vitals & Magic Extras) COMPLETE.** Robust/Focused now auto-adjust max HP/WP: added `abilityCount` + `effHpMax` and updated `effWpMax` (+2 per pick), wired through the HP/WP steppers, rest, and combat-add (`derived.hpMax`→`effHpMax`). Added a caster-only **Familiar** panel (`state.familiar`): bind a familiar (cap ⌊maxWP/2⌋), transfer WP between the mage and familiar pools with independent steppers, and release to return its WP. Verified headless (Focused 18→20, Robust 11→13, familiar transfer drains mage pool, 0 errors). SW cache v33. |
| 2026-06-26 | **Phase 14 (Advancement & Identity) COMPLETE.** Added the 5 official `advancementQuestions` to `data.js`. Rewrote `Sheet.endSession` into a questionnaire-first flow (each Yes → mark one unmarked skill) that calls a new `rollAdvancement`; skills reaching 18 prompt a free heroic ability. Added `Sheet.overcomeWeakness` (+2 marks, clear weakness, `state.weaknessCooldown`), `Sheet.trainTeacher` (one capped advancement roll via `state.teacherTrained`), and `Sheet.gainHeroicAbility` with requirement locking via a new `heroicReqMet` parser. UI: Train-with-teacher + Gain-heroic-ability buttons in the Skills panel; Overcome-Weakness / set-new-weakness controls in the Character panel. Verified headless (overcome → 2 marks + cooldown, questionnaire → advancement, picker 22/43 locked, 0 errors). SW cache v32. |
| 2026-06-26 | **Phase 13 (Encumbrance & Inventory) COMPLETE + unblocks Phase 10/11.** Rebuilt inventory on a rules-accurate slot model (`encUsed`): limit ⌈STR/2⌉, ceil(weight) per item, coins +1 slot/100, rations 4-per-slot, quiver = 1 slot, slingstones = 0. Added Equip/Unequip with an "Equipped (no encumbrance)" section (1 armor + 1 helmet + ≤3 weapons, via `inventory.items[].equipped`), weapon/shield durability steppers (💥 at 0), and an over-encumbered "Roll STR to move" prompt. Added `banes[]`/`metal`/`rangedBane` to `DB.armor`/`DB.helmets`. This unblocked: **Phase 11 heavy-armor/helmet skill banes** (Roller.skill + ranged Great Helm bane), **Phase 10 metal-magic restriction** (now data-driven via equipped armor/helmet + weapon heuristic), and **Phase 10 hero-armor** (combat cards read `equippedArmor().rating`). Also fixed a latent `el()` bug that dropped the encumbrance slot-count line. Verified in headless browser (slots 6/8→2/8 on equip, Evade shows "worn armor → bane", combat card "Armor 6", 0 page errors). SW cache v31. |
| 2026-06-26 | **Phase 10 (Bug Fixes) started — 2 of 4 done.** Fixed dead `DB.solo` references (the solo NPC Attack Table AI roller now resolves `DRAGONBANE_SOLO.npcAttackTable`; the combat-card button is gated by Solo Mode). Added the missing `Store.clear()` so Settings → "Clear all storage" works instead of throwing. The remaining two Phase 10 fixes (metal-magic check, hero-armor-always-0) are deferred — they depend on the Phase 13 equipped-item slots. SW cache v27. |
| 2026-06-26 | **Rules-Accuracy Completion roadmap added (§7B).** From a full feature audit against the *Dragonbane* core/expansion rules, documented every missing/partial feature as nine themed phases (Phase 10 Bug Fixes → Phase 18 Advanced GM Automation), ordered by rules-impact with Priority labels and full implementation specs (rule · target file/function · behavior/UI · schema · acceptance). Added §2.9 (planned-features summary) and §6.1 (planned schema additions). Docs only — no code changes yet. GM-side automations gated behind one shared "Advanced / GM Automation" toggle; encumbrance specced as a full slot-system rebuild. |
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
