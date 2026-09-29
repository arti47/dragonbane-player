/* graphics.js — decorative emblem sets, heraldic crests and line-art illustrations.
   Everything is self-authored inline SVG drawn in currentColor (plus theme
   tokens for gilt/tincture), so it follows light/dark automatically. Purely
   visual: every SVG is aria-hidden and adds no text, except a crest's initials,
   which replace the monogram's own initials one-for-one. */

// ---- 24×24 stroke emblem sets ----------------------------------------------
const KIN = {
  human: '<circle cx="12" cy="7.5" r="3.6"/><path d="M8.5 6.3c1.3-2.4 5.7-2.4 7 0"/><path d="M4.5 21c0-4.6 3.2-7.6 7.5-7.6s7.5 3 7.5 7.6"/><path d="M12 13.4v3.6"/>',
  halfling: '<path d="M6 10.5h12a6 6 0 01-6 10 6 6 0 01-6-10z"/><path d="M4.8 10.5c0-3.2 3.2-5.3 7.2-5.3s7.2 2.1 7.2 5.3z"/><path d="M12 5.2V2.6M8.5 8l1 1.5M13 7.6l1 1.5"/>',
  dwarf: '<path d="M6 10a6 6 0 0112 0"/><path d="M4.5 10h15M12 4v6"/><path d="M7 10v2.2c0 1 .5 2 1.5 2.5L12 21.5l3.5-6.8c1-.5 1.5-1.5 1.5-2.5V10"/><path d="M10 15.5l2 3 2-3M9.6 12.4h.01M14.4 12.4h.01"/>',
  elf: '<path d="M15.5 3a8.5 8.5 0 100 18A9.8 9.8 0 0115.5 3z"/><path d="M17.5 8.5l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  mallard: '<path d="M15 9a4.5 4.5 0 10-8.6 2C5.4 13 4 15 4 17.5 4 19.5 6 21 9 21h6c2.6 0 4.5-1.5 4.5-4"/><path d="M15 8.5l5.5 1-5 2.6"/><circle cx="11.4" cy="7.6" r=".9" fill="currentColor"/><path d="M8 15.5c2 1 5 1 7 0"/>',
  wolfkin: '<path d="M5 3l3.2 5h7.6L19 3l1 8.2-3 3.8-5 6-5-6-3-3.8z"/><path d="M9.5 11.5h.01M14.5 11.5h.01M10.5 16l1.5 1.5 1.5-1.5"/>',
};
const PROF = {
  artisan: '<path d="M4 14h12l-2 3H8zM9.5 17v3M7 20.5h8M16 14c2.2 0 4-1 4-3h-4"/><path d="M13 3l4 4-2 2-4-4zM14 8l-5 5"/>',
  bard: '<ellipse cx="9" cy="15" rx="5" ry="5.6" transform="rotate(-45 9 15)"/><circle cx="9" cy="15" r="1.4"/><path d="M12.6 11.4L20 4M18 2.5l3 3M11 17l-4-4"/>',
  fighter: '<path d="M12 2l2 3v11h-4V5z"/><path d="M6.5 16h11M12 16v4M10.2 21.5h3.6"/>',
  hunter: '<path d="M4 20L18 6M18 6h-4M18 6v4"/><path d="M4 4l14 14M18 18h-4M18 18v-4"/><path d="M4 20l1-3M4 20l3-1M4 4l3 1M4 4l1 3"/>',
  knight: '<path d="M6 21V9.5a6 6 0 0112 0V21z"/><path d="M6 12.5h12M12 12.5V21M9 16h.01M9 18.5h.01M15 16h.01M15 18.5h.01"/><path d="M12 3.5c2-1.6 4.5-1.6 6 .5"/>',
  mage: '<path d="M8 22l7-14"/><circle cx="16.5" cy="5.5" r="3"/><path d="M4.5 6l.9 1.9 2 .9-2 .9-.9 1.9-.9-1.9-2-.9 2-.9zM20 13.5l.7 1.4 1.3.6-1.3.6L20 17.5l-.7-1.4-1.3-.6 1.3-.6z"/>',
  mariner: '<circle cx="12" cy="4.8" r="2"/><path d="M12 6.8v14.4M8 10h8M4 14a8 8 0 0016 0M4 14l-1.4 2M4 14l2.2.8M20 14l1.4 2M20 14l-2.2.8"/>',
  merchant: '<path d="M8.5 7h7l-1-3.5h-5z"/><path d="M8.5 7C4.5 10 3.5 14 4.2 17c.8 3 3.8 4 7.8 4s7-1 7.8-4c.7-3-.3-7-4.3-10"/><path d="M12 10.5v7M14 12c-.3-1-3.7-1.2-3.8.5-.1 2 3.9 1 3.8 3.1-.1 1.6-3.4 1.4-3.9.4"/>',
  scholar: '<path d="M20 3C12 4 7.2 9 5 17l3-2c5-1 9-5 12-12z"/><path d="M5 17l-2 4M9.5 12l3 1"/>',
  thief: '<path d="M2 10c3-2 7-2 10 0 3-2 7-2 10 0-1 4-3 6.2-6 6.2-2 0-3-1-4-2-1 1-2 2-4 2-3 0-5-2.2-6-6.2z"/><path d="M6.8 11.6h2.4M14.8 11.6h2.4"/>',
};
const SCHOOL = {
  general: '<circle cx="12" cy="12" r="9"/><path d="M12 4.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5L4.5 12l5.5-2z"/>',
  animism: '<ellipse cx="12" cy="16" rx="4.2" ry="3.6"/><circle cx="6.3" cy="10.8" r="1.8"/><circle cx="9.8" cy="6.8" r="1.8"/><circle cx="14.2" cy="6.8" r="1.8"/><circle cx="17.7" cy="10.8" r="1.8"/>',
  elementalism: '<path d="M12 3l9 16H3z"/><path d="M12 9c1.5 2 3 3 3 5a3 3 0 01-6 0c0-2 1.5-3 3-5z"/>',
  mentalism: '<path d="M12 3l9.5 17h-19z"/><path d="M7 14.5s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3z"/><circle cx="12" cy="14.5" r="1" fill="currentColor"/>',
  demonology: '<circle cx="12" cy="13" r="7.5"/><path d="M12 6.5l3.8 11.3-9.7-7h11.8l-9.7 7z"/><path d="M6.2 6.2L3.5 2.5M17.8 6.2l2.7-3.7"/>',
  harmonism: '<path d="M7 4c-3 3-3 9 1 12M17 4c3 3 3 9-1 12M8 16h8M12 16v5M9 21h6M9.6 7.2V16M12 6v10M14.4 7.2V16M5.8 4H8M16 4h2.2"/>',
  illusionism: '<path d="M5 4h14v7a7 7 0 01-14 0z"/><path d="M8 9c.8-1 2.2-1 3 0M13 9c.8-1 2.2-1 3 0M9 14c1.5 1.5 4.5 1.5 6 0"/>',
  necromancy: '<path d="M12 3a6 6 0 00-4 10.5V16h8v-2.5A6 6 0 0012 3z"/><circle cx="10" cy="9.5" r="1.2"/><circle cx="14" cy="9.5" r="1.2"/><path d="M4 18l16 3M20 18L4 21"/>',
  symbolism: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M10 6.5v11M10 9.5l5-3M10 12l5 3v3"/>',
  witchcraft: '<path d="M4 10h16M5 10c0 6 3 9 7 9s7-3 7-9"/><path d="M7 19l-1 2.5M17 19l1 2.5M9 7.5c0-1.5 1.5-2 1.5-3.5M13.5 7.5c0-1.5 1.5-2 1.5-3.5"/>',
  alchemy: '<circle cx="12" cy="10" r="7"/><path d="M12 4.2l5.3 9.3H6.7z"/><path d="M12 17v5M9.5 19.8h5"/>',
  enchanting: '<circle cx="12" cy="15" r="6"/><path d="M9 9l1.5-4h3L15 9l-3 2.5z"/><path d="M9 9h6"/>',
  dracomancy: '<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7z"/><path d="M12 6.5c-1.6 2-1.6 9 0 11 1.6-2 1.6-9 0-11z" fill="currentColor"/>',
};
const COND = {
  exhausted: '<circle cx="11" cy="13" r="8"/><path d="M7.2 12.2h3M11.8 12.2h3M9 16.8h4"/><path d="M16.5 2.5h3.5l-3.5 3.5h3.5"/>',
  sickly: '<circle cx="12" cy="12" r="8"/><path d="M8.6 10h.01M15.4 10h.01M7.6 15.5c1-1 2-1 3 0s2 1 3 0 2-1 3 0"/>',
  dazed: '<path d="M12 12a1.5 1.5 0 102-1.5 3 3 0 10-3 3.5 5 5 0 105-5"/><path d="M4.5 3.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8zM19 16.5l.6 1.3 1.4.6-1.4.6-.6 1.5-.6-1.5-1.4-.6 1.4-.6z"/>',
  angry: '<circle cx="12" cy="12" r="8"/><path d="M7.5 8.6l3 1.5M16.5 8.6l-3 1.5M9 16.2c2-1.5 4-1.5 6 0"/>',
  scared: '<circle cx="12" cy="12.5" r="8"/><path d="M9 10h.01M15 10h.01"/><ellipse cx="12" cy="15.5" rx="2" ry="2.4"/><path d="M4.5 4l1.5 1.5M19.5 4L18 5.5"/>',
  disheartened: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/><path d="M12 6.5l-1.5 4 3 2-2 4.5"/>',
};
const ATTR = {
  STR: '<path d="M7 11V8a1.5 1.5 0 013 0v2M10 10V7a1.5 1.5 0 013 0v3M13 10V7.5a1.5 1.5 0 013 0V11M16 10.5a1.5 1.5 0 013 0v3a7 7 0 01-7 7h-1a5 5 0 01-5-5v-2a2 2 0 012-2h3"/><path d="M10 13.5c1.5 0 2.5 1 2.5 2.5"/>',
  CON: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 9c0 6-8 11-8 11z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>',
  AGL: '<path d="M19 3c-7 1-12 6-13 14l2-1 1 2c7-2 11-8 10-15z"/><path d="M4 21L14 9M10 14.5l3 .5M12.2 11.8l3 .5"/>',
  INT: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  WIL: '<path d="M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-4 3-6 0 3 1 4 2 4 0-4-1-6 1-10z"/>',
  CHA: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
};
const CREATURE = {
  dragon: '<path d="M2 16c3 0 5-2 6-5L4 6l6 2 2-4 2 4 6-2-4 5c1 3 3 5 6 5"/><path d="M8 11c1 4 2 7 4 9 2-2 3-5 4-9"/>',
  demon: '<path d="M5 3l2 5M19 3l-2 5M6 8h12v6a6 6 0 01-12 0zM9 12h.01M15 12h.01M10 16h4"/>',
  undead: '<path d="M12 3a8 8 0 00-5 14v3h10v-3a8 8 0 00-5-14z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 20v-2M14 20v-2"/>',
  spirit: '<path d="M6 21V10a6 6 0 0112 0v11l-2-2-2 2-2-2-2 2-2-2z"/><path d="M9.5 10h.01M14.5 10h.01"/>',
  beast: '<path d="M6 3c2 6 2 12-1 18M11 3c2 6 2 12-1 18M16 3c2 6 2 12-1 18"/>',
  giant: '<circle cx="12" cy="4.8" r="2.6"/><path d="M6 21l2-8-3-3 4-2.3h6L19 10l-3 3 2 8M9 13h6"/>',
  spider: '<circle cx="12" cy="13.5" r="3.5"/><circle cx="12" cy="8.2" r="2"/><path d="M8.5 12.5L3 9.5M8.5 14.5L3 16.5M9.2 16.5l-3 4.5M15.5 12.5l5.5-3M15.5 14.5l5.5 2M14.8 16.5l3 4.5M10.5 6.6L8.5 3M13.5 6.6l2-3.6"/>',
  serpent: '<path d="M4 18c3 3 7 2 7-2s-6-3-6-7 4-5 7-4 5 3 3 5"/><path d="M15 10l2 1.5M18 7.2l3-1"/>',
  flyer: '<path d="M2 9c4-2 7 0 10 4 3-4 6-6 10-4-3 1-5 3-6 6-2 1-6 1-8 0-1-3-3-5-6-6z"/>',
  aquatic: '<path d="M7.5 11a4.5 6 0 119 0"/><path d="M7.5 11c-2 4-5 5-5 8M10 12c-1 4-1 7-3 9M14 12c1 4 1 7 3 9M16.5 11c2 4 5 5 5 8"/>',
  plant: '<path d="M12 2l6 8h-3l4 6H5l4-6H6zM12 16v6"/>',
  construct: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  humanoid: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
};
const DICE = {
  d4: '<path d="M12 3l9.5 17h-19z"/><path d="M12 3v17"/>',
  d6: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 4l3 3h10l3-3M7 7v10M17 7v10"/>',
  d8: '<path d="M12 2l9 10-9 10-9-10z"/><path d="M3 12h18M12 2l-3 10 3 10 3-10z"/>',
  d10: '<path d="M12 2l9 9-9 11-9-11z"/><path d="M3 11l9 3 9-3M12 14v8M12 2l-4 9M12 2l4 9"/>',
  d12: '<path d="M12 2l9.5 7-3.6 11H6.1L2.5 9z"/><path d="M12 6l4.8 3.5-1.8 5.5H9l-1.8-5.5z"/><path d="M12 2v4M21.5 9l-4.7.5M17.9 20L15 15M6.1 20L9 15M2.5 9l4.7.5"/>',
  d20: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 7l5 8.5H7z"/><path d="M12 2v5M21 7l-4 8.5M3 7l4 8.5M12 22l-5-6.5M12 22l5-6.5"/>',
};
const SETS = { kin: KIN, prof: PROF, school: SCHOOL, cond: COND, attr: ATTR, creature: CREATURE, dice: DICE };

