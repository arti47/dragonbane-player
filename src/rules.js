/* rules.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { $, DB, Dice, MAGICX } from './core.js';
import { Magic } from './settings.js';
import { Wizard } from './wizard.js';

export const Calc = {
    lookup(table, score) { const row = (table || []).find((r) => score >= r.min && score <= r.max); return row ? row.value : null; },
    baseChance(score) { return this.lookup(DB.tables.baseChance, score) || 0; },
    damageBonus(score) { return this.lookup(DB.tables.damageBonus, score); }, // null | "D4" | "D6"
    movementMod(score) { return this.lookup(DB.tables.movementMod, score) || 0; },
    dmgBonusLabel(score) { const v = this.damageBonus(score); return v ? "+" + v : "—"; }
  };


export function findHeroicAbility(name) {
    let h = (DB.heroicAbilities || []).find((x) => x.name === name);
    if (!h && typeof DRAGONBANE_SOLO !== "undefined" && DRAGONBANE_SOLO.heroicAbilities) {
      h = DRAGONBANE_SOLO.heroicAbilities.find((x) => x.name === name);
    }
    return h || null;
  }

  // Is a heroic ability's skill requirement met by the character's current
  // skills? Handles the rulebook req phrasings ("Acrobatics 12", "Any melee
  // weapon skill 12", "Axes, Hammers, or Swords 12", "Any magic school 12").

export function heroicReqMet(c, req) {
    if (!req) return true;
    const m = /(\d+)\s*$/.exec(req); if (!m) return true;
    const need = parseInt(m[1], 10);
    const head = req.slice(0, m.index).trim().toLowerCase();
    const entries = Object.entries(c.skills || {});
    const RANGED = ["Bows", "Crossbows", "Slings"];
    const has = (pred) => entries.some(([n, s]) => pred(n, s) && s.level >= need);
    if (/^any str-based melee weapon skill/.test(head)) return has((n, s) => s.kind === "weapon" && s.attribute === "STR" && !RANGED.includes(n));
    if (/^any melee weapon skill/.test(head)) return has((n, s) => s.kind === "weapon" && !RANGED.includes(n));
    if (/^any weapon skill/.test(head)) return has((n, s) => s.kind === "weapon");
    if (/^any magic school/.test(head)) return has((n, s) => s.kind === "magic");
    const names = head.replace(/\bor\b/g, ",").split(",").map((x) => x.trim()).filter(Boolean);
    const matched = names.map((x) => entries.find(([n]) => n.toLowerCase() === x)).filter(Boolean);
    if (matched.length) return matched.some(([, s]) => s.level >= need);
    return true; // unknown pattern → don't block
  }


export function resolveEquippedWeapons(invItems) {
    if (!invItems || !Array.isArray(invItems)) return [];
    const dbWpns = DB.weapons || [];
    const found = [];
    invItems.forEach((it) => {
      const rawName = typeof it === "string" ? it : (it && it.name) || "";
      String(rawName).split("/").forEach((part) => {
        let clean = part.toLowerCase().replace(/[\s\-_(),]/g, "");
        if (!clean) return;
        if (clean.includes("lightcrossbow")) clean = "crossbowlight";
        if (clean.includes("heavycrossbow")) clean = "crossbowheavy";
        if (clean.includes("handcrossbow")) clean = "crossbowhand";
        if (clean.includes("warhammersmall") || clean.includes("lightwarhammer")) clean = "warhammerlight";
        if (clean.includes("warhammerlarge") || clean.includes("heavywarhammer")) clean = "warhammerheavy";
        if (clean.includes("shortsword")) clean = "shortsword";

        const w = dbWpns.find((dw) => {
          const cdw = dw.name.toLowerCase().replace(/[\s\-_(),]/g, "");
          return cdw === clean || (clean.length >= 4 && cdw.includes(clean)) || (cdw.length >= 4 && clean.includes(cdw));
        });
        if (w && !found.some((x) => x.name === w.name)) found.push(w);
      });
    });
    return found;
  }

  // Loose name normaliser shared by equipment matchers.

export const normName = (s) => String(s || "").toLowerCase().replace(/\(×?\s*\d+\)/g, "").replace(/[\s\-_(),]/g, "");
  // Match an inventory item name to a DB.armor / DB.helmets entry (null if none).

export function resolveArmorItem(name) {
    const clean = normName(name); if (!clean) return null;
    return (DB.armor || []).find((a) => { const c = normName(a.name); return c === clean || (clean.length >= 4 && c.includes(clean)) || (c.length >= 4 && clean.includes(c)); }) || null;
  }

export function resolveHelmetItem(name) {
    const clean = normName(name); if (!clean) return null;
    return (DB.helmets || []).find((h) => { const c = normName(h.name); return c === clean || (clean.length >= 4 && c.includes(clean)) || (c.length >= 4 && clean.includes(c)); }) || null;
  }
  // Classify an item into an equip slot: "helmet" | "armor" | "weapon" | null.
  // Helmet is checked before armor so "Great Helm" doesn't match armor.

export function classifyItem(name) {
    if (resolveHelmetItem(name)) return "helmet";
    if (resolveArmorItem(name)) return "armor";
    if (resolveEquippedWeapons([name]).length) return "weapon";
    return null;
  }

  /* =================================================================
   * App settings (local)
   * ================================================================= */

