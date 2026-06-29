/*
 * data-pregens.js — Dragonbane pre-generated characters
 * -----------------------------------------------------
 * The five ready-to-play characters from the Dragonbane Core Set. Used by the
 * "Use a pre-gen" option to instantiate a playable character instantly.
 *
 * Source: Dragonbane Core Set pre-generated character sheets, via the project's
 * NotebookLM notebook (source id b6c317d4-9b67-41b7-a048-e453d17d9618).
 *
 * Each entry holds the sheet's final values (attributes already include age
 * modifiers). The app derives HP/WP/movement/damage bonus and skill levels
 * (trained = 2× base chance) from these, exactly matching the printed sheets.
 *
 * Fields: name, kin (key), profession (key), mageSchool (key|null), age (key),
 * attributes, trained[] (skill names), heroic (heroic-ability name | null —
 * kin innate abilities are added automatically), spells {tricks[], known[]}
 * (mage only), weapons[], armor, helmet, gear[], weakness, appearance, memento,
 * blurb (one-line flavor).
 *
 * Exposed as the global `DRAGONBANE_PREGENS`.
 */

const DRAGONBANE_PREGENS = [
  {
    name: "Archmaster Aodhan", kin: "human", profession: "mage", mageSchool: "elementalism", age: "old",
    attributes: { STR: 8, CON: 11, AGL: 9, INT: 16, WIL: 18, CHA: 14 },
    trained: ["Awareness","Beast Lore","Bushcraft","Elementalism","Evade","Healing","Languages","Myths & Legends","Persuasion","Sneaking","Spot Hidden","Staves"],
    heroic: null,
    spells: { tricks: ["Heat/Chill","Puff of Smoke","Ignite"], known: ["Fireball","Pillar","Gust of Wind"] },
    weapons: ["Staff"], armor: null, helmet: null,
    gear: ["Spellbook","Torch","Flint & Tinder"],
    weakness: "Fainthearted. You always stay at the back of the group.",
    appearance: "Bushy eyebrows. Inquisitive eyes.",
    memento: "A worn diary full of your experiences and discoveries.",
    blurb: "An old elementalist who has been fascinated with fire since childhood."
  },
  {
    name: "Orla Moonsilver", kin: "elf", profession: "hunter", mageSchool: null, age: "adult",
    attributes: { STR: 13, CON: 15, AGL: 17, INT: 13, WIL: 10, CHA: 9 },
    trained: ["Acrobatics","Awareness","Bushcraft","Evade","Hunting & Fishing","Sneaking","Swimming","Bows","Knives","Swords"],
    heroic: "Twin Shot",
    spells: { tricks: [], known: [] },
    weapons: ["Longbow","Knife"], armor: "Leather", helmet: null,
    gear: ["Quiver (iron-head arrows)","Torch","Rope"],
    weakness: "Intolerant. Nightkin such as orcs and goblins are evil and need to be fought.",
    appearance: "Eyes that suspiciously scrutinize everyone. Eager and swift in thought and action.",
    memento: "Fang from the troll that slew your sister.",
    blurb: "A swift elven hunter seeking her destiny in the Misty Vale."
  },
  {
    name: "Makander of Halfbay", kin: "mallard", profession: "knight", mageSchool: null, age: "adult",
    attributes: { STR: 16, CON: 16, AGL: 10, INT: 12, WIL: 14, CHA: 13 },
    trained: ["Acrobatics","Myths & Legends","Performance","Persuasion","Axes","Brawling","Crossbows","Hammers","Spears","Swords"],
    heroic: "Guardian",
    spells: { tricks: [], known: [] },
    weapons: ["Battleaxe","Short Sword"], armor: "Plate Armor", helmet: "Great Helm",
    gear: ["Torch","Flint & Tinder"],
    weakness: "Foolhardy. You always go first into danger.",
    appearance: "Waddling walk. Quick to anger when provoked, especially if someone insults your family or honor. You seldom smile.",
    memento: "A fine pipe made of black horn (a gift from your father).",
    blurb: "A proud mallard knight, the youngest son of a baron, forging his own path."
  },
  {
    name: "Krisanna the Bold", kin: "halfling", profession: "thief", mageSchool: null, age: "young",
    attributes: { STR: 8, CON: 13, AGL: 18, INT: 14, WIL: 15, CHA: 10 },
    trained: ["Acrobatics","Awareness","Bluffing","Evade","Sleight of Hand","Sneaking","Spot Hidden","Knives"],
    heroic: "Backstabbing",
    spells: { tricks: [], known: [] },
    weapons: ["Dagger","Knife"], armor: "Leather", helmet: null,
    gear: ["Lockpicks (simple)","Torch","Rope","Flint & Tinder"],
    weakness: "Reckless. You always take big risks without thought of the consequences.",
    appearance: "Constantly observing eyes. Light and silent on your feet. You see opportunity in any situation.",
    memento: "A treasure map you “found.”",
    blurb: "A nimble young halfling thief who sees opportunity everywhere."
  },
  {
    name: "Bastonn Bloodjaw", kin: "wolfkin", profession: "fighter", mageSchool: null, age: "young",
    attributes: { STR: 18, CON: 17, AGL: 14, INT: 11, WIL: 13, CHA: 7 },
    trained: ["Acrobatics","Evade","Sneaking","Axes","Brawling","Hammers","Spears","Swords"],
    heroic: "Veteran",
    spells: { tricks: [], known: [] },
    weapons: ["Long Spear","Short Spear"], armor: "Studded Leather", helmet: null,
    gear: ["Torch","Flint & Tinder"],
    weakness: "Gluttonous. You take every chance you get to eat something tasty.",
    appearance: "Smiles warmly at friends, but menacingly at foes. You take good care of your clothes and often wear fragrant perfumes.",
    memento: "Blue bottle of perfume.",
    blurb: "A mighty wolfkin fighter come from the northern wastelands seeking work and joy."
  }
];

if (typeof window !== "undefined") { window.DRAGONBANE_PREGENS = DRAGONBANE_PREGENS; }
if (typeof module !== "undefined" && module.exports) { module.exports = DRAGONBANE_PREGENS; }