const svg24 = (body, cls) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const keyOf = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z]/g, "");

/** One emblem from a set ("kin" | "prof" | "school" | "cond" | "attr" | "creature" | "dice"). */
export function emblem(set, key, cls = "emb") {
  const table = SETS[set] || {};
  const body = table[key] || table[keyOf(key)] || table[String(key || "").toUpperCase()];
  return body ? svg24(body, `${cls} emb-${set}`) : "";
}

/** Creature silhouette key for a combatant name (monster / NPC). */
export function creatureType(name, kind) {
  const n = String(name || "").toLowerCase();
  const rx = [
    ["dragon", /dragon|drake|wyrm|lindworm|wyvern/], ["demon", /demon|imp\b|devil|fiend/],
    ["spirit", /ghost|spirit|wraith|spectre|specter|shade|phantom|banshee/],
    ["undead", /skeleton|zombie|ghoul|wight|lich|undead|mummy|draugr|revenant|vampire|dead/],
    ["spider", /spider|insect|scorpion|\bant\b|beetle|wasp|centipede/],
    ["serpent", /serpent|snake|basilisk|hydra|naga|lizard|crocodile/],
    ["flyer", /griffon|gryphon|harpy|bird|eagle|\bbat\b|owl|crow|raven|hawk|pegasus|roc\b/],
    ["aquatic", /octopus|kraken|squid|crab|fish|shark|frog|sea /],
    ["giant", /giant|troll|ogre|titan|minotaur|cyclops|ettin/],
    ["plant", /tree|treant|plant|fung|vine|moss/],
    ["construct", /golem|elemental|construct|statue|amoeba|slime|ooze|gargoyle/],
    ["beast", /wolf|bear|boar|cat\b|horse|rat\b|lion|beast|dog|hound|manticore|centaur|bull|goat|stag|snake|tiger/],
  ];
  for (const [k, r] of rx) if (r.test(n)) return k;
  return kind === "monster" ? "beast" : "humanoid";
}

