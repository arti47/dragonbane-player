/* derived.js — Dragonbane Player (ES module split of the former app.js IIFE).
   See CLAUDE.md §5 for the module map. */
import { DB } from './core.js';
import { classifyItem, normName, resolveArmorItem, resolveCanonicalSpell, resolveHelmetItem } from './rules.js';

export function normalizeInventory(c) {
    if (!c) return;
    if (!c.identity) c.identity = { name: "Unnamed Hero", kin: "Human", profession: "Fighter" };
    if (!c.state) c.state = {};
    if (!c.derived) c.derived = { hpMax: 10, wpMax: 10 };
    if (!c.attributes) c.attributes = {};
    if (!c.skills) c.skills = {};
    if (!c.spells) c.spells = { tricks: [], known: [] };
    c.spells.tricks = (c.spells.tricks || []).map(x => resolveCanonicalSpell(x, c.identity?.mageSchool)).filter(Boolean);
    c.spells.known = (c.spells.known || []).map(x => resolveCanonicalSpell(x, c.identity?.mageSchool)).filter(Boolean);
    const inv = c.inventory || (c.inventory = {});
    inv.items = (inv.items || []).map((it) => typeof it === "string"
      ? { name: it, weight: 1, equipped: false }
      : { name: it?.name || "Item", weight: it?.weight == null ? 1 : it.weight, equipped: !!it?.equipped, ...(it?.durability != null ? { durability: it.durability } : {}) });
    inv.tiny = (inv.tiny || []).map((it) => typeof it === "string" ? { name: it } : it || { name: "Tiny" });
    inv.mementos = (inv.mementos || []).map((m) => typeof m === "string" ? m : m?.name || "");
    inv.money = Object.assign({ gold: 0, silver: 0, copper: 0 }, inv.money || {});
    if (!c.state.conditions) c.state.conditions = {};
    if (!c.state.deathRolls) c.state.deathRolls = { successes: 0, failures: 0 };
    if (!Array.isArray(c.companions)) c.companions = [];
    if (!Array.isArray(c.effects)) c.effects = [];
    if (typeof c.state.wpPenalty !== "number") c.state.wpPenalty = 0;
    if (typeof c.state.weaknessCooldown !== "boolean") c.state.weaknessCooldown = false;
    if (!c.state.teacherTrained || typeof c.state.teacherTrained !== "object") c.state.teacherTrained = {};
    if (c.state.familiar === undefined) c.state.familiar = null;
    if (typeof c.state.prone !== "boolean") c.state.prone = false;
    if (!c.state.time || typeof c.state.time !== "object") c.state.time = { round: 0, stretch: 0, shift: 0 };
    if (typeof c.state.roundRestUsed !== "boolean") c.state.roundRestUsed = false;
    if (typeof c.state.awakeShifts !== "number") c.state.awakeShifts = 0;
    if (!c.state.afflictions || typeof c.state.afflictions !== "object") c.state.afflictions = { cold: false, disease: null };
  }
  // Effective max WP after permanent reductions (rituals, corruption); restorable via Focused.

export const abilityCount = (c, name) => (c.abilities || []).filter((a) => a.name === name).length;
  // Effective max HP/WP: Robust adds +2 HP per pick, Focused +2 WP per pick;
  // WP is further reduced by permanent loss (rituals/corruption).

export const eqEnchantBonus = (c, stat) => (c.inventory?.items || []).filter(x => x && x.equipped && x.name.match(new RegExp(stat,"i"))).length * 2;

export const effHpMax = (c) => (c.derived.hpMax || 0) + 2 * abilityCount(c, "Robust") + eqEnchantBonus(c, "Health|Vitality");

export const effWpMax = (c) => Math.max(0, (c.derived.wpMax || 0) + 2 * abilityCount(c, "Focused") + eqEnchantBonus(c, "Willpower|Focus|Mind") - (c.state.wpPenalty || 0));
  // Does a spell summon/raise a creature (gets its own roster entry)?

export function isSummonSpell(sp) {
    const t = ((sp.name || "") + " " + (sp.text || "")).toLowerCase();
    return /\bsummon|\braise |\banimate |counts as a monster|familiar|homunculus|golem|earth elemental|fire elemental|wind elemental|water elemental|skeletal horde|guardian demon|bestial helper|companion/.test(t);
  }
  // A spell worth tracking as an ongoing effect (lasting, non-instant duration).

export function isTrackableSpell(sp) { return sp.duration && !/instant/i.test(sp.duration); }

export function isConcentration(sp) { return sp.duration && /concentration/i.test(sp.duration); }

export const encLimit = (c) => Math.ceil((c.attributes.STR || 0) / 2);
  // Read a quantity from an item ("Field Ration (×6)" → 6, or it.qty, else 1).

export const itemQty = (it) => { const m = /\(×?\s*(\d+)\)/.exec(it.name || ""); return m ? parseInt(m[1], 10) : (Number(it.qty) || 1); };
  // Slot-based encumbrance (rules-accurate): equipped items are exempt; rations
  // group 4-per-slot; a quiver = 1 slot regardless of arrows; slingstones = 0;
  // coins add 1 slot per 100 total. Heavier items consume ceil(weight) slots.

export const encUsed = (c) => {
    let slots = 0, rations = 0;
    (c.inventory.items || []).forEach((it) => {
      if (it.equipped) return; // worn armor/helmet + weapons-at-hand are exempt
      const n = (it.name || "").toLowerCase();
      if (/ration/.test(n)) { rations += itemQty(it); return; }
      if (/sling.?stone|slingstone/.test(n)) return; // 0 slots
      if (/quiver|arrows|bolts/.test(n)) { slots += 1; return; } // a quiver = 1 slot
      slots += Math.max(0, Math.ceil(Number(it.weight) || 0));
    });
    slots += Math.ceil(rations / 4);
    const money = c.inventory.money || {};
    const coins = (money.gold || 0) + (money.silver || 0) + (money.copper || 0);
    slots += Math.floor(coins / ((DB.currency && DB.currency.coinsPerItem) || 100));
    return slots;
  };
  // The character's currently-equipped armor / helmet DB entries (for banes,
  // metal-magic restriction, and combat armor), derived from equipped items.

export function equippedArmor(c) { const it = (c.inventory.items || []).find((x) => x.equipped && classifyItem(x.name) === "armor"); return it ? resolveArmorItem(it.name) : null; }

export function equippedHelmet(c) { const it = (c.inventory.items || []).find((x) => x.equipped && classifyItem(x.name) === "helmet"); return it ? resolveHelmetItem(it.name) : null; }
  // Skills currently baned by worn armor + helmet (e.g. Plate → Acrobatics/Evade/Sneaking).

export function armorBanedSkills(c) {
    const set = new Set();
    const a = equippedArmor(c); if (a) (a.banes || []).forEach((s) => set.add(s));
    const h = equippedHelmet(c); if (h) (h.banes || []).forEach((s) => set.add(s));
    return set;
  }
  // Burn-out die (4/6/8) for a light-source item, from DB.gear (null if not a light).

export function lightDieFor(name) { const g = (DB.gear || []).find((x) => x.lightDie && normName(x.name) === normName(name)); return g ? g.lightDie : null; }

