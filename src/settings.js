/* settings.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { CORE_SCHOOLS, DB, MAGICX } from './core.js';

export const Settings = {
    KEY: "dragonbane.settings",
    load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (_) { return {}; } },
    get(k) { return this.load()[k]; },
    set(k, v) { const s = this.load(); s[k] = v; localStorage.setItem(this.KEY, JSON.stringify(s)); },
    bookOfMagic() { return !!this.get("bookOfMagic"); },
    soloMode() { return !!this.get("soloMode"); },
    gmAutomation() { return !!this.get("gmAutomation"); }
  };

  /* =================================================================
   * Magic library — applies revised spells (always) and the Book of
   * Magic expansion (behind the content toggle). See CLAUDE.md §10.
   * ================================================================= */

export const Magic = {
    enabled() { return Settings.bookOfMagic(); },
    cap(k) { return k.charAt(0).toUpperCase() + k.slice(1); },
    // Effective tricks+spells for a core school, with revised overrides (always)
    // and Book of Magic additions (when enabled).
    corePool(key) {
      const base = (DB.spells && DB.spells[key]) || { tricks: [], spells: [] };
      const schoolName = key === "general" ? "General" : this.cap(key);
      const revised = (MAGICX.revisedSpells || []).filter((s) => s.school.toLowerCase() === schoolName.toLowerCase());
      const revByName = {}; revised.forEach((s) => revByName[s.name] = s);
      let spells = (base.spells || []).map((s) => revByName[s.name] || s);
      revised.forEach((s) => { if (!spells.some((x) => x.name === s.name)) spells.push(s); }); // e.g. Sleep added to Animism
      let tricks = [...(base.tricks || [])];
      if (this.enabled() && MAGICX.newSpells && MAGICX.newSpells[key]) {
        tricks = tricks.concat(MAGICX.newSpells[key].tricks || []);
        spells = spells.concat(MAGICX.newSpells[key].spells || []);
      }
      return { tricks, spells, name: schoolName };
    },
    newSchoolPool(key) { const s = (MAGICX.schools || {})[key]; return s ? { tricks: s.tricks || [], spells: s.spells || [], name: this.cap(key), entry: s.entry } : { tricks: [], spells: [], name: this.cap(key) }; },
    poolFor(key) { return CORE_SCHOOLS.includes(key) ? this.corePool(key) : this.newSchoolPool(key); },
    // Schools a newly created mage may select (Dracomancy is learn-in-play; Harmonism is bard-only).
    mageSchools() {
      const core = [["animism", "Animism"], ["elementalism", "Elementalism"], ["mentalism", "Mentalism"]];
      if (!this.enabled()) return core;
      const extra = Object.keys(MAGICX.schools || {}).filter((k) => k !== "dracomancy" && k !== "harmonism").map((k) => [k, this.cap(k)]);
      return core.concat(extra);
    },
    // All school keys to show in the Rules browser (core always; new ones when enabled).
    browseSchools() { return this.enabled() ? CORE_SCHOOLS.concat(Object.keys(MAGICX.schools || {})) : CORE_SCHOOLS; },
    // A reasonable trained-skill list for a new-school mage (the Book of Magic lists
    // recommended skills per school; not yet extracted — this generic set is used as a fallback).
    fallbackMageSkills(schoolDisplayName) { return [schoolDisplayName, "Awareness", "Evade", "Healing", "Languages", "Myths & Legends", "Spot Hidden", "Staves"]; }
  };

  // Parse a profession gear-row string into { items[], money } — rolls dice expressions.