// ---- Heraldic crest ------------------------------------------------------
const FIELDS = ["gules", "azure", "vert", "sable", "purpure"];
const METALS = ["or", "argent"];
const DIVS = ["plain", "pale", "fess", "bend", "chevron", "quarterly", "saltire", "bordure"];
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
let crestSeq = 0;
const T = (t) => `var(--her-${t})`;

/** A deterministic heraldic shield from a name + kin: field tincture, division
    and metals come from a hash of the name; the kin emblem is the charge and the
    initials sit small on the chief (they are the monogram's text). */
export function crest(name, kin, initials, cls = "crest") {
  const h = hash(String(name || "?").toLowerCase());
  const field = FIELDS[h % FIELDS.length];
  const metal = METALS[(h >>> 3) % 2], metal2 = METALS[((h >>> 3) + 1) % 2];
  const div = DIVS[(h >>> 5) % DIVS.length];
  const id = "cr" + (++crestSeq);
  const F = T(field), M = T(metal), M2 = T(metal2);
  const shield = "M3 3h34v18.5C37 33 29 40 20 43.5 11 40 3 33 3 21.5z";
  const divShape = {
    plain: "",
    pale: `<rect x="20" y="0" width="20" height="46" style="fill:${M}"/>`,
    fess: `<rect x="0" y="27" width="40" height="19" style="fill:${M}"/>`,
    bend: `<polygon points="0,11 0,22 40,46 40,35" style="fill:${M}"/>`,
    chevron: `<polygon points="0,42 20,24 40,42 40,34 20,16 0,34" style="fill:${M}"/>`,
    quarterly: `<rect x="20" y="11" width="20" height="16" style="fill:${M}"/><rect x="0" y="27" width="20" height="19" style="fill:${M}"/>`,
    saltire: `<path d="M0 11L40 46M40 11L0 46" style="stroke:${M};stroke-width:6"/>`,
    bordure: `<path d="${shield}" style="fill:none;stroke:${M};stroke-width:6"/>`,
  }[div];
  const k = keyOf(kin);
  const charge = KIN[k] || KIN.human;
  const ini = String(initials || "").slice(0, 3);
  return `<svg class="${cls}" viewBox="0 0 40 46" aria-hidden="true" focusable="false" data-field="${field}" data-div="${div}">
    <defs><clipPath id="${id}"><path d="${shield}"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect width="40" height="46" style="fill:${F}"/>${divShape}
      <rect width="40" height="11" style="fill:${M2}"/><rect y="11" width="40" height=".8" style="fill:${F};opacity:.35"/>
      <circle cx="20" cy="28" r="9" style="fill:${M2};stroke:${F};stroke-width:1.2"/>
      <svg x="12.5" y="20.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:${F};color:${F}">${charge}</svg>
    </g>
    <text x="20" y="8.6" text-anchor="middle" class="crest-ini" style="fill:${F}">${ini.replace(/[<&>]/g, "")}</text>
    <path d="${shield}" style="fill:none;stroke:var(--gold-leaf);stroke-width:1.6"/>
    <path d="M5 5h30v16.5C35 31.8 28 38 20 41.3 12 38 5 31.8 5 21.5z" style="fill:none;stroke:var(--on-gold);stroke-width:.5;opacity:.35"/>
  </svg>`;
}

