/*
 * data.js — Dragonbane core rules library
 * ----------------------------------------
 * Single source of truth for all game-rules data used by the app
 * (creation wizard, tracker, dice engine). Core rules ONLY — no
 * Misty Vale / campaign / supplement content.
 *
 * Source: Dragonbane core rulebook, via the project's NotebookLM
 * notebook (id 02d0a44e-6f59-4397-8b2a-ccd040fbc4f7).
 *
 * Exposed as the global `DRAGONBANE` (browser) and as a CommonJS
 * export (tooling). Keep CLAUDE.md in sync with any change here.
 *
 * STATUS: COMPLETE — attributes, conditions, derived-stat tables, ages,
 *         kin, skills (30 core + 3 magic), professions (+ full gear tables),
 *         heroic abilities (44), spells (General + Animism/Elementalism/
 *         Mentalism, tricks + ranks 1-3), weapons, shields, armor, helmets,
 *         general gear, instruments, currency.
 */

const DRAGONBANE = {

  /* ----------------------------------------------------------------
   * ATTRIBUTES  (scale 3-18)
   * ---------------------------------------------------------------- */
  attributes: [
    { key: "STR", name: "Strength",     desc: "Raw muscle power." },
    { key: "CON", name: "Constitution", desc: "Physical fitness and resilience." },
    { key: "AGL", name: "Agility",      desc: "Body control, speed, and fine motor skills." },
    { key: "INT", name: "Intelligence", desc: "Mental acuity, intellect, and reasoning." },
    { key: "WIL", name: "Willpower",    desc: "Self-discipline and focus." },
    { key: "CHA", name: "Charisma",     desc: "Force of personality and empathy." }
  ],
  attributeRange: { min: 3, max: 18 },

  /* ----------------------------------------------------------------
   * CONDITIONS  (one per attribute; gained by pushing a roll)
   * Each imposes a bane on rolls against its attribute (and skills
   * based on that attribute).
   * ---------------------------------------------------------------- */
  conditions: [
    { key: "exhausted",    name: "Exhausted",    attribute: "STR" },
    { key: "sickly",       name: "Sickly",       attribute: "CON" },
    { key: "dazed",        name: "Dazed",        attribute: "AGL" },
    { key: "angry",        name: "Angry",        attribute: "INT" },
    { key: "scared",       name: "Scared",       attribute: "WIL" },
    { key: "disheartened", name: "Disheartened", attribute: "CHA" }
  ],

  /* ----------------------------------------------------------------
   * DERIVED-STAT TABLES
   * ---------------------------------------------------------------- */
  tables: {
    // Skill base chance from governing attribute score.
    baseChance: [
      { min: 1,  max: 5,  value: 3 },
      { min: 6,  max: 8,  value: 4 },
      { min: 9,  max: 12, value: 5 },
      { min: 13, max: 15, value: 6 },
      { min: 16, max: 18, value: 7 }
    ],
    // Damage bonus from STR (melee) or AGL (ranged/finesse) score.
    damageBonus: [
      { min: 1,  max: 12, value: null }, // none ("—")
      { min: 13, max: 16, value: "D4" },
      { min: 17, max: 18, value: "D6" }
    ],
    // Movement modifier from AGL score (added to kin base movement).
    movementMod: [
      { min: 1,  max: 6,  value: -4 },
      { min: 7,  max: 9,  value: -2 },
      { min: 10, max: 12, value: 0 },
      { min: 13, max: 15, value: +2 },
      { min: 16, max: 18, value: +4 }
    ]
  },

  /* ----------------------------------------------------------------
   * AGE  (modifiers do not stack; attributes capped at 18)
   * trainedSkills: total trained skills at creation; `fromProfession`
   * of them must come from the profession list, the rest are free.
   * ---------------------------------------------------------------- */
  ages: [
    { key: "young", name: "Young", trainedSkills: 8,  fromProfession: 6, mods: { AGL: +1, CON: +1 } },
    { key: "adult", name: "Adult", trainedSkills: 10, fromProfession: 6, mods: {} },
    { key: "old",   name: "Old",   trainedSkills: 12, fromProfession: 6, mods: { STR: -2, AGL: -2, CON: -2, INT: +1, WIL: +1 } }
  ],

  /* ----------------------------------------------------------------
   * KIN  (innate ability + base movement)
   * ---------------------------------------------------------------- */
  kin: [
    {
      key: "human", name: "Human", movement: 10,
      abilities: [
        { name: "Adaptive", wp: 3,
          text: "When rolling for a skill, you can choose to make the roll using another skill of your choice. You must be able to justify how you use the selected skill instead of the normal one. The GM has the final word, but should be lenient." }
      ]
    },
    {
      key: "halfling", name: "Halfling", movement: 8,
      abilities: [
        { name: "Hard to Catch", wp: 3,
          text: "You can activate this ability when dodging an attack, getting a boon to the EVADE roll." }
      ]
    },
    {
      key: "dwarf", name: "Dwarf", movement: 8,
      abilities: [
        { name: "Unforgiving", wp: 3,
          text: "You can activate this ability when attacking someone who harmed you in the past (at least 1 point of damage) and get a boon to the roll. It does not matter when the damage was inflicted." }
      ]
    },
    {
      key: "elf", name: "Elf", movement: 10,
      abilities: [
        { name: "Inner Peace", wp: null,
          text: "As an elf, you can meditate deeply during a stretch rest. You heal an additional D6 HP and a D6 extra WP, and can recover from an additional condition. You are completely unresponsive during your meditation and cannot be awakened." }
      ]
    },
    {
      key: "mallard", name: "Mallard", movement: 8,
      abilities: [
        { name: "Ill-Tempered", wp: 3,
          text: "Mallards tend to have a choleric temper. You can activate this ability (no action) when making a skill roll and get a boon to the roll. You also become Angry, if you're not already. This ability cannot be used for rolls against INT or INT-based skills." },
        { name: "Webbed Feet", wp: null,
          text: "As a mallard you also get a boon to all SWIMMING rolls. You always move at full speed in or under water." }
      ]
    },
    {
      key: "wolfkin", name: "Wolfkin", movement: 12,
      abilities: [
        { name: "Hunting Instincts", wp: 3,
          text: "You can use this ability to designate a creature in sight, or a creature you can catch the scent of, as your prey. This counts as an action in combat. You can follow the scent of your prey for a full day, and you can spend 1 further WP (not an action) to gain a boon for an attack against your prey." }
      ]
    }
  ],

  /* ----------------------------------------------------------------
   * SKILLS  (30 core: 20 general + 10 weapon) + magic schools
   * `kind`: "general" | "weapon" | "magic"
   * ---------------------------------------------------------------- */
  skills: [
    // General (20)
    { name: "Acrobatics",       attribute: "AGL", kind: "general" },
    { name: "Awareness",        attribute: "INT", kind: "general" },
    { name: "Bartering",        attribute: "CHA", kind: "general" },
    { name: "Beast Lore",       attribute: "INT", kind: "general" },
    { name: "Bluffing",         attribute: "CHA", kind: "general" },
    { name: "Bushcraft",        attribute: "INT", kind: "general" },
    { name: "Crafting",         attribute: "STR", kind: "general" },
    { name: "Evade",            attribute: "AGL", kind: "general" },
    { name: "Healing",          attribute: "INT", kind: "general" },
    { name: "Hunting & Fishing",attribute: "AGL", kind: "general" },
    { name: "Languages",        attribute: "INT", kind: "general" },
    { name: "Myths & Legends",  attribute: "INT", kind: "general" },
    { name: "Performance",      attribute: "CHA", kind: "general" },
    { name: "Persuasion",       attribute: "CHA", kind: "general" },
    { name: "Riding",           attribute: "AGL", kind: "general" },
    { name: "Seamanship",       attribute: "INT", kind: "general" },
    { name: "Sleight of Hand",  attribute: "AGL", kind: "general" },
    { name: "Sneaking",         attribute: "AGL", kind: "general" },
    { name: "Spot Hidden",      attribute: "INT", kind: "general" },
    { name: "Swimming",         attribute: "AGL", kind: "general" },
    // Weapon (10)
    { name: "Axes",             attribute: "STR", kind: "weapon" },
    { name: "Bows",             attribute: "AGL", kind: "weapon" },
    { name: "Brawling",         attribute: "STR", kind: "weapon" },
    { name: "Crossbows",        attribute: "AGL", kind: "weapon" },
    { name: "Hammers",          attribute: "STR", kind: "weapon" },
    { name: "Knives",           attribute: "AGL", kind: "weapon" },
    { name: "Slings",           attribute: "AGL", kind: "weapon" },
    { name: "Spears",           attribute: "STR", kind: "weapon" },
    { name: "Staves",           attribute: "AGL", kind: "weapon" },
    { name: "Swords",           attribute: "STR", kind: "weapon" },
    // Magic schools (secondary skills, core game) — INT-based.
    // A character only has these if trained (mages get one base school).
    { name: "Animism",          attribute: "INT", kind: "magic" },
    { name: "Elementalism",     attribute: "INT", kind: "magic" },
    { name: "Mentalism",        attribute: "INT", kind: "magic" }
  ],

  /* ----------------------------------------------------------------
   * PROFESSIONS  (10)
   * `skills`: list from which 6 starting trained skills are chosen.
   * `heroicAbilities`: starting heroic ability options (pick one).
   * Mage gets magic instead of a heroic ability.
   * `gear`: complete D6 starting-gear table (rows 1-2, 3-4, 5-6).
   * ---------------------------------------------------------------- */
  professions: [
    {
      key: "artisan", name: "Artisan", keyAttribute: "STR",
      skills: ["Axes","Brawling","Crafting","Hammers","Knives","Sleight of Hand","Spot Hidden","Swords"],
      heroicAbilities: ["Master Blacksmith","Master Carpenter","Master Tanner"],
      gear: [
        { roll: "1-2", items: "Warhammer (small), leather armor, blacksmith's tools, torch, flint & tinder, D8 food rations, D8 silver" },
        { roll: "3-4", items: "Handaxe, leather armor, carpentry tools, torch, rope (hemp), flint & tinder, D8 food rations, D8 silver" },
        { roll: "5-6", items: "Knife, leather armor, tanner's tools, lantern, lamp oil, flint & tinder, D8 food rations, D8 silver" }
      ]
    },
    {
      key: "bard", name: "Bard", keyAttribute: "CHA",
      skills: ["Acrobatics","Bluffing","Evade","Knives","Languages","Myths & Legends","Performance","Persuasion"],
      heroicAbilities: ["Musician"],
      gear: [
        { roll: "1-2", items: "Lyre, knife, oil lamp, lamp oil, flint & tinder, D6 food rations, D8 silver" },
        { roll: "3-4", items: "Flute, dagger, rope (hemp), torch, flint & tinder, D6 food rations, D8 silver" },
        { roll: "5-6", items: "Horn, knife, torch, flint & tinder, D6 food rations, D8 silver" }
      ]
    },
    {
      key: "fighter", name: "Fighter", keyAttribute: "STR",
      skills: ["Axes","Bows","Brawling","Crossbows","Evade","Hammers","Spears","Swords"],
      heroicAbilities: ["Veteran"],
      gear: [
        { roll: "1-2", items: "Broadsword/battle axe/morning star, small shield, chainmail, torch, flint & tinder, D6 food rations, D6 silver" },
        { roll: "3-4", items: "Short sword/handaxe/short spear, light crossbow, quiver, leather armor, torch, flint & tinder, D6 food rations, D6 silver" },
        { roll: "5-6", items: "Long spear, studded leather armor, open helmet, torch, flint & tinder, D6 food rations, D6 silver" }
      ]
    },
    {
      key: "hunter", name: "Hunter", keyAttribute: "AGL",
      skills: ["Acrobatics","Awareness","Bows","Bushcraft","Hunting & Fishing","Knives","Slings","Sneaking"],
      heroicAbilities: ["Companion"],
      gear: [
        { roll: "1-2", items: "Dagger, short bow, quiver, leather armor, sleeping pelt, torch, flint & tinder, rope (hemp), snare, D8 food rations, D6 silver" },
        { roll: "3-4", items: "Knife, longbow, quiver, leather armor, sleeping pelt, torch, flint & tinder, rope (hemp), fishing rod, D8 food rations, D6 silver" },
        { roll: "5-6", items: "Dagger, sling, leather armor, sleeping pelt, torch, flint & tinder, rope (hemp), snare, D8 food rations, D6 silver" }
      ]
    },
    {
      key: "knight", name: "Knight", keyAttribute: "STR",
      skills: ["Beast Lore","Hammers","Myths & Legends","Performance","Persuasion","Riding","Spears","Swords"],
      heroicAbilities: ["Guardian"],
      gear: [
        { roll: "1-2", items: "Broadsword/morning star, shield (small), plate armor, great helm, torch, flint & tinder, D6 food rations, D12 silver" },
        { roll: "3-4", items: "Flail/warhammer (small), shield (small), chainmail, open helmet, torch, flint & tinder, D6 food rations, D12 silver" },
        { roll: "5-6", items: "Short sword, lance, shield (small), chainmail, open helmet, combat trained horse, D6 food rations, D12 silver" }
      ]
    },
    {
      key: "mage", name: "Mage", keyAttribute: "WIL",
      // School-dependent trained-skill lists; pick one school.
      schools: {
        animism:      ["Animism","Beast Lore","Bushcraft","Evade","Healing","Hunting & Fishing","Sneaking","Staves"],
        elementalism: ["Elementalism","Awareness","Evade","Healing","Languages","Myths & Legends","Spot Hidden","Staves"],
        mentalism:    ["Mentalism","Acrobatics","Awareness","Brawling","Evade","Healing","Languages","Myths & Legends"]
      },
      heroicAbilities: [], // none — gets magic instead
      magic: { note: "Select a school (Animism, Elementalism, or Mentalism) as a trained skill. Choose 3 rank-1 spells and 3 magic tricks from that school or General Magic. Start with a grimoire." },
      gear: [
        { roll: "1-2", items: "Staff, orbuculum, grimoire, torch, flint & tinder, D6 food rations, D8 silver" },
        { roll: "3-4", items: "Knife, wand, grimoire, torch, flint & tinder, D6 food rations, D8 silver" },
        { roll: "5-6", items: "Amulet, grimoire, sleeping pelt, torch, flint & tinder, D6 food rations, D8 silver" }
      ]
    },
    {
      key: "mariner", name: "Mariner", keyAttribute: "AGL",
      skills: ["Acrobatics","Awareness","Hunting & Fishing","Knives","Languages","Seamanship","Swimming","Swords"],
      heroicAbilities: ["Sea Legs"],
      gear: [
        { roll: "1-2", items: "Dagger, short bow, quiver, rope (hemp), grappling hook, sleeping pelt, torch, flint & tinder, D8 food rations, D10 silver" },
        { roll: "3-4", items: "Scimitar, leather armor, rope (hemp), grappling hook, torch, flint & tinder, D8 food rations, D10 silver" },
        { roll: "5-6", items: "Trident, spyglass, rope (hemp), grappling hook, torch, flint & tinder, D8 food rations, D10 silver" }
      ]
    },
    {
      key: "merchant", name: "Merchant", keyAttribute: "CHA",
      skills: ["Awareness","Bartering","Bluffing","Evade","Knives","Persuasion","Sleight of Hand","Spot Hidden"],
      heroicAbilities: ["Treasure Hunter"],
      gear: [
        { roll: "1-2", items: "Dagger, sleeping pelt, torch, flint & tinder, rope (hemp), donkey, D6 food rations, D12 silver" },
        { roll: "3-4", items: "Knife, sleeping pelt, lantern, lamp oil, flint & tinder, field kitchen, donkey, cart, D6 food rations, D12 silver" },
        { roll: "5-6", items: "Dagger, sleeping pelt, large tent, oil lamp, lamp oil, flint & tinder, backpack, D6 food rations, D12 silver" }
      ]
    },
    {
      key: "scholar", name: "Scholar", keyAttribute: "INT",
      skills: ["Awareness","Beast Lore","Bushcraft","Evade","Healing","Languages","Myths & Legends","Spot Hidden"],
      heroicAbilities: ["Intuition"],
      gear: [
        { roll: "1-2", items: "Staff, notebook, quill, sleeping pelt, torch, flint & tinder, D6 food rations, D10 silver" },
        { roll: "3-4", items: "Knife, book (any subject), sleeping pelt, oil lamp, lamp oil, flint & tinder, D6 food rations, D10 silver" },
        { roll: "5-6", items: "Short sword, bandages, sleeping poison (one dose), sleeping pelt, lantern, lamp oil, flint & tinder, D6 food rations, D10 silver" }
      ]
    },
    {
      key: "thief", name: "Thief", keyAttribute: "AGL",
      skills: ["Acrobatics","Awareness","Bluffing","Evade","Knives","Sleight of Hand","Sneaking","Spot Hidden"],
      heroicAbilities: ["Backstabbing"],
      gear: [
        { roll: "1-2", items: "Dagger, sling, rope (hemp), grappling hook, torch, flint & tinder, D6 food rations, D10 silver" },
        { roll: "3-4", items: "Knife, lockpicks (simple), torch, flint & tinder, D6 food rations, D10 silver" },
        { roll: "5-6", items: "Two daggers, marbles, rope (hemp), torch, flint & tinder, D6 food rations, D10 silver" }
      ]
    }
  ],

  /* ----------------------------------------------------------------
   * HEROIC ABILITIES  (44, core rulebook)
   * req: skill requirement (null = none). wp: cost (null = "—", "varies").
   * ---------------------------------------------------------------- */
  heroicAbilities: [
    { name: "Assassin", req: "Knives 12", wp: 3,
      text: "Your sneak attack deals an extra D8 damage. Can be combined with Backstabbing. Activate after you roll to hit, but before you roll for damage." },
    { name: "Backstabbing", req: "Knives 12", wp: 3,
      text: "When making a melee attack against an enemy within 2 m of another player character, your attack counts as a sneak attack: it cannot be dodged or parried, you get a boon, and the damage dice increase by one (2D8 instead of D8). Only with a subtle weapon. Not an action." },
    { name: "Battle Cry", req: null, wp: 3,
      text: "As an action in combat, let out a battle cry that inspires your friends. All other player characters within earshot immediately heal a condition of their choice. Combat only." },
    { name: "Berserker", req: "Any melee weapon skill 12", wp: 3,
      text: "Gain the Angry condition and immediately attack the nearest opponent in melee (if already Angry, gain another condition of choice). You must keep fighting until all opponents in sight are defeated or you reach 0 HP. Boon to melee attacks, but you cannot parry or dodge. After the fight you become Exhausted." },
    { name: "Catlike", req: "Acrobatics 12", wp: "varies",
      text: "The number of D6 rolled for fall damage decreases by one for each WP spent. You can first make an ACROBATICS roll and then activate this ability." },
    { name: "Companion", req: "Hunting & Fishing 12", wp: 3,
      text: "Turn an animal (not a monster) into your companion (takes a stretch; one at a time). It follows you in its natural environment and scouts at no extra WP. For 3 additional WP you can command it to attack an enemy (free action)." },
    { name: "Contortionist", req: "Evade 12", wp: 1,
      text: "Escape from your shackles or squeeze through a narrow space without rolling for any skill." },
    { name: "Defensive", req: "Any melee weapon skill 12", wp: 3,
      text: "Parry an attack without consuming your action, at any time during the round. Only parry the same attack once; cannot dodge and parry the same attack. Usable multiple times per round if you have WP." },
    { name: "Deflect Arrow", req: "Any melee weapon skill 12", wp: 1,
      text: "Parry a ranged attack with a melee weapon, instead of using a shield." },
    { name: "Disguise", req: "Bluffing 12", wp: 2,
      text: "After a stretch of work, assume another person's looks, voice, and demeanor. The person must be of the same kin as you. Anyone who knows them and sees you within 10 m can make an AWARENESS roll to see through it." },
    { name: "Double Slash", req: "Axes or Swords 12", wp: 3,
      text: "With a slashing weapon, attack two enemies within 2 m with a single slash. Roll once; if it succeeds both are hit (they parry/dodge individually). Damage rolled separately. Combine with Dual Wield." },
    { name: "Dragonslayer", req: "Any weapon skill 12", wp: 3,
      text: "An attack aimed at a monster (not a normal NPC) deals an additional D8 damage. Activate after you roll to hit, but before you roll for damage." },
    { name: "Dual Wield", req: "Any melee weapon skill 12", wp: 3,
      text: "Wielding a one-handed weapon in each hand: the off-hand weapon's STR requirement increases by 3. On your turn, perform an extra attack with your second weapon, made with a bane. Finish the first attack (incl. damage) before the second. Combine with Double Slash." },
    { name: "Eagle Eye", req: "Awareness 12", wp: 2,
      text: "See a person or object up to 200 m away in great detail for one stretch. In combat, shoot beyond a weapon's effective range without a bane. Activate per new target." },
    { name: "Fast Footwork", req: "Evade 12", wp: 3,
      text: "Dodge an attack without consuming your action, at any time during the round. Only dodge the same attack once; cannot dodge and parry the same attack. Usable multiple times per round if you have WP." },
    { name: "Fast Healer", req: null, wp: 2,
      text: "Heal an extra D6 HP during a stretch rest. Does not affect WP or conditions." },
    { name: "Fearless", req: null, wp: 2,
      text: "Automatically resist fear, without a WIL roll." },
    { name: "Focused", req: null, wp: null,
      text: "Your maximum WP is permanently increased by 2. Can be selected multiple times, without limit." },
    { name: "Guardian", req: "Axes, Hammers, or Swords 12", wp: 2,
      text: "If you and another PC are both within 2 m of an enemy and it tries to attack the other character, force it to attack you instead. Out of turn; not an action." },
    { name: "Insight", req: "Persuasion 12", wp: 2,
      text: "After talking a while with someone, roll AWARENESS to determine whether they are telling the truth (not exactly what they are lying about)." },
    { name: "Intuition", req: "Myths & Legends 12", wp: 3,
      text: "When faced with a difficult decision, ask a question directly to the GM and receive a helpful answer reflecting your general knowledge." },
    { name: "Iron Fist", req: "Brawling 12", wp: 1,
      text: "The damage of an unarmed attack increases by one D6. Free action after rolling the attack." },
    { name: "Iron Grip", req: "Brawling 12", wp: 1,
      text: "Boon to your BRAWLING roll when trying to grapple another person or prevent an enemy from breaking free." },
    { name: "Lightning Fast", req: "Evade 12", wp: 2,
      text: "When drawing your initiative card at the start of a combat round, draw two cards and choose which one to keep. Once per round." },
    { name: "Lone Wolf", req: "Bushcraft 12", wp: null,
      text: "Take a shift rest in the wilderness without first rolling BUSHCRAFT to make camp. Applies only to you, even if you have a tent." },
    { name: "Magic Talent", req: null, wp: null,
      text: "You can learn a new school of magic (whether or not you already know any). Spells are learned separately. Can be selected multiple times — once per new school." },
    { name: "Massive Blow", req: "Any STR-based melee weapon skill 12", wp: 3,
      text: "A strike with a two-handed melee weapon inflicts D8 additional damage, but you cannot move in the same round. Activate after the roll to hit, but not if you moved." },
    { name: "Master Blacksmith", req: "Crafting 12", wp: "varies",
      text: "Requires blacksmithing tools. Sharpen a bladed/pointed weapon (one stretch, 3 WP): against it, an item's armor rating counts one step lower, until after one combat encounter. Craft a metal weapon or armor (one shift, requires forge, anvil, iron): WP equal to the item's price in gold (rounded up); work can be spread across shifts." },
    { name: "Master Carpenter", req: "Crafting 12", wp: "varies",
      text: "Requires carpentry tools. As an action, inflict D12 damage per WP spent on a door, wall, or other inanimate object, ignoring its armor rating. Craft a wooden item (one shift, requires wood): WP equal to the item's price in gold (rounded up)." },
    { name: "Master Chef", req: null, wp: 1,
      text: "Automatically succeed at cooking food without rolling BUSHCRAFT." },
    { name: "Master Spellcaster", req: "Any magic school 12", wp: 3,
      text: "On your turn in combat, cast two different spells as a single action. Must be two different spells. Roll for the first, then activate this ability." },
    { name: "Master Tanner", req: "Crafting 12", wp: "varies",
      text: "Requires leatherworking tools. Craft a set of leather armor from an animal or monster skin (one shift): armor rating is half the beast's (rounded up, minimum 1); WP equal to the armor rating." },
    { name: "Monster Hunter", req: "Beast Lore 12", wp: 3,
      text: "At a crossroads of some kind, activate to learn the direction of the most dangerous enemies." },
    { name: "Musician", req: "Performance 12", wp: 3,
      text: "An action in combat: give all allies within 10 m a boon to all rolls, OR all enemies within range a bane — choose one. Lasts until your turn next round. Instruments can extend range or reduce WP cost." },
    { name: "Pathfinder", req: "Bushcraft 12", wp: 1,
      text: "Boon to your BUSHCRAFT roll when trying to find the right direction in the wilderness." },
    { name: "Quartermaster", req: "Bushcraft 12", wp: 1,
      text: "Automatically succeed at making camp during journeys." },
    { name: "Robust", req: null, wp: null,
      text: "Your max HP increases by 2. Can be selected multiple times, without limit." },
    { name: "Sea Legs", req: "Swimming 12", wp: 1,
      text: "Activate (not an action) when acting in water, even waist-deep: you are safe from all negative effects of being in water for one round, including the risk of drowning." },
    { name: "Shield Block", req: "Any STR-based melee weapon skill 12", wp: 2,
      text: "When parrying with a shield, roll with a boon; you can also parry physical monster attacks (not area effects) that normally cannot be parried. Requires a shield. Combine with Defensive." },
    { name: "Throwing Arm", req: "Any melee weapon skill 12", wp: 2,
      text: "Throw a one-handed melee weapon at an enemy within STR meters. Roll the attack as normal; it can be parried or dodged. The weapon lands at the enemy's feet." },
    { name: "Treasure Hunter", req: "Bartering 12", wp: 3,
      text: "At a crossroads of some kind, activate to learn the direction of the greatest treasures." },
    { name: "Twin Shot", req: "Bows 12", wp: 3,
      text: "When attacking with a bow (not crossbow), shoot two arrows. Roll once to hit, with a bane. Damage rolled separately. Arrows may target the same or two different enemies." },
    { name: "Veteran", req: "Any weapon skill 12", wp: 1,
      text: "At the start of a combat round, retain your initiative card from the previous round instead of drawing a new one. Not an action." },
    { name: "Weasel", req: "Evade 12", wp: 3,
      text: "If you are attacked and have another PC within 2 m, let the attack hit that character instead. No effect against area attacks; activate before any dodge or parry. The new target may dodge or parry normally." }
  ],

  /* ----------------------------------------------------------------
   * SPELLS  (core game: General Magic + Animism / Elementalism / Mentalism)
   * Each school holds `tricks` (rank 0) and `spells` (rank 1+).
   * Spell fields: name, rank, prerequisite, requirement, castingTime,
   * range, duration, text. Casting a spell costs WP equal to its power
   * level (you may boost by spending extra WP per the rules).
   *
   * STATUS: General, Animism, Elementalism, and Mentalism COMPLETE.
   * ---------------------------------------------------------------- */
  spells: {
    general: {
      tricks: [
        { name: "Fetch",         text: "You make a loose object (no heavier than weight 1) within 10 meters float to you." },
        { name: "Flick",         text: "You give an object or creature within 10 meters a magical flick. The 'attack' inflicts 1 point of damage and can, for example, shatter glass." },
        { name: "Light",         text: "You create a bright light that shines from a focus of your choice. It illuminates a 10-meter radius around your focus and lasts for one shift. The light goes out if you reach 0 HP." },
        { name: "Open/Close",    text: "You open or close an unlocked door within 10 meters that you can see." },
        { name: "Repair Clothes",text: "Clothes belonging to you or someone else within 10 meters are instantly repaired and cleaned." },
        { name: "Sense Magic",   text: "You can sense whether the place you are in, or an item you are holding, is affected by magic — and if so, what kind." }
      ],
      spells: [
        { name: "Dispel", rank: 1, prerequisite: "Any school of magic", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "You cancel an ongoing spell of lower or equal power level. DISPEL can also be used to end other magical effects, if the adventure or GM allows it." },
        { name: "Protector", rank: 1, prerequisite: "Any school of magic", requirement: "Gesture, ingredient (something to draw with)", castingTime: "Action", range: "Touch", duration: "Shift",
          text: "You protect a person or place (no larger than a human) from magic; you can cast it on yourself. The power level of all spells cast at the target is reduced by the power level in PROTECTOR. Against magical monster attacks, each power level reduces the damage dice by 1." },
        { name: "Magic Shield", rank: 2, prerequisite: "Protector or Dispel", requirement: "Gesture", castingTime: "Reaction", range: "10 meters", duration: "Instant",
          text: "You interfere with a spell cast by another mage. A reaction that breaks initiative order but does not replace your action; cast after the opponent's success roll but before any damage/effect roll. If it succeeds, the opponent's spell power level decreases by your MAGIC SHIELD's power level (0 or less = no effect). Against magical monster attacks, each power level reduces the damage dice by 1." },
        { name: "Transfer", rank: 3, prerequisite: "Magic Shield", requirement: "Gesture", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "You steal WP from humanoid creatures or transfer your WP to someone else — up to twice the casting cost (4 at PL1, 8 at PL2, 12 at PL3). The WP used to cast are lost in the transfer. You can never exceed max WP or go below zero (same for the subject). If they refuse, you get a bane." },
        { name: "Magic Seal", rank: 4, prerequisite: "Transfer", requirement: "Word, gesture", castingTime: "Shift", range: "Touch", duration: "Permanent",
          text: "You bind a spell to an inanimate object; the power level of MAGIC SEAL sets the bound spell's power level (a magic trick needs PL 1). You decide how it is activated; activation uses WP from the activator. Can combine with CHARGE (object provides its own WP). Activating a bound spell dissolves the seal unless combined with PERMANENCE." },
        { name: "Charge", rank: 4, prerequisite: "Transfer", requirement: "Word, gesture", castingTime: "Stretch", range: "Touch", duration: "Shift",
          text: "You transfer your WP into an inanimate object that acts as a battery (up to 10 WP per power level). Anyone touching it can use its WP. After one shift the charge dissipates unless combined with PERMANENCE. Can combine with MAGIC SEAL." },
        { name: "Permanence", rank: 5, prerequisite: "Magic Seal", requirement: "Word, gesture", castingTime: "Shift", range: "Touch", duration: "Permanent",
          text: "Combined with another spell to make it permanent. Costs the mage one point of WIL permanently (reducing max WP by one). Its power level must equal that of the spell made permanent. Cannot be added to instant-duration spells. Combined with MAGIC SEAL, the seal becomes permanent and the bound spell can be activated any number of times." }
      ]
    },
    animism: {
      tricks: [
        { name: "Birdsong",     text: "You are surrounded by lovely birdsong for one stretch. The birds give you a boon to AWARENESS. Works only outdoors." },
        { name: "Clean",        text: "The room you are in is cleaned. All dust and dirt disappear, and the room is put in order." },
        { name: "Cook Food",    text: "You automatically succeed at cooking food without a BUSHCRAFT roll, and it happens instantly (one action)." },
        { name: "Floral Trail", text: "Beautiful flowers sprout where you walk. The flowers wither after a shift." },
        { name: "Hairstyle",    text: "You change the color, length, and style of your hair as you see fit. In some situations this can give a boon to BLUFFING and PERSUASION rolls." }
      ],
      spells: [
        { name: "Animal Whisperer", rank: 1, prerequisite: "Animism", requirement: "Word", castingTime: "Stretch", range: "2 meters", duration: "Instant",
          text: "You can talk to a bird or mammal, asking a number of questions equal to the power level. Animals relate what they have seen, heard, or smelled — they don't perceive the world as humanoids do, so answers are hard to interpret, but they never lie." },
        { name: "Banish", rank: 1, prerequisite: "Animism", requirement: "Word, gesture, focus (holy symbol)", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Demons and undead rising from their graves violate the natural order. Inflicts 2D8 damage on such a being; each additional power level +D8. Armor and natural armor have no effect; cannot be dodged or parried." },
        { name: "Ensnaring Roots", rank: 1, prerequisite: "Animism", requirement: "Gesture, ingredient (branches or roots nearby)", castingTime: "Action", range: "10 meters", duration: "Shift",
          text: "The victim is ensnared by roots and branches, unable to move. Breaking free requires an EVADE roll — boon at PL1, normal at PL2, bane at PL3. Each attempt is an action; one attempt per round, but others can help. Does not work on monsters." },
        { name: "Lightning Flash", rank: 1, prerequisite: "Animism", requirement: "Gesture", castingTime: "Action", range: "30 meters", duration: "Instant",
          text: "You call down a flash of lightning. Target takes 2D6 damage; it then arcs to another random target within 2 m for 2D4. Each power level beyond the first adds one die to each (3D6/3D4 at PL2). Metal armor has no effect; can be dodged or parried as a ranged attack (if so, no further target is hit). Indoors, WP cost is doubled." },
        { name: "Treat Wound", rank: 1, prerequisite: "Animism", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "You heal a living creature for 2D6 HP (self ok). Each power level beyond the first heals an additional D6 HP." },
        { name: "Engulfing Forest", rank: 2, prerequisite: "Ensnaring Roots", requirement: "Gesture, ingredient (branches or roots nearby)", castingTime: "Action", range: "10 meters (sphere)", duration: "Shift",
          text: "Thickets of thorns and roots shoot up in the area, which becomes rough terrain. Everyone except you (not monsters) in the area when cast is ensnared and unable to move. Breaking free requires an EVADE roll — boon at PL1, normal at PL2, bane at PL3. One attempt per round; unensnared others can help." },
        { name: "Heal Wound", rank: 2, prerequisite: "Treat Wound", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "You heal a living creature for 2D8 HP and one non-permanent severe injury (self ok). Each power level beyond the first heals an additional D8 HP." },
        { name: "Purge", rank: 2, prerequisite: "Banish", requirement: "Word, gesture, focus (holy symbol)", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "You exorcise a demon or undead, inflicting 2D10 damage. Each power level +D10. Armor and natural armor have no effect; cannot be dodged or parried." },
        { name: "Restoration", rank: 3, prerequisite: "Heal Wound", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "You heal a living creature for 2D10 HP and any one severe injury (self ok). Each power level beyond the first heals an additional D10 HP." },
        { name: "Resurrection", rank: 3, prerequisite: "Heal Wound", requirement: "Word, gesture, ingredient (corpse)", castingTime: "Shift", range: "Touch", duration: "Permanent",
          text: "Resurrect a dead person — truly alive, not undead. Costs the mage one point of WIL permanently (reducing max WP by one). Difficulty scales with time since death: within a shift = PL1, within a day = PL2, within a week = PL3; over a week, too decomposed. Only one attempt — if it fails, the victim is permanently dead. The revived person loses D3 skill levels in all CHA-based skills (minimum 3)." }
      ]
    },
    elementalism: {
      tricks: [
        { name: "Heat/Chill",   text: "The area within 10 meters of you becomes pleasantly warm or cold. The effect protects against cold for one shift." },
        { name: "Ignite",       text: "You light or extinguish a candle, torch, or lantern within 10 meters." },
        { name: "Puff of Smoke",text: "An impressive puff of smoke erupts in front of you. Popular for dramatic entrances; can give a boon to SNEAKING in certain situations (GM's call)." }
      ],
      spells: [
        { name: "Fireball", rank: 1, prerequisite: "Elementalism", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Sends a fireball from your hand or focus; can be dodged or parried as a ranged attack. 2D6 damage on a hit and sets fire to flammable objects. Each power level beyond the first adds D6 OR creates another fireball that hits another target within range." },
        { name: "Frost", rank: 1, prerequisite: "Elementalism", requirement: "Word, gesture", castingTime: "Action", range: "4 meters (sphere)", duration: "Stretch",
          text: "Drastically lowers the temperature. All natural fires in the area are extinguished; all living creatures lose D6 HP and D6 WP and become cold (cannot heal HP/WP until warm). Humanoids (not monsters) in the area when cast are frozen in place — cannot move or act (not even reactions); each turn a STR roll (not an action) breaks free. Each power level adds 4 m range. Any water freezes (an ice floe to walk on or raft)." },
        { name: "Gust of Wind", rank: 1, prerequisite: "Elementalism", requirement: "Word, gesture", castingTime: "Action", range: "10 meters (cone)", duration: "Instant",
          text: "Summons a great gust of wind. Untethered objects and creatures up to human size are pushed 2D4 m away and take that much bludgeoning damage. Against a swarm it deals 2D6. Each power level adds one die. No effect on Large or Huge monsters." },
        { name: "Pillar", rank: 1, prerequisite: "Elementalism", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Shift",
          text: "Raises a pillar 3 m high and 1 m wide from the ground or a stone floor. Anyone standing there must make an ACROBATICS roll (not an action) to avoid falling off; under a low ceiling, a failed roll means 2D6 bludgeoning damage instead. Each power level adds 3 m of height (possible falling damage)." },
        { name: "Shatter", rank: 1, prerequisite: "Elementalism", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "By breaking the bond holding matter together, you shatter physical objects: 2D10 damage to an inanimate, non-magical item, ignoring any armor rating. Each power level beyond the first adds D10." },
        { name: "Fire Blast", rank: 2, prerequisite: "Fireball", requirement: "Word, gesture", castingTime: "Action", range: "30 meters", duration: "Instant",
          text: "Sends a large fire blast; can be dodged or parried as a ranged attack. 2D8 damage on a hit and sets fire to flammables. Each power level beyond the first adds D8 OR creates another blast that hits another target within range." },
        { name: "Stone Shield", rank: 2, prerequisite: "Pillar", requirement: "Gesture, ingredient (pebbles)", castingTime: "Reaction", range: "Personal", duration: "Instant",
          text: "Instantly summon a shield of stone that decreases an incoming attack's damage by 2D6. Each power level adds D6. Cast after the roll to hit, but before damage. Can be combined with armor." },
        { name: "Stonewall", rank: 2, prerequisite: "Pillar", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Shift",
          text: "Raises a wall from the ground or stone floor — 1 m thick, 2 m high, 3 m wide. Each power level adds another same-size section. Anyone in that spot makes an ACROBATICS roll (not an action) to avoid falling off; under a low ceiling, a failed roll means 2D6 bludgeoning." },
        { name: "Tidal Wave", rank: 2, prerequisite: "Frost", requirement: "Word, gesture, ingredient (water source)", castingTime: "Action", range: "20 meters (cone)", duration: "Instant",
          text: "Summon a great wave from a water source within range; the area of effect starts at the source, not at you. Untethered objects and creatures are pushed 2D6 m away from the source and take that much bludgeoning damage. Each power level adds one die." },
        { name: "Whirlwind", rank: 2, prerequisite: "Gust of Wind", requirement: "Word, gesture", castingTime: "Action", range: "4 meters (sphere)", duration: "Instant",
          text: "Creates a mighty whirlwind around you. Untethered objects and creatures up to human size are hurled 2D4 m away, take that much bludgeoning damage, and land prone. Each power level adds 4 m range and D4 damage. If you take a bane on the roll, you may instead hurl one person in range to another spot within range, choosing whether they take damage and land prone." },
        { name: "Firestorm", rank: 3, prerequisite: "Fire Blast and Whirlwind", requirement: "Word, gesture", castingTime: "Action", range: "4 meters (sphere)", duration: "Instant",
          text: "Creates a whirling storm of fire around you. All targets in range suffer 2D6 damage. Each power level adds 4 m range and another D6 damage." },
        { name: "Gnome", rank: 3, prerequisite: "Stonewall", requirement: "Word, gesture, ingredient (stone or soil)", castingTime: "Stretch", range: "4 meters", duration: "Stretch",
          text: "Summons an earth elemental — a humanoid of gray-brown sand or clay; counts as a monster. Follows your commands (free action), acts on its own initiative, but must stay within sight. [Movement 8, HP 5 per power level, Armor 4; Fists of stone hit automatically in melee (can be dodged/parried) for D6 bludgeoning per power level. Can cast PILLAR at its power level using the mage's WP.]" },
        { name: "Salamander", rank: 3, prerequisite: "Fire Blast", requirement: "Word, gesture, ingredient (open fire)", castingTime: "Stretch", range: "4 meters", duration: "Stretch",
          text: "Summons a fire elemental — a lizard of fire; counts as a monster. Follows your commands. [Movement 12, HP 5 per power level, Armor —; Flaming grip hits automatically in melee (can be dodged) for D6 per power level, armor no effect. Can cast FIRE BLAST at its power level using the mage's WP. Piercing damage halved; immune to fire damage, including magical fire.]" },
        { name: "Sylph", rank: 3, prerequisite: "Whirlwind", requirement: "Word, gesture", castingTime: "Stretch", range: "4 meters", duration: "Stretch",
          text: "Summons a wind elemental — a storm cloud shaped like a bird; counts as a monster. Follows your commands (free action), acts on its own initiative, but must stay within sight. [Movement 24, HP 5 per power level, Armor —; Howling winds hit automatically in melee (can be dodged), hurling the victim D4 m per power level and dealing that much bludgeoning. Can cast GUST OF WIND at its power level using the mage's WP. Piercing damage halved.]" },
        { name: "Undine", rank: 3, prerequisite: "Tidal Wave", requirement: "Word, gesture, ingredient (water)", castingTime: "Stretch", range: "4 meters", duration: "Stretch",
          text: "Summons a water elemental — a tidal wave whose crest is shaped like a woman of water; counts as a monster. Follows your commands (free action), acts on its own initiative, but must stay within sight. [Movement 12, HP 5 per power level, Armor —; Wet embrace hits automatically in melee (can be dodged) for D6 per power level, armor no effect. Can cast TIDAL WAVE at its power level using the mage's WP. Piercing damage halved.]" }
      ]
    },
    mentalism: {
      tricks: [
        { name: "Lock/Unlock", text: "Your touch locks or unlocks a non-magical lock." },
        { name: "Magic Stool", text: "You create a round surface, roughly half a meter in diameter and height, to sit on or put things on. Lasts until you leave." },
        { name: "Slow Fall",   text: "You slow your fall and land as light as a feather, no matter the height." }
      ],
      spells: [
        { name: "Farsight", rank: 1, prerequisite: "Mentalism", requirement: "Word, gesture", castingTime: "Action", range: "1 kilometer", duration: "Concentration",
          text: "See and hear what is happening in a place up to 1 km away, as if you were there. You must have the place in sight or have visited it before. Each power level multiplies range tenfold (10 km at PL2, 100 km at PL3). Cannot peer into other dimensions." },
        { name: "Levitate", rank: 1, prerequisite: "Mentalism", requirement: "Word, gesture", castingTime: "Action", range: "6 meters", duration: "Instant",
          text: "Levitate yourself or another person/object up to human size, floating it up to 6 m in any direction, after which it lands gently or drops (you decide). Each power level adds 2 m or an additional target. You get a bane levitating an unwilling creature." },
        { name: "Longstrider", rank: 1, prerequisite: "Mentalism", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "The target's movement rating is doubled for the duration (self ok). Each power level lets you cast it on another person." },
        { name: "Power Fist", rank: 1, prerequisite: "Mentalism", requirement: "Word, gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "The damage of your unarmed attacks increases by D6 per power level." },
        { name: "Stone Skin", rank: 1, prerequisite: "Mentalism", requirement: "Word, gesture, ingredient (stone)", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "The target's skin turns hard and gray, gaining armor rating 4. Each power level beyond the first adds 2 more. If wearing armor, only the highest armor rating counts." },
        { name: "Divination", rank: 2, prerequisite: "Farsight", requirement: "Word, gesture", castingTime: "Action", range: "100 meters", duration: "Instant",
          text: "Specify an item, substance, creature/type, or phenomenon. The spell shows the direction to the nearest such target within range. Each power level doubles the range (200 m, 400 m)." },
        { name: "Enchant Weapon", rank: 2, prerequisite: "Power Fist", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Enchant a weapon so that a result of 1–2 counts as a Dragon roll when attacking or parrying with it; the weapon also counts as magical. Each power level widens the Dragon range by 1 (1–3 at PL2, 1–4 at PL3)." },
        { name: "Mental Strike", rank: 2, prerequisite: "Power Fist", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Project your mental power as a physical strike: hurls the victim 2D6 m away and inflicts that much damage. Each power level adds D6. Can be dodged or parried as a ranged attack." },
        { name: "Scrying", rank: 2, prerequisite: "Farsight", requirement: "Gesture", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Gain knowledge of past events that occurred where you are, even if none alive remember. You gaze up to a day back at PL1, a year at PL2, centuries at PL3. Visions are cryptic and fragmented — the GM decides what you see." },
        { name: "Telepathy", rank: 2, prerequisite: "Farsight", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Read the surface thoughts of another person. Accessing deeper memories requires PL2 or more depending on how fresh the memory is (GM's call). You can also send your own thoughts to another person." },
        { name: "Dominate", rank: 3, prerequisite: "Telepathy", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Take complete control of another person's actions. Make an opposed roll against the victim's WIL (NPCs roll vs max WP if listed, −2 per level of Focused; else vs 10). You get a bane at PL1, roll normally at PL2, a boon at PL3. On a win, the victim immediately makes a movement and an action of your choice (except any action that spends WP) and loses their next turn. No effect on monsters." },
        { name: "Flight", rank: 3, prerequisite: "Levitate", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Give yourself or another creature up to human size the ability to fly freely with Movement rating 6. At PL2 it doubles to 12, at PL3 to 24. The flyer ignores all obstacles and is unaffected by terrain." },
        { name: "Teleport", rank: 3, prerequisite: "Farsight", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "Teleport yourself up to 100 meters. You must be able to see the destination or have visited it before. For each power level beyond the first, bring another human-sized creature you touch, or double the range. Cannot travel between dimensions." }
      ]
    }
  },

  /* ----------------------------------------------------------------
   * EQUIPMENT
   * Weapon fields: name, skill (governing weapon skill), type
   * ("melee"|"ranged"|"shield"), str (STR requirement, null = none),
   * grip ("1H"|"2H"|"—"), range (ranged, meters), damage, durability
   * (null = "—"), cost, features[].
   * Weight: 1H weapons & shields = 1, 2H = 2 (per core rules) — derive
   * in app from `grip` unless a future weight column is added.
   *
   * STATUS: weapons, shields, armor, gear, and starting packages COMPLETE.
   * ---------------------------------------------------------------- */
  weapons: [
    // Knives (AGL)
    { name: "Knife",            skill: "Knives", type: "melee", str: null, grip: "1H", damage: "D8",   durability: 6,  cost: "5 silver", features: ["subtle","piercing","can be thrown"] },
    { name: "Dagger",           skill: "Knives", type: "melee", str: null, grip: "1H", damage: "D8",   durability: 9,  cost: "1 gold",   features: ["subtle","piercing","slashing","can be thrown"] },
    { name: "Parrying Dagger",  skill: "Knives", type: "melee", str: null, grip: "1H", damage: "D6",   durability: 15, cost: "2 gold",   features: ["subtle","piercing","slashing"] },
    // Swords (STR)
    { name: "Short Sword",      skill: "Swords", type: "melee", str: 7,    grip: "1H", damage: "D10",  durability: 12, cost: "8 gold",   features: ["piercing","slashing"] },
    { name: "Broadsword",       skill: "Swords", type: "melee", str: 10,   grip: "1H", damage: "2D6",  durability: 15, cost: "12 gold",  features: ["piercing","slashing"] },
    { name: "Longsword",        skill: "Swords", type: "melee", str: 13,   grip: "1H", damage: "2D8",  durability: 15, cost: "25 gold",  features: ["piercing","slashing"] },
    { name: "Greatsword",       skill: "Swords", type: "melee", str: 16,   grip: "2H", damage: "2D10", durability: 15, cost: "50 gold",  features: ["piercing","slashing"] },
    { name: "Scimitar",         skill: "Swords", type: "melee", str: 10,   grip: "1H", damage: "2D6",  durability: 12, cost: "10 gold",  features: ["toppling","slashing"] },
    // Axes (STR)
    { name: "Handaxe",          skill: "Axes",   type: "melee", str: 7,    grip: "1H", damage: "2D6",  durability: 9,  cost: "2 gold",   features: ["toppling","slashing","can be thrown"] },
    { name: "Battleaxe",        skill: "Axes",   type: "melee", str: 13,   grip: "1H", damage: "2D8",  durability: 9,  cost: "10 gold",  features: ["toppling","slashing"] },
    { name: "Two-Handed Axe",   skill: "Axes",   type: "melee", str: 16,   grip: "2H", damage: "2D10", durability: 9,  cost: "25 gold",  features: ["toppling","slashing"] },
    // Hammers (STR) — incl. wooden clubs (bludgeoning)
    { name: "Mace",             skill: "Hammers",type: "melee", str: 7,    grip: "1H", damage: "2D4",  durability: 12, cost: "8 gold",   features: ["bludgeoning"] },
    { name: "Morningstar",      skill: "Hammers",type: "melee", str: 13,   grip: "1H", damage: "2D8",  durability: 12, cost: "14 gold",  features: ["bludgeoning"] },
    { name: "Flail",            skill: "Hammers",type: "melee", str: 13,   grip: "1H", damage: "2D8",  durability: null,cost: "16 gold", features: ["bludgeoning","toppling","cannot be used for parrying"] },
    { name: "Warhammer, Light", skill: "Hammers",type: "melee", str: 10,   grip: "1H", damage: "2D6",  durability: 12, cost: "10 gold",  features: ["bludgeoning","toppling"] },
    { name: "Warhammer, Heavy", skill: "Hammers",type: "melee", str: 16,   grip: "2H", damage: "2D10", durability: 12, cost: "20 gold",  features: ["bludgeoning","toppling"] },
    { name: "Wooden Club, Small",skill:"Hammers",type: "melee", str: 7,    grip: "1H", damage: "D8",   durability: 9,  cost: "1 silver", features: ["bludgeoning"] },
    { name: "Wooden Club, Large",skill:"Hammers",type: "melee", str: 16,   grip: "2H", damage: "2D8",  durability: 12, cost: "2 silver", features: ["bludgeoning"] },
    // Spears (STR)
    { name: "Short Spear",      skill: "Spears", type: "melee", str: 7,    grip: "1H", damage: "D10",  durability: 9,  cost: "5 silver", features: ["piercing","can be thrown"] },
    { name: "Long Spear",       skill: "Spears", type: "melee", str: 10,   grip: "2H", damage: "2D8",  durability: 9,  cost: "1 gold",   features: ["long","piercing"] },
    { name: "Lance",            skill: "Spears", type: "melee", str: 13,   grip: "1H", damage: "2D10", durability: 12, cost: "12 gold",  features: ["long","piercing","requires combat trained mount"] },
    { name: "Halberd",          skill: "Spears", type: "melee", str: 13,   grip: "2H", damage: "2D8",  durability: 12, cost: "20 gold",  features: ["long","toppling","piercing","slashing"] },
    { name: "Trident",          skill: "Spears", type: "melee", str: 10,   grip: "1H", damage: "2D6",  durability: 9,  cost: "5 gold",   features: ["toppling","piercing","can be thrown"] },
    // Staves (AGL)
    { name: "Staff",            skill: "Staves", type: "melee", str: 7,    grip: "2H", damage: "D8",   durability: 9,  cost: "2 silver", features: ["bludgeoning","toppling"] },
    // Brawling (STR) — unarmed & improvised
    { name: "Unarmed",          skill: "Brawling",type:"melee", str: null, grip: "—",  damage: "D6",   durability: null,cost: "—",       features: ["bludgeoning"] },
    { name: "Blunt Object, Light",skill:"Brawling",type:"melee",str: null, grip: "1H", damage: "D8",   durability: 3,  cost: "—",        features: ["bludgeoning","can be thrown"] },
    { name: "Blunt Object, Heavy",skill:"Brawling",type:"melee",str: 16,   grip: "2H", damage: "2D8",  durability: 3,  cost: "—",        features: ["bludgeoning"] },
    // Ranged
    { name: "Sling",            skill: "Slings",   type: "ranged", str: null, grip: "1H", range: 20,  damage: "D8",  durability: null,cost: "1 silver", features: ["bludgeoning","tiny item"] },
    { name: "Short Bow",        skill: "Bows",     type: "ranged", str: 7,    grip: "2H", range: 30,  damage: "D10", durability: 3,   cost: "25 gold",  features: ["piercing","requires quiver"] },
    { name: "Longbow",          skill: "Bows",     type: "ranged", str: 13,   grip: "2H", range: 100, damage: "D12", durability: 6,   cost: "50 gold",  features: ["piercing","requires quiver"] },
    { name: "Crossbow, Light",  skill: "Crossbows",type: "ranged", str: 7,    grip: "2H", range: 40,  damage: "2D6", durability: 6,   cost: "75 gold",  features: ["piercing","requires quiver","no damage bonus"] },
    { name: "Crossbow, Heavy",  skill: "Crossbows",type: "ranged", str: 13,   grip: "2H", range: 60,  damage: "2D8", durability: 9,   cost: "200 gold", features: ["piercing","requires quiver","no damage bonus"] },
    { name: "Crossbow, Hand",   skill: "Crossbows",type: "ranged", str: 7,    grip: "1H", range: 30,  damage: "2D6", durability: 6,   cost: "90 gold",  features: ["piercing","requires quiver","no damage bonus"] },
    // Shields (parried using the wielded weapon skill)
    { name: "Shield, Small",    skill: null, type: "shield", str: 7,  grip: "1H", damage: "D8", durability: 15, cost: "4 gold",  features: ["bludgeoning"] },
    { name: "Shield, Large",    skill: null, type: "shield", str: 13, grip: "1H", damage: "D8", durability: 18, cost: "12 gold", features: ["bludgeoning"] }
  ],

  // Mastercrafted weapons/shields: ×10 cost, reduce STR requirement by 3,
  // increase durability by 3.
  mastercrafted: { costMultiplier: 10, strRequirementMod: -3, durabilityMod: +3 },

  // `banes`: skills that take a bane while this armor is worn (structured for
  // the dice engine). `metal`: true if it interferes with spellcasting.
  armor: [
    { name: "Leather",         rating: 1, cost: "2 gold",   supply: "Common",   effect: null, banes: [], metal: false },
    { name: "Studded Leather", rating: 2, cost: "10 gold",  supply: "Uncommon", effect: "Bane on SNEAKING rolls.", banes: ["Sneaking"], metal: false },
    { name: "Chainmail",       rating: 4, cost: "50 gold",  supply: "Uncommon", effect: "Bane on EVADE and SNEAKING rolls.", banes: ["Evade","Sneaking"], metal: true },
    { name: "Plate Armor",     rating: 6, cost: "500 gold", supply: "Rare",     effect: "Bane on ACROBATICS, EVADE, and SNEAKING rolls.", banes: ["Acrobatics","Evade","Sneaking"], metal: true }
  ],

  // `rangedBane`: a worn helmet that banes all ranged attacks (applied in the dice engine).
  helmets: [
    { name: "Open Helmet", rating: 1, cost: "12 gold",  supply: "Uncommon", effect: "Bane on AWARENESS rolls.", banes: ["Awareness"], metal: true, rangedBane: false },
    { name: "Great Helm",  rating: 2, cost: "100 gold", supply: "Rare",     effect: "Bane on AWARENESS rolls and all ranged attacks.", banes: ["Awareness"], metal: true, rangedBane: true }
  ],

  /* General adventuring gear.
   * weight: encumbrance units (0 = tiny item, does not count; 0.25 = field ration). */
  gear: [
    // Containers
    { name: "Backpack",        cost: "3 gold",   weight: 0,    category: "container", effect: "Increases carrying capacity by 2. Only one backpack at a time." },
    { name: "Barrel",          cost: "2 gold",   weight: 2,    category: "container", effect: "Holds up to 15 weight units. 10 HP, armor rating 3." },
    { name: "Basket",          cost: "4 silver", weight: 1,    category: "container", effect: "Holds up to 10 weight units." },
    { name: "Bottle",          cost: "1 gold",   weight: 1,    category: "container", effect: "Contains 1 unit of liquid." },
    { name: "Bucket",          cost: "5 copper", weight: 1,    category: "container", effect: "Contains up to 5 units of liquid." },
    { name: "Chest",           cost: "5 gold",   weight: 3,    category: "container", effect: "Holds up to 20 weight units. 25 HP, armor rating 5." },
    { name: "Clay Jug",        cost: "5 silver", weight: 1,    category: "container", effect: "Contains 1 unit of liquid." },
    { name: "Saddle Bag",      cost: "6 gold",   weight: 0,    category: "container", effect: "Increases an animal's carrying capacity by 2 (max two per animal)." },
    // Light sources
    { name: "Flint & Tinder",  cost: "5 silver", weight: 0,    category: "light", effect: "Required to light torches, candles, or lanterns, and to make a fire." },
    { name: "Torch",           cost: "5 copper", weight: 1,    category: "light", lightDie: 6, effect: "Illuminates a 10 m radius. Burns up to a shift; roll D6 each stretch (or if used as a weapon), on 1 it goes out." },
    { name: "Lantern",         cost: "10 gold",  weight: 1,    category: "light", lightDie: 8, effect: "Illuminates a 10 m radius. Burns up to a shift; roll D8 each stretch, on 1 it goes out (refill & relight = action)." },
    { name: "Oil Lamp",        cost: "1 gold",   weight: 1,    category: "light", lightDie: 6, effect: "Illuminates a 10 m radius. Burns up to a shift; roll D6 each stretch, on 1 it goes out." },
    { name: "Lamp Oil (10 doses)", cost: "3 silver", weight: 1,category: "light", effect: "Each dose keeps an oil lamp or lantern burning up to a shift." },
    { name: "Tallow Candle",   cost: "1 copper", weight: 0,    category: "light", lightDie: 4, effect: "Illuminates a 4 m radius. Burns up to a shift; roll D4 each stretch or if the bearer attacks/is attacked, on 1 it goes out." },
    // Adventuring gear & trade goods
    { name: "Field Ration",    cost: "1 silver", weight: 0.25, category: "gear", effect: "Consume one per day or become hungry." },
    { name: "Sleeping Fur",    cost: "1 gold",   weight: 1,    category: "gear", effect: "Required to avoid a bane on BUSHCRAFT rolls for making camp." },
    { name: "Tent, Small",     cost: "2 gold",   weight: 2,    category: "gear", effect: "Up to 2 people. Boon on BUSHCRAFT rolls for making camp (one rolls, others help)." },
    { name: "Tent, Large",     cost: "4 gold",   weight: 4,    category: "gear", effect: "Up to 6 people. Boon on BUSHCRAFT rolls for making camp." },
    { name: "Rope, Hemp (10 m)", cost: "1 gold", weight: 1,    category: "gear", effect: "Boon on ACROBATICS rolls for climbing if secured to something." },
    { name: "Rope, Silk (10 m)", cost: "10 gold",weight: 0,    category: "gear", effect: "Boon on ACROBATICS rolls for climbing if secured to something." },
    { name: "Grappling Hook",  cost: "3 gold",   weight: 1,    category: "gear", effect: "Secures a rope. Can be thrown & secured with ACROBATICS up to STR meters (STR×2 with a bane)." },
    { name: "Lockpicks, Simple",   cost: "1 gold",  weight: 1,category: "gear", effect: "Required to avoid a bane on SLEIGHT OF HAND rolls for picking locks." },
    { name: "Lockpicks, Advanced", cost: "20 gold", weight: 1,category: "gear", effect: "Boon on SLEIGHT OF HAND rolls for picking locks." },
    { name: "Map",             cost: "5 gold",   weight: 0,    category: "gear", effect: "Required to avoid a bane on BUSHCRAFT rolls for leading the way." },
    { name: "Spyglass",        cost: "50 gold",  weight: 1,    category: "gear", effect: "Boon on BUSHCRAFT rolls for leading the way during journeys." },
    { name: "Blanket",         cost: "5 silver", weight: 1,    category: "gear", effect: "Required to avoid a bane on rolls to resist cold." },
    { name: "Field Kitchen",   cost: "4 gold",   weight: 2,    category: "gear", effect: "Boon on BUSHCRAFT rolls for cooking." },
    { name: "Magnifying Glass",cost: "30 gold",  weight: 1,    category: "gear", effect: "Boon on SPOT HIDDEN rolls." },
    { name: "Padlock",         cost: "10 gold",  weight: 0,    category: "gear", effect: "Locks a door or chest. 20 HP, armor rating 5." },
    { name: "Whistle",         cost: "5 silver", weight: 0,    category: "gear", effect: "Can be heard up to 100 m away." },
    { name: "Marbles",         cost: "1 gold",   weight: 1,    category: "gear", effect: "Thrown at a humanoid within 10 m (action); next turn the enemy must EVADE (not an action) to move." },
    { name: "Perfume (10 doses)", cost: "5 gold",weight: 1,    category: "gear", effect: "Boon on CHA-based skill rolls when the GM finds it reasonable." },
    { name: "Quiver of Arrows, Iron Head", cost: "2 gold", weight: 1, category: "gear", effect: "Required to fire bows or crossbows." },
    { name: "Quiver of Arrows, Wooden Head", cost: "5 silver", weight: 1, category: "gear", effect: "Required to fire bows or crossbows; armor effectiveness is doubled against them." },
    { name: "Saddle",          cost: "10 gold",  weight: 1,    category: "gear", effect: "Required to avoid a bane when fighting from horseback." },
    { name: "Simple Clothes",  cost: "5 silver", weight: 0,    category: "gear", effect: "Required to avoid a bane on CHA-based skills." },
    // Studies & magic foci
    { name: "Amulet",          cost: "3 gold",   weight: 0,    category: "magic", effect: "Can be used as a focus for spells." },
    { name: "Brooch",          cost: "5 gold",   weight: 0,    category: "magic", effect: "Can be used as a focus for spells." },
    { name: "Chalk",           cost: "1 copper", weight: 0,    category: "magic", effect: "Can be used as a focus for spells." },
    { name: "Book",            cost: "25 gold",  weight: 1,    category: "magic", effect: "Boon on skill rolls in a specific subject (cost varies by subject)." },
    { name: "Grimoire",        cost: "50 gold",  weight: 1,    category: "magic", effect: "A mage's spellbook listing all known spells (cost varies)." },
    // Medicine
    { name: "Bandages (10)",   cost: "5 silver", weight: 1,    category: "medicine", effect: "Required to avoid a bane on HEALING rolls for saving lives; each attempt consumes a bandage." },
    { name: "Healing Potion (dose)", cost: "50 gold", weight: 1, category: "medicine", effect: "Instantly heals 2D6 HP. Stronger potions heal more but cost more." },
    { name: "Herbal Concoction (dose)", cost: "1 gold", weight: 1, category: "medicine", effect: "Boon on HEALING rolls for resisting disease." },
    { name: "Surgical Instruments", cost: "15 gold", weight: 1, category: "medicine", effect: "Boon on HEALING rolls for saving a life." },
    { name: "Poison, Lethal (dose)",    cost: "2 gold × potency",  weight: 1, category: "medicine", effect: "See poison rules." },
    { name: "Poison, Paralyzing (dose)",cost: "12 silver × potency",weight:1, category: "medicine", effect: "See poison rules." },
    { name: "Poison, Sleeping (dose)",  cost: "6 silver × potency", weight: 1, category: "medicine", effect: "See poison rules." },
    // Tools
    { name: "Crowbar",         cost: "2 gold",   weight: 1,    category: "tool", effect: "2D6 damage against a door or wall (auto-hit, no risk to the tool)." },
    { name: "Hammer",          cost: "1 gold",   weight: 1,    category: "tool", effect: "2D4 damage against a door or wall (auto-hit)." },
    { name: "Sledgehammer",    cost: "3 gold",   weight: 2,    category: "tool", effect: "2D10 damage against a door or wall (auto-hit)." },
    { name: "Pickaxe",         cost: "3 gold",   weight: 1,    category: "tool", effect: "2D8 damage against a door or wall (auto-hit)." },
    { name: "Shovel",          cost: "2 gold",   weight: 1,    category: "tool", effect: "Reduces time spent digging by half." },
    { name: "Saw",             cost: "5 gold",   weight: 1,    category: "tool", effect: "Cuts metal or wood in one stretch." },
    { name: "Needle & Thread", cost: "3 silver", weight: 0,    category: "tool", effect: "Mends clothes with a CRAFTING roll." },
    { name: "Blacksmithing Tools", cost: "20 gold", weight: 1, category: "tool", effect: "Used for CRAFTING (and the Master Blacksmith ability)." },
    { name: "Carpentry Tools", cost: "8 gold",   weight: 1,    category: "tool", effect: "Used for CRAFTING (and the Master Carpenter ability)." },
    { name: "Tanning Tools",   cost: "5 gold",   weight: 1,    category: "tool", effect: "Used for CRAFTING (and the Master Tanner ability)." }
  ],

  /* Musical instruments (for the Musician heroic ability). */
  instruments: [
    { name: "Bagpipe", cost: "30 gold", weight: 1, effect: "Reduces the WP cost of the Musician ability to 1 and increases its range to 50 m." },
    { name: "Drum",    cost: "4 gold",  weight: 1, effect: "Increases the range of the Musician ability to 20 m." }
  ],

  /* Character creation name tables (kin first names + profession nicknames + NPC names). */
  names: {
    kin: {
      human: ["Joruna", "Tym", "Halvelda", "Garmander", "Verolun", "Lothar"],
      halfling: ["Snappy", "Brine", "Cottar", "Bumble", "Perrywick", "Theoline"],
      dwarf: ["Tinderrock", "Halwyld", "Tymolana", "Traut", "Urd", "Fermer"],
      elf: ["Arasin", "Illyriana", "Galvander", "Tyrindelia", "Erwilnor", "Andremone"],
      mallard: ["Qwucksum", "Splats", "Moggee", "Groddy", "Blisandina", "Hackleswell"],
      wolfkin: ["Wyld", "Wolfshadow", "Lunariem", "Obdurian", "Frostbite", "Wuldenhall"]
    },
    nicknames: {
      artisan: ["Stonehammer", "Woodcleaver", "Strongfist", "Barrelmaker", "Bridgebuilder", "Ironmaster"],
      bard: ["Odemaker", "Talespinner", "Silvervoice", "Gildenclef", "Honeytongue", "Rhymesmith"],
      fighter: ["Gravemaker", "Skullcrusher", "Ironblade", "Bloodsoaked", "Shieldbreaker", "The Undefeated"],
      hunter: ["Forest Fox", "Wolfbane", "Pathfinder", "The Weathered", "Bloodhunger", "Shadowbolt"],
      knight: ["Dragonheart", "Goldlance", "Griffinclaw", "The Noble", "Gleamhelm", "Mourningcloak"],
      mage: ["Rootheart", "Crookback", "Graycape", "Stormhand", "Stafflimper", "Shadowbringer"],
      mariner: ["Wavewalker", "Saltbeard", "Stormcaller", "Krakenbane", "Ironhull", "The Drowned"],
      merchant: ["Silvergrin", "Goldtooth", "Silktongue", "The Lisping and Truthful", "Lardbelly", "Skinflint"],
      scholar: ["Clearmind", "Dustlung", "Farsight", "The Lettered", "The All-Knowing", "The Plump and Learned"],
      thief: ["Halffinger", "Blackrat", "Redeye", "Quickfoot", "Doubletongue", "Nightstabber"]
    },
    npc: [
      ["Agnar", "Jorid", "Dareios"],
      ["Ragnfast", "Ask", "Euanthe"],
      ["Arnulf", "Tyra", "Xanthos"],
      ["Atle", "Liv", "Athalia"],
      ["Guthorm", "Embla", "Kleitos"],
      ["Botvid", "Ragna", "Astara"],
      ["Kale", "Turid", "Priamus"],
      ["Egil", "Jorunn", "Galyna"],
      ["Ingemund", "Borghild", "Taras"],
      ["Gudmund", "Gylla", "Zenais"],
      ["Grim", "Tora", "Hesiod"],
      ["Brand", "Edda", "Liene"],
      ["Folkvid", "Sigrun", "Eupraxia"],
      ["Germund", "Dagrun", "Taras"],
      ["Algot", "Bolla", "Lysandra"],
      ["Tolir", "Yrsa", "Kallias"],
      ["Hjorvald", "Estrid", "Isidora"],
      ["Ambjorn", "Signe", "Athos"],
      ["Grunn", "Tilde", "Larysa"],
      ["Olgrid", "Idun", "Nikias"]
    ]
  },

  /* Character creation flavor tables (weakness, memento, appearance). */
  flavor: {
    weakness: [
      "Gullible. I believe everything that others tell me.",
      "Greedy. I want a bigger share of all treasure.",
      "Thin-skinned. I never tolerate a provocation.",
      "Foolhardy. I always go first into danger.",
      "Fainthearted. I always stay at the back of the group.",
      "Monster Slayer. All monsters are evil and must be slain.",
      "Intolerant. Nightkin such as orcs and goblins are evil and need to be fought.",
      "Slothful. I take every chance to rest.",
      "Gluttonous. I take every chance I get to eat something tasty.",
      "Kleptomaniac. I can’t stop myself from stealing valuables.",
      "Vain. I’ll help anyone who gives me praise or compliments.",
      "Reckless. I always take big risks without thought of the consequences.",
      "Fearful of Magic. Magic is an evil force and mages cannot be trusted.",
      "Craving Knowledge. The hunt for knowledge is more important than my friends.",
      "Child of the Wild. I never sleep indoors.",
      "Boastful. I always exaggerate my accomplishments.",
      "Violent. I resort to violence to overcome every obstacle.",
      "Overbearing. I always tell others what to do.",
      "Pessimist. I always think things will turn out for the worst.",
      "Haughty. I look down on everyone I meet."
    ],
    memento: [
      "Your trusty old shoes",
      "A simple silver medallion",
      "A letter from an old friend or relative",
      "A ragged old journal",
      "A bracelet passed down in your family",
      "A wooden figurine you got as a child",
      "A strangely shaped stone",
      "A copper coin from a treasure sought by your mother or father",
      "An old pewter tankard",
      "A horn taken as a trophy from a monster",
      "A fang taken as a trophy from a beast",
      "A couple of simple dice made of bone",
      "A locket containing a lock of hair",
      "An ornate key",
      "A hand-drawn map you inherited",
      "A ring with an inscription",
      "A bone whistle",
      "Your mother’s or father’s ragged old hat",
      "A griffin feather",
      "A beautifully carved pipe"
    ],
    appearance: [
      "Ugly scar across your cheek",
      "Strange headgear",
      "Abnormally pale and pasty",
      "A constant smile on your lips",
      "Icy, penetrating gaze",
      "A bit of extra weight around the middle",
      "Thin and wiry",
      "Abnormal amounts of body hair (depending on kin)",
      "Balding (depending on kin)",
      "Prominent tattoo",
      "Foul body odor",
      "Glorious hairstyle",
      "Limp",
      "Filthy",
      "Honest blue eyes",
      "Silver tooth",
      "Heavily perfumed",
      "Different-colored eyes",
      "Hissing voice",
      "Weathered face"
    ]
  },

  /* End-of-session advancement questions. Each "yes" lets a player mark one
   * skill of their choice for advancement (in addition to Dragon/Demon marks). */
  /* Fear table (D6) — rolled when a WIL roll against a fear attack fails. */
  fearTable: [
    { d6: 1, effect: "Paralyzed by terror — you lose your next turn." },
    { d6: 2, effect: "Paralyzed — you can't act until you pass a WIL roll (one attempt per turn)." },
    { d6: 3, effect: "You drop whatever you are holding and recoil a step." },
    { d6: 4, effect: "You flee from the source of fear as fast as you can." },
    { d6: 5, effect: "You flee and cannot willingly approach the source this scene." },
    { d6: 6, effect: "Overcome — you act last and roll with a bane until the threat passes." }
  ],

  advancementQuestions: [
    "Did you take part in the game session?",
    "Did you explore a new, dangerous location?",
    "Did you defeat one or more dangerous opponents?",
    "Did you overcome an obstacle or solve a problem without using force?",
    "Did you do something heroic, foolhardy, or in line with your weakness?"
  ],

  /* Currency: 1 gold = 10 silver = 100 copper. Coins are tiny items;
   * 100+ coins count as 1 item per 100. */
  currency: { goldToSilver: 10, silverToCopper: 10, coinsPerItem: 100 }
};

// Export for both browser (global) and tooling (CommonJS).
if (typeof window !== "undefined") { window.DRAGONBANE = DRAGONBANE; }
if (typeof module !== "undefined" && module.exports) { module.exports = DRAGONBANE; }
