/*
 * data-npcs.js — Dragonbane Humanoids, Bosses, Undead & Animals Library
 * ----------------------------------------------------------------------
 * Canonical stats extracted from official Dragonbane rules. Unlike true monsters,
 * humanoids and animals roll standard d20 skill checks to hit.
 * Unlisted ordinary NPC skills default to skill level 5.
 */

const DRAGONBANE_NPCS = [
  // Typical Humanoid NPCs
  {
    id: "guard", name: "Guard", kind: "npc", hp: 12, armor: 2, mov: 10,
    desc: "Humanoid · Awareness 10, Swords 12 · Studded leather",
    weapons: [{ name: "Broadsword", skill: 12, damage: "2d6", bonus: "1d4" }]
  },
  {
    id: "cultist", name: "Cultist", kind: "npc", hp: 12, armor: 0, mov: 10,
    desc: "Humanoid · Evade 14, Knives 14",
    weapons: [{ name: "Dagger", skill: 14, damage: "1d8", bonus: "1d4" }]
  },
  {
    id: "thief", name: "Thief", kind: "npc", hp: 10, armor: 0, mov: 10,
    desc: "Humanoid · Evade 12, Knives 12",
    weapons: [{ name: "Knife", skill: 12, damage: "1d8", bonus: "1d4" }]
  },
  {
    id: "villager", name: "Villager", kind: "npc", hp: 8, armor: 0, mov: 10,
    desc: "Humanoid · Brawling 8",
    weapons: [{ name: "Wooden club", skill: 8, damage: "1d8" }]
  },
  {
    id: "hunter", name: "Hunter", kind: "npc", hp: 13, armor: 1, mov: 10,
    desc: "Humanoid · Awareness 12, Bows 13 · Leather armor",
    weapons: [{ name: "Longbow", skill: 13, damage: "1d12", bonus: "1d4" }]
  },
  {
    id: "bandit", name: "Bandit", kind: "npc", hp: 12, armor: 0, mov: 10,
    desc: "Humanoid · Bows 12, Evade 10, Swords 12",
    weapons: [
      { name: "Short sword", skill: 12, damage: "1d10" },
      { name: "Short bow", skill: 12, damage: "1d10" }
    ]
  },
  {
    id: "adventurer", name: "Adventurer", kind: "npc", hp: 13, armor: 2, mov: 10,
    desc: "Humanoid · Awareness 10, Swords 12 · Studded leather",
    weapons: [{ name: "Broadsword", skill: 12, damage: "2d6", bonus: "1d4" }]
  },
  {
    id: "scholar", name: "Scholar", kind: "npc", hp: 7, armor: 0, mov: 10,
    desc: "Humanoid · Languages 13, Myths & Legends 13, Staves 8",
    weapons: [{ name: "Staff", skill: 8, damage: "1d8" }]
  },

  // Boss NPCs
  {
    id: "bandit_chief", name: "Bandit Chief (Boss)", kind: "npc", hp: 30, wp: 16, armor: 4, mov: 10,
    desc: "Boss · Berserker, Robust × 6, Veteran · Chainmail & open helm",
    weapons: [
      { name: "Heavy warhammer", skill: 15, damage: "2d10", bonus: "1d6" },
      { name: "Brawling", skill: 15, damage: "1d6", bonus: "1d6" }
    ]
  },
  {
    id: "knight_champion", name: "Knight Champion (Boss)", kind: "npc", hp: 28, wp: 26, armor: 6, mov: 10,
    desc: "Boss · Defensive, Double Slash, Focused × 6, Robust × 6 · Plate & shield",
    weapons: [
      { name: "Longsword", skill: 16, damage: "2d8", bonus: "1d6" },
      { name: "Brawling", skill: 14, damage: "1d6", bonus: "1d6" }
    ]
  },
  {
    id: "archmage", name: "Archmage (Boss)", kind: "npc", hp: 22, wp: 30, armor: 0, mov: 10,
    desc: "Boss · Master Spellcaster, Focused × 6, Robust × 4 · Magic School 15",
    weapons: [{ name: "Staff", skill: 13, damage: "1d8" }]
  },

  // Goblins (Nocturnal trait)
  {
    id: "goblin_scout", name: "Goblin Scout", kind: "npc", hp: 9, armor: 1, mov: 10,
    desc: "Goblin · Nocturnal (sunlight bane + D6 dmg) · Awareness 10, Evade 10, Sneaking 12",
    weapons: [
      { name: "Short bow", skill: 12, damage: "1d10" },
      { name: "Short sword", skill: 10, damage: "1d10" }
    ]
  },
  {
    id: "goblin_warrior", name: "Goblin Warrior", kind: "npc", hp: 10, armor: 2, mov: 10,
    desc: "Goblin · Nocturnal · Awareness 10, Evade 10, Sneaking 12 · Studded leather",
    weapons: [{ name: "Long spear", skill: 12, damage: "2d8" }]
  },
  {
    id: "jaldo", name: "Jaldo (Goblin Chief)", kind: "npc", hp: 10, armor: 3, mov: 10,
    desc: "Goblin Chief · Nocturnal · Awareness 12, Evade 10, Sneaking 12 · Studded leather & open helm",
    weapons: [{ name: "Scimitar", skill: 12, damage: "2d6" }]
  },

  // Orcs (Nocturnal trait)
  {
    id: "orc_warrior", name: "Orc Warrior", kind: "npc", hp: 12, armor: 2, mov: 10,
    desc: "Orc · Nocturnal · Awareness 10, Evade 8 · Studded leather",
    weapons: [{ name: "Scimitar", skill: 12, damage: "2d6", bonus: "1d4" }]
  },
  {
    id: "orc_shaman", name: "Orc Shaman", kind: "npc", hp: 10, wp: 16, armor: 0, mov: 10,
    desc: "Orc · Animism 14, Awareness 12, Evade 8 · Spells: Ensnaring Roots, Lightning Flash, Treat Wound",
    weapons: [{ name: "Staff", skill: 10, damage: "1d8" }]
  },
  {
    id: "orc_chieftain", name: "Orc Chieftain", kind: "npc", hp: 24, wp: 15, armor: 4, mov: 10,
    desc: "Orc Boss · Veteran, Defensive, Dual Wield, Robust × 4 · Awareness 14, Evade 12 · Chainmail",
    weapons: [{ name: "Two scimitars", skill: 16, damage: "2d6", bonus: "1d6" }]
  },
  {
    id: "grunta", name: "Grunta (Outcast Orc)", kind: "npc", hp: 12, armor: 0, mov: 10,
    desc: "Orc · Awareness 14, Evade 10 · Accompanied by Merle, pet pig",
    weapons: [{ name: "Small wooden club", skill: 12, damage: "1d8", bonus: "1d4" }]
  },

  // Skeletons (Immune to fear/persuasion, half piercing damage)
  {
    id: "skeleton_warrior", name: "Skeleton Warrior", kind: "npc", hp: 8, armor: 2, mov: 8,
    desc: "Undead · Immune to fear/persuasion, ½ piercing dmg · Awareness 8, Evade 6",
    weapons: [{ name: "Short sword", skill: 12, damage: "1d10" }]
  },
  {
    id: "skeleton_archer", name: "Skeleton Archer", kind: "npc", hp: 8, armor: 1, mov: 8,
    desc: "Undead · Immune to fear/persuasion, ½ piercing dmg · Awareness 8, Evade 6",
    weapons: [
      { name: "Crossbow", skill: 12, damage: "2d6" },
      { name: "Dagger", skill: 10, damage: "1d8" }
    ]
  },
  {
    id: "skeleton_champion", name: "Skeleton Champion", kind: "npc", hp: 24, wp: 15, armor: 4, mov: 10,
    desc: "Undead Boss · Veteran, Defensive, Double Slash, Robust × 4 · ½ piercing dmg",
    weapons: [{ name: "Longsword", skill: 16, damage: "2d8", bonus: "1d6" }]
  },

  // Playable Kin Archetypes (Ordinary NPCs)
  { id: "cat_hunter", name: "Cat People Hunter", kind: "npc", hp: 8, wp: 9, armor: 1, mov: 12, desc: "Cat People · Nine Lives · Acrobatics 14, Awareness 12, Sneaking 14", weapons: [{ name: "Short spear", skill: 14, damage: "1d10", bonus: "1d4" }, { name: "Short bow", skill: 12, damage: "1d10" }] },
  { id: "cat_thief", name: "Cat People Thief", kind: "npc", hp: 8, wp: 9, armor: 0, mov: 12, desc: "Cat People · Nine Lives · Awareness 14, Evade 12, Sleight of Hand 12, Sneaking 14", weapons: [{ name: "Dagger", skill: 14, damage: "1d8", bonus: "1d4" }, { name: "Sling", skill: 10, damage: "1d8" }] },
  { id: "frog_hunter", name: "Frog People Hunter", kind: "npc", hp: 8, wp: 10, armor: 1, mov: 12, desc: "Frog People · Leaping · Acrobatics 14, Awareness 8, Sneaking 10", weapons: [{ name: "Short spear", skill: 10, damage: "1d10", bonus: "1d4" }, { name: "Short bow", skill: 12, damage: "1d10" }] },
  { id: "frog_shaman", name: "Frog People Shaman", kind: "npc", hp: 6, wp: 12, armor: 0, mov: 10, desc: "Frog People · Leaping · Animism 12 · Spells: Animal Whisperer, Ensnaring Roots, Lightning Flash, Treat Wound, Sleep", weapons: [{ name: "Staff", skill: 8, damage: "1d8" }] },
  { id: "hobgoblin_scout", name: "Hobgoblin Scout", kind: "npc", hp: 9, wp: 8, armor: 1, mov: 10, desc: "Hobgoblin · Fearless, Nocturnal · Awareness 12, Evade 12, Sneaking 14", weapons: [{ name: "Short bow", skill: 10, damage: "1d10" }, { name: "Dagger", skill: 8, damage: "1d8" }] },
  { id: "hobgoblin_fighter", name: "Hobgoblin Fighter", kind: "npc", hp: 12, wp: 8, armor: 2, mov: 10, desc: "Hobgoblin · Fearless, Nocturnal · Awareness 10, Evade 10, Sneaking 10", weapons: [{ name: "Short spear", skill: 10, damage: "1d10" }] },
  { id: "hobgoblin_thief", name: "Hobgoblin Thief", kind: "npc", hp: 7, wp: 8, armor: 0, mov: 12, desc: "Hobgoblin · Fearless, Nocturnal · Awareness 12, Evade 12, Sleight of Hand 12, Sneaking 14", weapons: [{ name: "Dagger", skill: 10, damage: "1d8", bonus: "1d4" }, { name: "Sling", skill: 8, damage: "1d8" }] },
  { id: "karkion_scholar", name: "Karkion Scholar", kind: "npc", hp: 12, wp: 14, armor: 0, mov: 12, desc: "Karkion · Wings (flight 1 WP/rd) · Awareness 14, Beast Lore 14, Languages 14, Myths & Legends 14", weapons: [{ name: "Short bow", skill: 14, damage: "1d10", bonus: "1d4" }, { name: "Short sword", skill: 12, damage: "1d10", bonus: "1d4" }] },
  { id: "karkion_mage", name: "Karkion Mage", kind: "npc", hp: 12, wp: 16, armor: 0, mov: 12, desc: "Karkion · Wings · Animism 14 · Spells: Animal Whisperer, Banish, Birdsong, Cook Food, Engulfing Forest, Heal Wound, Lightning Bolt, Sleep", weapons: [{ name: "Staff", skill: 12, damage: "1d8", bonus: "1d4" }] },
  { id: "lizard_hunter", name: "Lizard People Hunter", kind: "npc", hp: 9, wp: 8, armor: 0, mov: 12, desc: "Lizard People · Camouflage · Awareness 12, Evade 14, Sneaking 14", weapons: [{ name: "Short bow", skill: 12, damage: "1d10", bonus: "1d4" }, { name: "Dagger", skill: 10, damage: "1d8", bonus: "1d4" }] },
  { id: "lizard_fighter", name: "Lizard People Fighter", kind: "npc", hp: 10, wp: 8, armor: 0, mov: 10, desc: "Lizard People · Camouflage · Awareness 12, Evade 12, Sneaking 10", weapons: [{ name: "Short spear", skill: 12, damage: "1d10", bonus: "1d4" }, { name: "Sling", skill: 10, damage: "1d8", bonus: "1d4" }] },
  { id: "lizard_mage", name: "Lizard People Mage", kind: "npc", hp: 8, wp: 14, armor: 0, mov: 10, desc: "Lizard People · Camouflage · Animism 12 · Spells: Animal Whisperer, Banish, Engulfing Forest, Heal Wound, Lightning Flash, Sleep", weapons: [{ name: "Knife", skill: 10, damage: "1d8" }] },
  { id: "lizard_merchant", name: "Lizard People Merchant", kind: "npc", hp: 8, wp: 8, armor: 0, mov: 8, desc: "Lizard People · Camouflage · Bartering 10, Bluffing 10, Persuasion 12", weapons: [{ name: "Knife", skill: 8, damage: "1d8" }] },
  { id: "ogre_fighter", name: "Ogre Fighter", kind: "npc", hp: 16, wp: 12, armor: 1, mov: 10, desc: "Ogre · Body Slam, Nocturnal, Large · Awareness 8, Brawling 12", weapons: [{ name: "Large wooden club", skill: 10, damage: "2d8", bonus: "1d6" }] },
  { id: "ogre_chieftain", name: "Ogre Chieftain (Boss)", kind: "npc", hp: 24, wp: 16, armor: 2, mov: 10, desc: "Ogre Boss · Body Slam, Nocturnal, Large · Veteran, Robust × 4", weapons: [{ name: "Heavy warhammer", skill: 12, damage: "2d10", bonus: "1d6" }] },
  { id: "satyr_bard", name: "Satyr Bard", kind: "npc", hp: 10, wp: 12, armor: 0, mov: 10, desc: "Satyr · Raise Spirits, Melancholy · Bluffing 10, Performance 14, Persuasion 12", weapons: [{ name: "Short spear", skill: 10, damage: "1d10" }] },

  // Common Animals
  { id: "cat", name: "Cat", kind: "npc", hp: 4, mov: 12, desc: "Animal · Awareness 12, Evade 14, Sneaking 16", weapons: [{ name: "Bite", skill: 8, damage: "1d3" }] },
  { id: "dog", name: "Guard Dog", kind: "npc", hp: 8, mov: 14, desc: "Animal · Awareness 14, Evade 10, Sneaking 12", weapons: [{ name: "Bite", skill: 12, damage: "1d8" }] },
  { id: "goat", name: "Goat", kind: "npc", hp: 6, mov: 10, desc: "Animal · Awareness 10, Evade 12", weapons: [{ name: "Horns", skill: 10, damage: "1d6" }] },
  { id: "donkey", name: "Donkey", kind: "npc", hp: 12, mov: 14, desc: "Animal · Awareness 10, Evade 6", weapons: [{ name: "Kick", skill: 10, damage: "1d10" }] },
  { id: "horse", name: "Horse (Riding/Combat)", kind: "npc", hp: 16, mov: 20, desc: "Animal · Awareness 12, Evade 8", weapons: [{ name: "Kick", skill: 10, damage: "2d4" }] },
  { id: "wild_boar", name: "Wild Boar", kind: "npc", hp: 14, mov: 12, desc: "Animal · Awareness 10, Evade 8", weapons: [{ name: "Tusks", skill: 12, damage: "2d6" }] },
  { id: "deer", name: "Deer", kind: "npc", hp: 12, mov: 18, desc: "Animal · Awareness 12, Evade 12", weapons: [{ name: "Horns", skill: 10, damage: "1d8" }] },
  { id: "moose", name: "Moose", kind: "npc", hp: 18, mov: 16, desc: "Animal · Awareness 10, Evade 8", weapons: [{ name: "Horns", skill: 10, damage: "2d6" }] },
  { id: "fox", name: "Fox", kind: "npc", hp: 6, mov: 10, desc: "Animal · Awareness 12, Evade 10, Sneaking 14", weapons: [{ name: "Bite", skill: 12, damage: "1d6" }] },
  { id: "wolf", name: "Wolf", kind: "npc", hp: 10, mov: 16, desc: "Animal · Awareness 14, Evade 12, Sneaking 14", weapons: [{ name: "Bite", skill: 14, damage: "2d6" }] },
  { id: "bear", name: "Bear", kind: "npc", hp: 20, mov: 12, desc: "Animal · Awareness 10, Evade 8", weapons: [{ name: "Bite", skill: 12, damage: "2d8" }] }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DRAGONBANE_NPCS };
}