// ---- Faceted d20 ---------------------------------------------------------
const D20_FACES = [
  ["50,3 92,27 50,22", 88], ["50,3 50,22 8,27", 96], ["92,27 80,68 50,22", 72], ["92,27 92,73 80,68", 52],
  ["92,73 50,97 80,68", 40], ["50,97 20,68 80,68", 58], ["50,97 8,73 20,68", 66], ["8,73 8,27 20,68", 84],
  ["8,27 50,22 20,68", 92], ["50,22 80,68 20,68", 78],
];
/** A shaded icosahedron behind a d20 result (number sits on the front face). */
export function d20Svg() {
  const faces = D20_FACES.map(([p, l]) => `<polygon points="${p}" style="fill:color-mix(in srgb, var(--d20) ${l}%, ${l > 70 ? "var(--d20-hi)" : "var(--d20-lo)"})"/>`).join("");
  return `<svg class="d20-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${faces}<g style="fill:none;stroke:var(--d20-edge);stroke-width:1.2;stroke-linejoin:round;opacity:.55"><polygon points="50,3 92,27 92,73 50,97 8,73 8,27"/><polygon points="50,22 80,68 20,68"/><path d="M50 3V22M92 27L50 22M92 27L80 68M92 73L80 68M50 97L80 68M50 97L20 68M8 73L20 68M8 27L20 68M8 27L50 22"/></g></svg>`;
}

