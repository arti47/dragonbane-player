/*
 * data-solo.js — Dragonbane Solo Mode rules library
 * -------------------------------------------------
 * The official Dragonbane solo tools (from the solo dungeon-delving rules,
 * "Alone in Deepfall Breach"). Used by Solo mode (a distinct play mode —
 * see CLAUDE.md §10). Adventure-specific content (the Deepfall Breach dungeon,
 * its treasure deck, etc.) is intentionally excluded — this holds the reusable
 * Core Solo Tools only.
 *
 * Source: Dragonbane solo rules, via the project's NotebookLM notebook
 * (source id 98cc2537-e8ae-4e30-b4b3-4074c8d58ebf).
 *
 * Exposed as the global `DRAGONBANE_SOLO`.
 */

const DRAGONBANE_SOLO = {

  /* ----------------------------------------------------------------
   * SOLO HEROIC ABILITIES — selectable only in Solo campaigns (Q11/A).
   * ---------------------------------------------------------------- */
  heroicAbilities: [
    { name: "Army of One", req: null, wp: null,
      text: "When fighting alone, draw two initiative cards and keep both — you have two turns each round." },
    { name: "Sole Survivor", req: null, wp: 3,
      text: "When adventuring alone, you may push a roll without suffering a condition." }
  ],

  /* ----------------------------------------------------------------
   * FORTUNE CHART (the oracle) — ask a question, roll a D6, read the
   * appropriate column. "Tilt the scales" by likelihood.
   * ---------------------------------------------------------------- */
  fortune: {
    likelihoods: [
      { key: "even",     label: "Even odds",  roll: "Roll 1D6" },
      { key: "unlikely", label: "Unlikely",   roll: "Roll 2D6, take the lowest" },
      { key: "likely",   label: "Likely",     roll: "Roll 2D6, take the highest" }
    ],
    // Columns to interpret a D6 result against, depending on the question type.
    columns: ["Yes/No", "Number", "Scale", "Power", "Quality", "Reaction"],
    chart: [
      { d6: "1",   yesNo: "Extreme no",  number: "None / one", scale: "Small",    power: "Weak",       quality: "Flawed",  reaction: "Hostile" },
      { d6: "2-3", yesNo: "No",          number: "Few",        scale: "Moderate", power: "Minor",      quality: "Mundane", reaction: "Wary" },
      { d6: "4-5", yesNo: "Yes",         number: "Several",    scale: "Large",    power: "Formidable", quality: "Fine",    reaction: "Open" },
      { d6: "6",   yesNo: "Extreme yes", number: "Numerous",   scale: "Immense",  power: "Incredible", quality: "Precious",reaction: "Friendly" }
    ],
    keepItSimple: "Without the table: 1-3 = no / negative / lower scope; 4-6 = yes / positive / greater scope. A 1 or 6 indicates an extreme result or interesting twist.",
    keepItMoving: "Only roll when you want to leave the answer to fate. If an answer is almost certain — or you prefer a result because it's interesting or dramatic — just decide and move on."
  },

  /* ----------------------------------------------------------------
   * INSPIRATION TABLE (D20) — for open-ended questions. Roll one column
   * for a single answer, or multiple columns to build a phrase.
   * ---------------------------------------------------------------- */
  inspiration: [
    { d20: 1,  action: "Avenge",     attribute: "Ancient",     thing: "Barrier" },
    { d20: 2,  action: "Control",    attribute: "Arcane",      thing: "Captivity" },
    { d20: 3,  action: "Craft",      attribute: "Blocked",     thing: "Conflict" },
    { d20: 4,  action: "Deliver",    attribute: "Corrupted",   thing: "Creature" },
    { d20: 5,  action: "Destroy",    attribute: "Cursed",      thing: "Death" },
    { d20: 6,  action: "Escape",     attribute: "Damaged",     thing: "Defense" },
    { d20: 7,  action: "Find",       attribute: "Dangerous",   thing: "Device" },
    { d20: 8,  action: "Guard",      attribute: "Decaying",    thing: "Group" },
    { d20: 9,  action: "Hunt",       attribute: "Destroyed",   thing: "History" },
    { d20: 10, action: "Infiltrate", attribute: "Flooded",     thing: "Knowledge" },
    { d20: 11, action: "Protect",    attribute: "Forgotten",   thing: "Leader" },
    { d20: 12, action: "Rescue",     attribute: "Secret",      thing: "Message" },
    { d20: 13, action: "Restore",    attribute: "Lost",        thing: "Path" },
    { d20: 14, action: "Scavenge",   attribute: "Mighty",      thing: "Person" },
    { d20: 15, action: "Search",     attribute: "Moving",      thing: "Power" },
    { d20: 16, action: "Seize",      attribute: "Peaceful",    thing: "Refuge" },
    { d20: 17, action: "Stop",       attribute: "Protected",   thing: "Resource" },
    { d20: 18, action: "Strengthen", attribute: "Sacred",      thing: "Trap" },
    { d20: 19, action: "Summon",     attribute: "Transformed", thing: "Treasure" },
    { d20: 20, action: "Weaken",     attribute: "Violent",     thing: "Weapon" }
  ],

  /* ----------------------------------------------------------------
   * DRAGON / DEMON EFFECTS (out of combat) — roll D6 for narrative effect.
   * In combat, use the core Rulebook's Dragon/Demon effects instead.
   * Alternatively, apply a boon (Dragon) or bane (Demon) to a related action.
   * ---------------------------------------------------------------- */
  dragonDemonEffects: [
    { d6: 1, dragon: "You uncover a helpful item or resource.",       demon: "An important item is lost or broken." },
    { d6: 2, dragon: "The action is performed faster than usual.",    demon: "You suffer a dangerous delay." },
    { d6: 3, dragon: "You impress others or create a distraction.",   demon: "You draw unwanted attention." },
    { d6: 4, dragon: "You reveal a new opportunity or clue.",         demon: "You stumble into a new danger." },
    { d6: 5, dragon: "You trigger an unexpected beneficial effect.",  demon: "You trigger an unexpected reaction or trap." },
    { d6: 6, dragon: "The action yields greater results than usual.", demon: "You cause collateral damage or injure yourself." }
  ],

  /* ----------------------------------------------------------------
   * SIMPLE NPC TEMPLATES — quick stats. Simple NPCs use no heroic
   * abilities or WP.
   * ---------------------------------------------------------------- */
  npcTemplates: [
    { name: "Minion", attributes: 10, movement: 10, hp: 12, armor: null, damage: "2D6", skills: "relevant skills 12, other 6" },
    { name: "Boss",   attributes: 14, movement: 12, hp: 20, armor: 4,    damage: "2D8", skills: "relevant skills 15, other 8" }
  ],

  /* ----------------------------------------------------------------
   * NPC ATTACK TABLE — pick a role and roll D6 on their turn. Unlike
   * monster attacks, these require a skill roll unless noted as automatic.
   * Give a varied foe two roles and pick on their turn.
   * ---------------------------------------------------------------- */
  npcAttackTable: {
    roles: ["Melee Attacker", "Ranged Attacker", "Sneaky Attacker", "Magic Attacker"],
    note: "The Magic Attacker role abstracts spells and ignores WP. For a complex caster, build a standard NPC with WP and spells instead.",
    rows: [
      { d6: "1-3",
        melee:  "Deal a Blow! Makes a melee attack.",
        ranged: "Take a Shot! Makes a ranged attack.",
        sneaky: "Cunning Strike! Attacks with their current weapon.",
        magic:  "Magic Bolt! Casts an attack spell for 2D6 damage against a single target." },
      { d6: "4",
        melee:  "Defensive Stance! If you haven't acted this round, the NPC swaps initiative cards with you and parries/dodges with a boon. If you don't attack (or have already attacked), they attack with a bane.",
        ranged: "Hold! Moves to a better position or readies a shot; attacks on their next turn as an automatic hit (unless you dodge/parry).",
        sneaky: "On the Move! Changes approach or weapon (melee↔ranged); attacks on their next turn with a boon.",
        magic:  "Magic Blast! Casts an attack spell for 3D6 damage against any targets within 10 m." },
      { d6: "5",
        melee:  "Wild Attack! Attacks with a boon; a hit deals +D6 damage and knocks you down. If you attack them before their next turn, you do so with a boon.",
        ranged: "Volley! Attacks twice this turn, both with a bane.",
        sneaky: "Devious Feint! You make an INT roll (free action): success lets you dodge/parry with a boon; failure means the NPC hits automatically (no dodge/parry) for +D6 damage.",
        magic:  "Arcane Shield! Automatically summons a shield reducing incoming damage by 2D6; maintained with a free-action skill roll each round, and further uses add D6 to the shield." },
      { d6: "6",
        melee:  "Intimidating Rage! Roars or rampages — roll WIL to resist fear.",
        ranged: "Deadly Shot! Attacks with a bane, dealing +2D6 damage on a hit.",
        sneaky: "Sneak Attack! Hides — you may make a free-action AWARENESS roll; on a failure the NPC hits automatically next turn (no dodge/parry) for +2D6 damage.",
        magic:  "Mystic Mysteries! Casts a spell of unknowable origin — roll Action and Thing on the Inspiration Table and interpret the effect." }
    ]
  },

  /* ----------------------------------------------------------------
   * FAIL FORWARD — an OPTIONAL HOUSE AID (not an official Dragonbane table).
   * The official solo rules describe the "fail forward" *playstyle* (turn a
   * failed roll into success-at-a-cost) but provide no table; this D6 list is an
   * app-provided suggestion box, surfaced only in Solo mode. Treat as a GM aid.
   * ---------------------------------------------------------------- */
  failForward: [
    "You succeed, but a piece of equipment is lost or damaged in the process.",
    "You succeed, but it takes far longer than planned (lose a stretch or shift).",
    "You succeed, but draw unwanted attention or noise.",
    "You succeed, but suffer a condition of your choice.",
    "You succeed only partially — the goal is met, but a new problem arises.",
    "You succeed, but lose your advantage or position for the next action."
  ],

  /* ----------------------------------------------------------------
   * SOLO ADVANCEMENT — replaces the group end-of-session system.
   * ---------------------------------------------------------------- */
  advancement: {
    note: "Tick a skill's box each time you roll a Dragon or Demon using it (as normal). On returning from a successful mission, also gain 5 advancement marks for skills of your choice. Between missions, roll a D20 per mark — if it exceeds your current skill level, that skill increases by 1 (max 18). Then erase the marks and start over next mission."
  }
};

if (typeof window !== "undefined") { window.DRAGONBANE_SOLO = DRAGONBANE_SOLO; }
if (typeof module !== "undefined" && module.exports) { module.exports = DRAGONBANE_SOLO; }
