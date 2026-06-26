/* core.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
export const DB = window.DRAGONBANE || {};

export const $ = (sel, root = document) => root.querySelector(sel);


export const FANTASY_WORDS = ["dragon","demon","sword","shield","spear","mage","knight","wolf","falcon","griffon","shadow","flame","frost","storm","thunder","crown","skull","rune","iron","gold","ruby","emerald","forest","mountain","river","cavern","tower","castle","keep","dungeon","red","blue","dark","light","wild","ancient","mighty","silent","broken","golden"];


export const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const sectionTitle = (t) => `<div class="section-title"><h2>${esc(t)}</h2><span class="rule"></span></div>`;

export const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const mountScreen = (node) => { const s = $("#screen"); s.innerHTML = ""; s.appendChild(node); window.scrollTo(0, 0); };

  /* =================================================================
   * Dice + rules calculations (from data.js tables)
   * ================================================================= */

export const Dice = {
    d(sides) { return Math.floor(Math.random() * sides) + 1; },
    // Parse and roll a spec like "D6", "2D8", "4D6".
    roll(spec) {
      const m = /^(\d*)d(\d+)$/i.exec(String(spec).trim());
      if (!m) return parseInt(spec, 10) || 0;
      const n = parseInt(m[1] || "1", 10), sides = parseInt(m[2], 10);
      let t = 0; for (let i = 0; i < n; i++) t += this.d(sides);
      return t;
    },
    // 4D6, drop the lowest die → 3-18.
    attribute() {
      const r = [this.d(6), this.d(6), this.d(6), this.d(6)].sort((a, b) => a - b);
      return r[1] + r[2] + r[3];
    }
  };


export const MAGICX = window.DRAGONBANE_MAGIC || {};

export const CORE_SCHOOLS = ["general", "animism", "elementalism", "mentalism"];

export const MISHAPS = [
    "The magical powers leave you Dazed.",
    "The spellcasting suddenly makes you Exhausted.",
    "The energies take a toll on your body and make you Sickly.",
    "You lose control of the spell, which makes you very Angry.",
    "The spell subjects you to demonic visions that leave you Scared.",
    "You see the world beyond the veil and feel Disheartened.",
    "The magic ravages your body, inflicting D6 damage per power level.",
    "The spell drains your willpower; you lose D6 WP per power level.",
    "The spell gives rise to a magical disease (virulence 3D6); you and everyone you contact this shift are exposed.",
    "Another random spell of yours activates instead, same target and power level.",
    "You vomit a frog the moment you tell a lie. Roll D4 each morning; on a 1 it ends (or DISPEL).",
    "Any gold or silver you touch withers to dust. Roll D4 each morning; on a 1 it ends (or DISPEL).",
    "The spell blinds you (act as in total darkness). Roll D4 each morning; on a 1 you recover (or DISPEL).",
    "Amnesia — you forget who you and the other PCs are. Roll D4 each morning; on a 1 it returns.",
    "The spell also affects a friend/unintended victim (a healing spell affects an enemy).",
    "The spell backfires — an offensive spell hits you; a protecting/healing spell inflicts damage.",
    "You turn into an animal (D6: cat/fox/goat/wolf/deer/bear). Roll D4 each morning; on a 1 you revert.",
    "You become one age category younger (attributes change, skills don't). Permanent.",
    "You become one age category older (attributes change, skills don't). Permanent.",
    "Your magic attracts a demon, which shows up within the shift to cause trouble (GM's call)."
  ];

export const CONDITION_BY_MISHAP = ["dazed","exhausted","sickly","angry","scared","disheartened"];