// ---- HP/WP gem pips ------------------------------------------------------
export const PIP_MAX = 20;
export function pips(cur, max, kind) {
  if (!(max > 0) || max > PIP_MAX) return "";
  let s = "";
  for (let i = 0; i < max; i++) s += `<i class="${i < cur ? "on" : ""}"></i>`;
  return `<span class="pips ${kind}" style="--cols:${max > 10 ? Math.ceil(max / 2) : max}" aria-hidden="true">${s}</span>`;
}
export function setPips(wrap, cur) {
  const p = wrap && wrap.querySelector(".pips");
  if (!p) return;
  [...p.children].forEach((g, i) => g.classList.toggle("on", i < cur));
}

// ---- Encumbrance: backpack slot squares ----------------------------------
export function slotSquares(used, limit) {
  if (!(limit > 0) || Math.max(used, limit) > 24) return "";
  let s = "";
  const n = Math.max(used, limit);
  for (let i = 0; i < n; i++) s += `<i class="${i < Math.min(used, limit) ? "on" : ""}${i >= limit ? " over" : ""}"></i>`;
  const lvl = used > limit ? "is-over" : used / limit >= 0.75 ? "is-warn" : "";
  return `<div class="enc-slots ${lvl}" aria-hidden="true">${s}</div>`;
}