export function parseGear(rowText) {
    const items = [], money = { gold: 0, silver: 0, copper: 0 };
    String(rowText).split(",").map((s) => s.trim()).filter(Boolean).forEach((piece) => {
      let m = /^(\d*d\d+|\d+)\s+(gold|silver|copper)$/i.exec(piece);
      if (m) { money[m[2].toLowerCase()] += Dice.roll(m[1]); return; }
      m = /^(\d*d\d+)\s+(.+)$/i.exec(piece); // e.g. "D6 food rations"
      if (m) { items.push(m[2] + " (×" + Dice.roll(m[1]) + ")"); return; }
      if (piece.includes("/")) {
        piece.split("/").map(s => s.trim()).filter(Boolean).forEach(sub => items.push(sub));
      } else {
        items.push(piece);
      }
    });
    return { items, money };
  }

  // Build the full skills map for a character (all core skills + trained magic school).

export function buildSkills(attrs, trainedSet, mageSchool) {
    const skills = {};
    (DB.skills || []).forEach((sk) => {
      if (sk.kind === "magic" && (!mageSchool || sk.name.toLowerCase() !== mageSchool)) return; // only the chosen school
      const base = Calc.baseChance(attrs[sk.attribute]);
      const trained = trainedSet.has(sk.name);
      skills[sk.name] = { attribute: sk.attribute, kind: sk.kind, base, level: trained ? base * 2 : base, trained, mark: false };
    });
    // Book of Magic schools aren't in DB.skills — add the chosen one as an INT-based magic skill.
    if (mageSchool && !["general", "animism", "elementalism", "mentalism"].includes(mageSchool)) {
      const display = mageSchool.charAt(0).toUpperCase() + mageSchool.slice(1);
      const base = Calc.baseChance(attrs.INT);
      const trained = trainedSet.has(display);
      skills[display] = { attribute: "INT", kind: "magic", base, level: trained ? base * 2 : base, trained, mark: false };
    }
    return skills;
  }

  /* =================================================================
   * Character Creation Wizard (Phase 1)
   * ================================================================= */

export function resolveCanonicalSpell(sp, fallbackSchool) {
    if (!sp) return null;
    const name = typeof sp === "string" ? sp : sp?.name;
    if (!name) return typeof sp === "object" ? sp : null;
    if (typeof sp === "object" && sp.text && sp.school && sp.rank != null) return sp;

    const clean = normName(name);
    const mx = typeof MAGICX !== "undefined" ? MAGICX : (window.DRAGONBANE_MAGIC || {});

    const rev = (mx.revisedSpells || []).find(x => x && normName(x.name) === clean);
    if (rev) return Object.assign({}, typeof sp === "object" ? sp : {}, rev, { name: rev.name });

    if (typeof DB !== "undefined" && DB.spells) {
      for (const [schKey, pool] of Object.entries(DB.spells)) {
        if (!pool) continue;
        const t = (pool.tricks || []).find(x => x && normName(x.name) === clean);
        if (t) return Object.assign({ rank: 0, school: schKey }, typeof sp === "object" ? sp : {}, t, { name: t.name });
        const s = (pool.spells || []).find(x => x && normName(x.name) === clean);
        if (s) return Object.assign({ school: schKey }, typeof sp === "object" ? sp : {}, s, { name: s.name });
      }
    }

    for (const [schKey, pool] of Object.entries(mx.newSpells || {})) {
      if (!pool) continue;
      const t = (pool.tricks || []).find(x => x && normName(x.name) === clean);
      if (t) return Object.assign({ rank: 0, school: schKey }, typeof sp === "object" ? sp : {}, t, { name: t.name });
      const s = (pool.spells || []).find(x => x && normName(x.name) === clean);
      if (s) return Object.assign({ school: schKey }, typeof sp === "object" ? sp : {}, s, { name: s.name });
    }

    for (const [schKey, pool] of Object.entries(mx.schools || {})) {
      if (!pool) continue;
      const t = (pool.tricks || []).find(x => x && normName(x.name) === clean);
      if (t) return Object.assign({ rank: 0, school: schKey }, typeof sp === "object" ? sp : {}, t, { name: t.name });
      const s = (pool.spells || []).find(x => x && normName(x.name) === clean);
      if (s) return Object.assign({ school: schKey }, typeof sp === "object" ? sp : {}, s, { name: s.name });
    }

    return typeof sp === "object"
      ? Object.assign({ name, rank: 1, school: fallbackSchool || "general", text: sp.text || sp.desc || "Magical spell incantation." }, sp)
      : { name, rank: 1, school: fallbackSchool || "general", text: "Magical spell incantation." };
  }

  // Ensure a character's inventory uses the structured shape (migrates legacy data).