// ---- Movement: footprint track -------------------------------------------
export function footTrack(left, max) {
  if (!(max > 0)) return "";
  const n = Math.min(12, Math.max(1, Math.round(max / 2)));
  const on = Math.round((Math.max(0, left) / max) * n);
  let s = "";
  for (let i = 0; i < n; i++) s += `<i class="${i < on ? "on" : ""} ${i % 2 ? "r" : "l"}"></i>`;
  return `<div class="foot-track" aria-hidden="true">${s}</div>`;
}

// ---- Line-art illustrations (160×100) ------------------------------------
const ILLO = {
  campfire: `<path class="g" d="M20 86h120"/><path d="M58 84l44-12M58 72l44 12"/><path class="g" d="M80 70c-10-8-12-18-4-30 1 8 5 10 8 10-2-10 4-18 12-24-3 10 4 16 4 26 0 10-8 18-20 18z"/><path d="M80 66c-4-3-5-8-1-13 1 4 3 4 5 3 0 4-1 7-4 10"/><path d="M24 84l18-34 18 34M42 50v34M35 84l7-12 7 12"/><circle cx="128" cy="22" r="7"/><path d="M122 18a8 8 0 0010 10"/><path class="g" d="M34 20l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1zM104 12l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM146 44l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>`,
  swords: `<path class="g" d="M80 22l26 10v18c0 18-12 28-26 34-14-6-26-16-26-34V32z"/><path d="M80 30l18 7v13c0 13-8 20-18 25-10-5-18-12-18-25V37z"/><path d="M28 16l68 68M132 16L64 84"/><path d="M90 72l10-2-2 10M70 72l-10-2 2 10"/><path d="M28 16l6 1-1-6M132 16l-6 1 1-6"/><path d="M96 84l8 8M64 84l-8 8"/><path class="g" d="M20 92h120"/>`,
  quill: `<path d="M44 86h72"/><path d="M52 86V70c0-6 6-10 14-10h8c8 0 14 4 14 10v16"/><path d="M60 60v-6h20v6"/><path class="g" d="M136 10C112 14 94 28 82 56l8-4c16-4 32-18 46-42z"/><path d="M82 56l-6 10M100 34l10 4M92 44l10 2"/><path class="g" d="M20 94h40M100 94h40"/><path d="M122 76c6 0 10 4 16 2"/>`,
  book: `<path d="M40 24h68a8 8 0 018 8v50H48a8 8 0 01-8-8z"/><path d="M40 74a8 8 0 018-8h68"/><path class="g" d="M58 36h40M58 44h40"/><path class="g" d="M116 44h10v18h-10"/><circle class="g" cx="126" cy="53" r="3"/><path d="M92 82v12l6-5 6 5V82"/><path class="g" d="M78 48l4 8 8 4-8 4-4 8-4-8-8-4 8-4z"/>`,
  dragon: `<path class="g" d="M4 92l28-20 12 8 22-20 22 20 14-8 26 20 28 0"/><path d="M24 80l8-6 5 4M60 66l6-6 6 6"/><path d="M4 92h152"/><circle class="g" cx="138" cy="20" r="8"/><g transform="translate(-6 -12)"><path class="f" d="M82 43L50 13c4 9 4 16 2 22 6 0 10 4 11 9 5-1 8 1 10 5zM90 40l6-28 4 13 7-10-1 15 7-5-9 13z"/><path d="M58 50c12-5 26-7 38-11 6-2 10-5 14-9"/><path d="M110 30l11-5-4 4 7 1-10 3"/><circle cx="112.5" cy="30.5" r=".9" fill="currentColor"/><path d="M58 50c-10 4-18 3-26 8-4 3-2 8 3 6"/><path d="M82 43L50 13c4 9 4 16 2 22 6 0 10 4 11 9 5-1 8 1 10 5z"/><path d="M90 40l6-28 4 13 7-10-1 15 7-5-9 13"/><path d="M76 47l-3 8M89 43l2 8"/></g><path class="g" d="M20 28l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8zM150 48l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>`,
  oracle: `<circle cx="80" cy="46" r="26"/><path d="M58 76h44l-6 12H64z"/><path class="g" d="M68 36a14 14 0 0110-8"/><path class="g" d="M80 8v8M44 22l6 6M116 22l-6 6M36 50h8M116 50h8"/>`,
};
/** A line-art illustration (currentColor ink + gilt accents on .g strokes). */
export function illo(key, cls = "illo") {
  const body = ILLO[key];
  return body ? `<svg class="${cls} illo-${key}" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>` : "";
}

// ---- Dragon / Demon moment silhouettes behind the d20 ---------------------
export function momentArt(kind) {
  if (kind === "dragon") return `<svg class="moment dragon-art" viewBox="0 0 200 100" aria-hidden="true" focusable="false"><path d="M100 60c-10-24-34-40-66-40 18 8 28 18 32 30-14-8-32-10-50-4 20 4 32 12 38 24 14-4 30-6 46-10zM100 60c10-24 34-40 66-40-18 8-28 18-32 30 14-8 32-10 50-4-20 4-32 12-38 24-14-4-30-6-46-10z"/><g class="sparks"><path d="M30 14l1.4 3.4 3.4 1.4-3.4 1.4L30 23.6l-1.4-3.4-3.4-1.4 3.4-1.4zM172 12l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2zM160 78l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1zM42 80l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></g></svg>`;
  if (kind === "demon") return `<svg class="moment demon-art" viewBox="0 0 200 100" aria-hidden="true" focusable="false"><path d="M62 20c4 18 14 28 26 32M138 20c-4 18-14 28-26 32"/><g class="smoke"><path d="M40 92c-6-10 6-14 0-24M60 96c-6-10 6-14 0-24M140 96c6-10-6-14 0-24M160 92c6-10-6-14 0-24"/></g></svg>`;
  return "";
}

// ---- Laurel wreath (advancement) -----------------------------------------
export function laurel(cls = "laurel") {
  const leaf = "M0 0c4-4.6 11-4.6 15 0-4 4.6-11 4.6-15 0z";
  const branch = (side) => {
    let out = "";
    for (let i = 0; i < 6; i++) {
      const a = (side < 0 ? 105 + i * 24 : 75 - i * 24) * Math.PI / 180;
      for (const k of [-1, 1]) {
        const r = 33 + k * 5, x = 50 + Math.cos(a) * r, y = 54 + Math.sin(a) * r;
        const tang = (a * 180 / Math.PI) + (side < 0 ? 90 : -90);
        out += `<path d="${leaf}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(tang + k * side * 38).toFixed(0)})"/>`;
      }
    }
    return out;
  };
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="stem" d="M50 88C28 84 16 66 18 40M50 88C72 84 84 66 82 40"/>${branch(-1)}${branch(1)}</svg>`;
}

/** The drake emblem (app brand). */
export const DRAKE = `<svg class="drake" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="29" class="dk-ring"/><g transform="translate(3 1) scale(.92)"><path class="dk-head" d="M38.5 20c-3-4-7-6.5-12-7.5 3.5 2 5.6 4.3 6.8 7.2z"/><path class="dk-head" d="M22.5 31l-7 .5 5.5 4.5M21 39.5l-7 1.5 6 3.5M19.6 48l-7 2 6.2 3"/><path class="dk-head" d="M56 30L53 26C48 24 44 22 40 21L36 19C28 12 20 9 11 8C18 12 24 17 29 23C25 27 22 32 21 38C20 45 19 51 17 58L35 58C35 50 37 44 41 40L50 38L53.5 36L46 34L56 31Z"/><path class="dk-eye" d="M39 26.5c1.6-1.6 3.6-1.6 5 0-1.4 1.2-3.4 1.2-5 0z"/><circle cx="52" cy="28.4" r=".8" class="dk-eye"/><path class="dk-line" d="M47.5 34.6l1 1.7 1.1-1.9M50.8 33.8l.9 1.5 1-1.7M28 44c3-2 6-2.6 9-2.4M26 51c3-1.6 6-2 9-1.8"/></g></svg>`;
