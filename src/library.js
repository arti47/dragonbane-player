/* library.js — the Rules library screen: Guides + Reference categories, compact
   tap-to-expand entry rows, tables for weapons/armor, entry-level search with
   highlighting, a sticky open-category header and a back-to-top button.
   Guide text is the original wording, only re-laid out as steps/lists. */
import { CORE_SCHOOLS, DB, MAGICX, el, esc, helpBox, sectionTitle } from './core.js';
import { Calc, findHeroicAbility, resolveCanonicalSpell } from './rules.js';
import { Magic, Settings } from './settings.js';
import { GM } from './gm.js';
import { icon } from './icons.js';
import { emblem, illo, itemGlyph } from './graphics.js';

// ---- Small builders --------------------------------------------------------
const tag = (t) => `<span class="tag">${t}</span>`;
/** A tap-to-expand entry row: name + tags on the summary, body underneath. */
const entry = (name, tags, body, opts = {}) =>
  `<details class="rl-entry${opts.cls ? " " + opts.cls : ""}"${opts.open ? " open" : ""}${opts.attrs || ""}><summary${opts.sumCls ? ` class="${opts.sumCls}"` : ""}><span class="rl-name">${name}</span>${tags ? `<span class="rl-tags">${tags}</span>` : ""}</summary><div class="rl-text">${body}</div></details>`;
const block = (title, inner, cls = "") => `<section class="rl-block ${cls}">${title ? `<h4 class="rl-h">${title}</h4>` : ""}${inner}</section>`;
const ul = (items) => `<ul class="rl-list">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const steps = (items) => `<ol class="rl-steps">${items.map(([n, x]) => `<li><span class="rl-num" aria-hidden="true">${n}</span><span>${x}</span></li>`).join("")}</ol>`;
const flow = (items) => `<p class="rl-flow">${items.map((x, i) => `<span class="rl-fi"><span class="rl-chip">${x}</span>${i < items.length - 1 ? '<span class="rl-arrow" aria-hidden="true">→</span>' : ""}</span>`).join("")}</p>`;
const note = (x) => `<p class="rl-note">${x}</p>`;
const d6 = (rows) => `<div class="d6-list">${rows.map(([n, x]) => `<p class="d6-row rl-row"><span class="d6-face">${n}</span><span>${x}</span></p>`).join("")}</div>`;

// ---- Guides ----------------------------------------------------------------
function howToPlay() {
  const intro = `<p class="rl-intro">Combined rules primer + how to drive this app. Four tabs: <b>Hero</b> (your heroes and sheet), <b>Fight</b> (initiative and combat), <b>Story</b> (Solo or GM), <b>Book</b> (these rules + Settings). The round seal in the middle always shows your next move.</p>`;
  const first = entry("🎬 Your first session — Start → Keep playing → End well", "",
    block("START.", steps([
      ["①", `On <b>Hero</b>, tap <b>Quick hero</b> (one tap), <b>Pre-made</b> (a Core Set hero) or <b>Build</b> (step by step).`],
      ["②", `Choose how you'll play. <b>With friends:</b> one person opens <b>Book → Settings → Play with friends</b>, creates a campaign and shares the join code; everyone else joins. <b>Solo (no GM):</b> open <b>Story → Solo</b> and pick your hero under <b>Rolling as</b>.`],
      ["③", `Set the opening <b>scene</b> — where you are and your goal (group: the GM says it aloud; solo: write it in the <b>Scene</b> box).`],
    ])) +
    block("KEEP PLAYING — repeat this each scene:", steps([
      ["④", `Decide what happens: the <b>GM</b> narrates, or (solo) tap <b>Ask</b> for the oracle's answer.`],
      ["⑤", `<b>Act:</b> tap a <b>skill tile</b> (or the seal → <b>Roll</b>) to roll <b>D20 ≤ its level</b>. Miss? <b>Push</b> (take a Condition and re-roll) or (solo) <b>🎲 Fail forward</b>.`],
      ["⑥", `<b>Fights</b> run on <b>Fight</b>: add foes from the drawer, then on your card choose <b>Attack · Cast · Move · Other</b> and <b>End turn</b>.`],
      ["⑦", `<b>Recover</b> with the sheet's <b>Rest</b> button (Round / Stretch / Shift).`],
      ["⑧", `Keep notes on the sheet's <b>Story</b> tab, and (solo) track open questions as <b>🧵 Threads</b>.`],
    ])) +
    block("END WELL.", steps([
      ["⑨", `At a good stopping point, on the <b>Skills</b> tab tap <b>End session — advancement</b>: answer the 5 questions, then roll each marked skill to try to improve it.`],
      ["⑩", `<b>Solo:</b> when a mission is complete, tap <b>🏅 Mission +5</b> instead.`],
      ["⑪", `Progress saves automatically (and syncs in a campaign; use <b>Settings → Advanced → Export</b> for a backup).`],
      ["⑫", `Jot the <b>next scene</b> in your notes so you can pick up easily next time.`],
    ])), { open: true, cls: "rl-guide" });
  const setup = entry("① Setup &amp; storage", "", ul([
    `The app runs offline in <b>Local</b> mode (top-right pill) — no login.`,
    `For a shared party, tap the pill or <b>Settings → Play with friends</b> to <b>create a campaign</b> (get a join code) or <b>join</b> one.`,
    `Optional Google link in Settings backs up across devices.`,
    `Settings: pick <b>Story table</b>, <b>Solo</b> or <b>Full rules</b>, and your <b>Experience</b> (New / Some / Veteran). Every switch is under <b>Advanced settings</b>.`,
  ]), { cls: "rl-guide" });
  const hero = entry("② Make a hero", "",
    `<p><b>Hero → Build</b> runs the wizard one question at a time:</p>` +
    steps([`roll 4D6-drop-lowest ×6 and assign to STR/CON/AGL/INT/WIL/CHA`, `pick kin`, `profession (mages/Harmonism-bards pick a school)`, `age`, `trained skills (6 + age bonus)`, `heroic ability or magic`, `gear`, `details.`].map((x, i) => [i + 1, x])) +
    note(`Or <b>Quick hero</b> (random but legal) / <b>Pre-made</b> for a Core Set PC.`) +
    note(`Everything derived (HP=CON, WP=WIL, movement, damage bonus, skill chances) is computed for you. <b>✎ Edit</b> on the sheet shows the setup controls.`), { cls: "rl-guide" });
  const conds = (DB.conditions || []).map((c) => `${esc(c.name)}/${esc(c.attribute)}`);
  const core = entry("③ Core roll mechanic", "", ul([
    `Roll <b>D20 ≤ skill</b> (tap a skill tile on the sheet). The dice table shows the 1–20 strip: green succeeds.`,
    `<b>1 = Dragon</b> (crit), <b>20 = Demon</b> (fumble) — both auto-add an advancement mark.`,
    `A <b>boon</b> adds a D20 and you keep the lowest, a <b>bane</b> adds one and you keep the highest; boons and banes cancel one for one (conditions and worn armor add banes for you).`,
    `Fail a roll → <b>Push</b>: take a condition (its attribute is then baned) and re-roll.`,
  ]) + `<p class="rl-sub">Six conditions:</p><p class="rl-chips">${conds.map(tag).join("")}</p>`, { cls: "rl-guide" });
  const combat = entry("④ Combat", "", ul([
    `<b>Fight</b> tab: add heroes, Bestiary monsters, rulebook NPCs or custom foes from the <b>＋ Add combatants</b> drawer.`,
    `Adding a fighter draws initiative (cards 1–10, low acts first); the card strip shows the order.`,
    `Each turn = move + action: <b>Attack · Cast · Move · Other</b> (Dash, Parry, Dodge, Help…). The damage applier adds the damage bonus and subtracts armor.`,
    `Monsters auto-hit (roll their D6 table ×Ferocity); NPCs roll d20.`,
    `<b>Next turn/round</b> redraws.`,
    `GM-locked in a synced campaign.`,
  ]), { cls: "rl-guide" });
  const magic = entry("⑤ Magic", "", ul([
    `Tap a spell card on the <b>Magic</b> tab (or Cast on your fight card).`,
    `Tricks (rank 0) cost 1 WP, auto-succeed.`,
    `Spells cost 2 WP/level (power level 1–3), roll the school skill; failure still spends WP; Demon → mishap table.`,
    `Metal armor/weapon blocks casting.`,
    `The VTT resolution card handles heal/damage/AoE/summon/etc.`,
    `Learn new spells/schools with <b>✎ Edit → ＋ Learn</b> on the Magic tab.`,
  ]), { cls: "rl-guide" });
  const rest = entry("⑥ Rest, death &amp; advancement", "",
    `<dl class="rl-dl"><dt>Round rest</dt><dd>+D6 WP (once/shift)</dd><dt>Stretch rest</dt><dd>+D6 HP/WP + heal a condition (once/shift)</dd><dt>Shift rest</dt><dd>full HP/WP + clear conditions.</dd></dl>` +
    ul([`At <b>0 HP</b> a dying panel runs death rolls (D20 ≤ CON; 3 successes stabilize, 3 fail = death).`,
      `<b>End session — advancement</b> answers the 5 questions then rolls each marked skill (improve on a roll over its level, max 18).`]), { cls: "rl-guide" });
  const group = entry("▶ Running a NON-SOLO game (group + GM)", "", ul([
    `One player <b>creates a campaign</b> (Settings) → becomes GM → shares the join code; others <b>join</b>.`,
    `Add your PC to the party (Hero card toggle / sheet → Edit).`,
    `Sheets, party HP/WP/conditions, and the combat tracker sync live.`,
    `The GM opens <b>Story → GM</b>: a phase wheel, the party as crests (tap one to deal damage, set a condition, run a fear attack, open the sheet), and tiles to ask for rolls, call rests, drop monsters into the fight, message players and roll the GM tables.`,
    `Combat controls (initiative/turns/reset) are GM-locked in a synced campaign.`,
  ]) + `<p class="rl-sub">Loop:</p>` + flow([`GM frames a scene`, `players roll skills`, `combat as needed`, `rest`, `end-of-session advancement.`]), { cls: "rl-guide" });
  const solo = entry("🧭 Running a SOLO game (no GM)", "", ul([
    `Open <b>Story → Solo</b> (it offers to switch Solo Mode on); creation then grants a 2nd free heroic ability (Army of One / Sole Survivor).`,
    `The bar at the bottom: <b>Ask</b> (Fortune Chart oracle at a likelihood), <b>Inspire</b> (3D20 prompt), <b>Twist</b> (Dragon/Demon), <b>Foe</b> (NPC generator + attack-table AI) and <b>Travel</b> (random shift, Camp/Forage rolls, Journey Mishap with its WIL/CON check). Every result is written into <b>Story so far</b>.`,
    `Pick your hero under <b>Rolling as</b> so those rolls use your sheet + full dice engine.`,
    `Fail-forward turns failures into complications.`,
  ]) + `<p class="rl-sub">Loop:</p>` + flow([`set a scene`, `ask the oracle`, `roll skills/combat`, `mishaps`, `advance (Solo: <b>Mission +5 marks</b>).`]), { cls: "rl-guide" });
  const terms = [
    ["HP", "Hit Points — how much damage you can take (0 = dying)."], ["WP", "Willpower Points — the fuel for spells &amp; heroic abilities."],
    ["Skill", "a rating 1–18; you succeed by rolling D20 <b>≤</b> it (roll-under)."], ["Boon", "roll 2D20, keep the lower (better)."],
    ["Bane", "roll 2D20, keep the higher (worse)."], ["Push", "re-roll a failed check by taking a Condition."],
    ["Condition", "one of six states (Exhausted/Sickly/Dazed/Angry/Scared/Disheartened); each banes rolls using its attribute."],
    ["Dragon", "a natural 1 = critical success."], ["Demon", "a natural 20 = fumble."], ["Kin", "your ancestry (Human, Elf, Dwarf…)."],
    ["Heroic ability", "a special power (some cost WP)."], ["Round", "~10s of combat."], ["Stretch", "a short break (minutes)."],
    ["Shift", "~6 hours (Morning/Day/Evening/Night)."], ["Advancement mark", "a tick a skill earns on a Dragon/Demon; at session end you may roll to improve it."],
    ["Oracle", "(solo) a yes/no answer engine that stands in for a GM."],
  ];
  const glossary = entry("🔤 Glossary (game terms)", "", `<dl class="rl-dl rl-gloss">${terms.map(([k, v]) => `<div class="rl-row"><dt>${k}</dt><dd>${v.replace(/\//g, "/<wbr>")}</dd></div>`).join("")}</dl>`, { cls: "rl-guide" });
  return intro + first + setup + hero + core + combat + magic + rest + group + solo + glossary;
}

function stages() {
  const six = (DB.conditions || []).map((c) => esc(c.name)).join(", ");
  return entry("⏱️ Time Scales (Rounds vs Shifts)", "", `<dl class="rl-dl"><dt>Combat Rounds:</dt><dd>Roughly 10 seconds. Every combatant gets 1 Turn (Action + Movement).</dd><dt>Wilderness Shifts:</dt><dd>Roughly 6 hours (Morning, Day, Evening, Night).</dd></dl>`, { open: true, cls: "rl-guide" }) +
    entry("⚔️ Combat Stage Sequence", "", steps([
      ["1", `<b>Draw Initiative:</b> 1 to 10 ascending.`], ["2", `<b>Take Turns:</b> Move + Action (Attack, Cast, Dash, Rally).`],
      ["3", `<b>Reaction:</b> Parry or Evade (spends your upcoming action).`], ["4", `<b>End Round:</b> Redraw cards if needed.`],
    ]), { cls: "rl-guide" }) +
    entry("🎲 Core D20 Mechanic &amp; Pushing", "", ul([
      `Roll D20 ≤ Skill level.`, `1 is Dragon (Critical), 20 is Demon (Mishap).`,
      `If you fail, you can <b>Push</b> the roll by accepting a Condition Bane (${six}).`,
    ]), { cls: "rl-guide" });
}

function journeys() {
  return entry("Time Measurement", "", ul([`In wilderness, time is measured in <b>Shifts</b> (Morning, Day, Evening, Night — ~6h each).`, `Travel speed: 1 node/hex per shift.`]), { open: true, cls: "rl-guide" }) +
    entry("⛺ Camp &amp; Rest", "", ul([`Making camp requires a Bushcraft check.`, `Success lets party rest (Shift rest = restore full HP/WP).`, `Failure means no rest &amp; roll on Mishap Table.`]), { cls: "rl-guide" }) +
    entry("🍄 Foraging &amp; Hunting", "", `<p>Spend a shift making Bushcraft/Hunting checks to gather rations.</p>`, { cls: "rl-guide" }) +
    entry("🎲 Journey Mishaps (D6)", "", d6((DB.journeyMishaps || []).map((x) => [x.d6, esc(x.effect)])), { cls: "rl-guide" });
}

// ---- Reference -------------------------------------------------------------
function kin() {
  return (DB.kin || []).map((k) => entry(`${emblem("kin", k.key)} ${esc(k.name)}`, tag(`Move ${k.movement}`),
    (k.abilities || []).map((a) => `<p class="rl-ab"><b>${esc(a.name)}</b> ${a.wp ? tag(`WP ${a.wp}`) : tag("No WP")}</p><p class="rl-desc">${esc(a.text)}</p>`).join(""))).join("");
}

function professions() {
  return (DB.professions || []).map((p) => entry(`${emblem("prof", p.key)} ${esc(p.name)}`, tag(esc(p.keyAttribute)),
    `<p class="rl-sub">Skills</p><p class="rl-chips">${p.skills ? p.skills.map((s) => tag(esc(s))).join("") : "Mage — choose a school of magic."}</p>` +
    `<p class="rl-sub">Heroic ability</p><p class="rl-chips">${(p.heroicAbilities || []).length ? p.heroicAbilities.map((h) => tag(esc(h))).join("") : tag("Gets magic instead")}</p>`)).join("");
}

function skills() {
  const byKind = { general: [], weapon: [], magic: [] };
  (DB.skills || []).forEach((s) => byKind[s.kind]?.push(s));
  return Object.entries({ general: "General", weapon: "Weapon", magic: "Magic schools" }).map(([k, label]) =>
    block(label, `<p class="rl-chips">${byKind[k].map((s) => `<span class="tag rl-row">${esc(s.name)} (${esc(s.attribute)})</span>`).join("")}</p>`)).join("");
}

function heroicAbilities() {
  const list = (DB.heroicAbilities || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const letters = [...new Set(list.map((a) => a.name[0].toUpperCase()))];
  return `<div class="rl-tools"><div class="seg rl-hfilter" role="group" aria-label="Filter heroic abilities"><button type="button" data-f="all" aria-pressed="true">All</button><button type="button" data-f="noreq" aria-pressed="false">No requirement</button><button type="button" data-f="req" aria-pressed="false">By skill</button></div>
    <nav class="rl-az" aria-label="Jump to letter">${letters.map((l) => `<button type="button" data-l="${l}">${l}</button>`).join("")}</nav></div>` +
    list.map((a) => entry(esc(a.name), `${tag(a.req ? esc(a.req) : "No req")}${tag(a.wp == null ? "No WP" : "WP " + a.wp)}`, `<p class="rl-desc">${esc(a.text)}</p>`,
      { attrs: ` data-req="${a.req ? "req" : "noreq"}" data-l="${esc(a.name[0].toUpperCase())}"` })).join("");
}

function spellRow(s, isTrick) {
  const where = s.range || s.ingredients || s.item || "";
  const tags = `${tag(isTrick ? "Trick" : `Rank ${s.rank}`)}${where ? tag(esc(where)) : ""}${s.duration ? tag(esc(s.duration)) : ""}`;
  const meta = [s.castingTime && `Casting time: ${esc(s.castingTime)}`, s.requirement && `Requirement: ${esc(s.requirement)}`, s.prerequisite && `Prerequisite: ${esc(s.prerequisite)}`].filter(Boolean).join(" · ");
  return entry(esc(s.name), tags, `<p class="rl-desc">${esc(s.text || "")}</p>${meta ? `<p class="rl-meta">${meta}</p>` : ""}`);
}

function spells() {
  const labels = { general: "General Magic", animism: "Animism", elementalism: "Elementalism", mentalism: "Mentalism" };
  const school = (k, pool, isNew) => {
    const t = pool.tricks || [], s = pool.spells || [];
    return `<details class="rl-entry rl-school"><summary class="school-summary"><span class="ss-name">${emblem("school", k)}🧙‍♂️ ${esc(pool.name || labels[k] || Magic.cap(k))}</span><span class="ss-tags">${isNew ? tag("Book of Magic") + " " : ""}${tag(t.length + s.length)}</span></summary><div class="rl-text">` +
      (pool.entry ? `<p class="rl-intro"><i>${esc(pool.entry)}</i></p>` : "") +
      (t.length ? block(`✨ Magic Tricks (${t.length})`, t.map((x) => spellRow(x, true)).join("")) : "") +
      (s.length ? block(`📖 Ranked Spells (${s.length})`, s.slice().sort((a, b) => (a.rank || 0) - (b.rank || 0)).map((x) => spellRow(x, false)).join("")) : "") +
      `</div></details>`;
  };
  const parts = [];
  if (Magic.enabled()) parts.push(note(`Book of Magic content is ON (toggle it in Settings). Revised core spells are always applied.`));
  CORE_SCHOOLS.forEach((k) => parts.push(school(k, Magic.corePool(k), false)));
  if (Magic.enabled()) Object.keys(MAGICX.schools || {}).forEach((k) => parts.push(school(k, Magic.newSchoolPool(k), true)));
  return parts.join("");
}

function equipment() {
  const wRow = (x) => `<tr class="rl-row"><th scope="row"><b>${itemGlyph(x.name, "emb rl-glyph")}${esc(x.name)}</b><small>${esc(x.skill || x.type)}${x.grip ? " · " + esc(x.grip) : ""}${(x.features || []).length ? " · " + x.features.map(esc).join(", ") : ""}</small></th><td>${esc(x.damage || "—")}</td><td>${x.str || "—"}</td><td>${x.range ? x.range + "m" : "—"}</td><td>${esc(x.cost || "—")}</td></tr>`;
  const wTable = (list) => `<div class="rl-table-wrap"><table class="rl-table"><thead><tr><th scope="col">Weapon</th><th scope="col">Dmg</th><th scope="col">STR</th><th scope="col">Range</th><th scope="col">Cost</th></tr></thead><tbody>${list.map(wRow).join("")}</tbody></table></div>`;
  const aRow = (x, plus) => `<tr class="rl-row"><th scope="row"><b>${emblem("glyph", plus ? "helmet" : "armor", "emb rl-glyph")}${esc(x.name)}</b>${x.effect ? `<small>${esc(x.effect)}</small>` : ""}</th><td>${plus ? "+" : ""}${x.rating}</td><td>${x.metal ? "Yes" : "No"}</td><td>${esc(x.cost || "—")}</td></tr>`;
  const aTable = (list, head, plus) => `<div class="rl-table-wrap"><table class="rl-table"><thead><tr><th scope="col">${head}</th><th scope="col">Rating</th><th scope="col">Metal</th><th scope="col">Cost</th></tr></thead><tbody>${list.map((x) => aRow(x, plus)).join("")}</tbody></table></div>`;
  const ws = DB.weapons || [];
  return block("Melee weapons", wTable(ws.filter((x) => x.type === "melee"))) +
    block("Ranged weapons", wTable(ws.filter((x) => x.type === "ranged"))) +
    block("Shields", wTable(ws.filter((x) => x.type === "shield"))) +
    block("Armor", aTable(DB.armor || [], "Armor", false)) +
    block("Helmets", aTable(DB.helmets || [], "Helmet", true));
}

function gear() {
  const names = { container: "Containers", light: "Light sources", tool: "Tools", medicine: "Medicine", magic: "Magic items", gear: "General gear" };
  const groups = {};
  (DB.gear || []).forEach((g) => { (groups[g.category || "gear"] = groups[g.category || "gear"] || []).push(g); });
  return Object.keys(names).filter((k) => groups[k]).map((k) =>
    block(`${names[k]} <span class="rl-count">${groups[k].length}</span>`, groups[k].map((g) => entry(esc(g.name), `${tag(esc(g.cost))}${tag("wt " + g.weight)}`, `<p class="rl-desc">${esc(g.effect || "")}</p>`)).join(""))).join("");
}

const RENDER = { howtoplay: howToPlay, stages, journeys, kin, professions, skills, heroicAbilities, spells, equipment, gear };
// Chapter art for the Book's front page.
const ART = { howtoplay: ["glyph", "book"], stages: ["glyph", "hourglass"], journeys: ["glyph", "compass"], kin: ["kin", "human"], professions: ["prof", "knight"], skills: ["attr", "AGL"], heroicAbilities: ["glyph", "bolt"], spells: ["school", "elementalism"], equipment: ["glyph", "sword"], gear: ["glyph", "pack"], gmtables: ["glyph", "skull"] };

export function renderRuleDetail(key, container) {
  const html = RENDER[key] ? RENDER[key]() : "";
  if (container) { container.innerHTML = html; container.scrollIntoView({ behavior: "smooth", block: "start" }); }
  return html;
}

// ---- Rule cards (long-press anything tagged data-rule) ------------------------
// Short reference built only from the data libraries and rules the app already
// applies — never new rules text. Returns { title, html } or null.
export function ruleCard(key) {
  const [kind, ...rest] = String(key || "").split(":"); const id = rest.join(":");
  if (kind === "cond") {
    const cn = (DB.conditions || []).find((x) => x.key === id); if (!cn) return null;
    const at = (DB.attributes || []).find((a) => a.key === cn.attribute) || {};
    return { title: cn.name, html: `${tag(esc(cn.attribute))}<ul class="rl-list"><li>Every roll with <b>${esc(at.name || cn.attribute)}</b> — and every skill based on it — gets a <b>bane</b>.</li><li>You take a condition of your choice when you <b>push</b> a roll; you can't hold the same one twice, and with all six you can't push.</li><li>A <b>stretch rest</b> heals one condition; a <b>shift rest</b> heals them all.</li></ul>` };
  }
  if (kind === "attr") {
    const at = (DB.attributes || []).find((a) => a.key === id); if (!at) return null;
    const uses = { STR: "Damage bonus with strength weapons, carrying capacity (half STR, rounded up).", CON: "Your maximum Hit Points.", AGL: "Movement modifier and damage bonus with agile weapons.", WIL: "Your maximum Willpower Points.", INT: "Skills based on Intelligence, including magic schools.", CHA: "Skills based on Charisma." }[id] || "";
    const sk = (DB.skills || []).filter((x) => x.attribute === id).map((x) => tag(esc(x.name))).join("");
    return { title: `${at.name} (${at.key})`, html: `<p class="rl-desc">${esc(at.desc || "")}</p>${uses ? `<p>${uses}</p>` : ""}${sk ? `<p class="rl-sub">Skills</p><p class="rl-chips">${sk}</p>` : ""}<p class="rl-note">Range ${(DB.attributeRange || {}).min || 3}–${(DB.attributeRange || {}).max || 18}. Base chance for its skills: ${[3, 6, 9, 13, 16].map((v) => `${v}+ → ${Calc.baseChance(v)}`).join(" · ")}.</p>` };
  }
  if (kind === "skill") {
    const sk = (DB.skills || []).find((x) => x.name === id); if (!sk) return null;
    const at = (DB.attributes || []).find((a) => a.key === sk.attribute) || {};
    return { title: sk.name, html: `${tag(esc(sk.attribute))} ${tag(esc(sk.kind))}<ul class="rl-list"><li>Roll <b>D20 ≤ the skill level</b> to succeed.</li><li>Untrained it starts at your base chance from <b>${esc(at.name || sk.attribute)}</b>; trained, at twice that.</li><li><b>1</b> is a Dragon, <b>20</b> a Demon — both mark the skill for advancement.</li></ul>` };
  }
  if (kind === "ability") {
    const h = findHeroicAbility(id);
    const k = !h && (DB.kin || []).flatMap((x) => x.abilities || []).find((a) => a.name === id);
    const a = h || k; if (!a) return null;
    return { title: a.name, html: `${a.req ? tag(esc(a.req)) : ""}${tag(a.wp == null ? "No WP" : "WP " + a.wp)}<p class="rl-desc">${esc(a.text || "")}</p>` };
  }
  if (kind === "spell") {
    const sp = resolveCanonicalSpell({ name: id }, "general"); if (!sp) return null;
    const meta = [sp.range && `Range: ${esc(sp.range)}`, sp.duration && `Duration: ${esc(sp.duration)}`, sp.castingTime && `Casting time: ${esc(sp.castingTime)}`, sp.requirement && `Requirement: ${esc(sp.requirement)}`].filter(Boolean).join(" · ");
    return { title: sp.name, html: `${tag(sp.rank ? "Rank " + sp.rank : "Trick")}<p class="rl-desc">${esc(sp.text || "")}</p>${meta ? `<p class="rl-meta">${meta}</p>` : ""}` };
  }
  if (kind === "rest") {
    return { title: "Rest", html: `<dl class="rl-dl"><dt>Round rest</dt><dd>+D6 WP (once per shift)</dd><dt>Stretch rest</dt><dd>+D6 HP and +D6 WP, heal one condition (once per shift)</dd><dt>Shift rest</dt><dd>Full HP and WP, all conditions healed.</dd></dl>` };
  }
  return null;
}

// GM reference tables (also on the GM screen): read-only D6 lists in the Book.
function gmTables() {
  const t = (title, rows) => entry(esc(title), tag("D6"), d6((rows || []).map((x) => [x.d6, esc(x.effect)])));
  return t("Demon fumble — melee", DB.demonMelee) + t("Demon fumble — ranged", DB.demonRanged) + t("Fear table", DB.fearTable) + t("Leaving the adventure site", DB.leavingSite);
}
RENDER.gmtables = gmTables;

// ---- Screen ------------------------------------------------------------------
const GROUPS = [
  ["Guides", [["📘 How to Play (Tutorial)", "howtoplay"], ["🔄 Core Loop & Gameplay Stages", "stages"], ["🌲 Wilderness Journeys & Travel", "journeys"]]],
  ["Reference", [["🧑 Kin", "kin"], ["🛡️ Professions", "professions"], ["🎯 Skills", "skills"], ["⚡ Heroic Abilities", "heroicAbilities"], ["✨ Spells & Tricks", "spells"], ["⚔️ Weapons & Armor", "equipment"], ["🎒 Adventuring Gear", "gear"]]],
];
const COUNT = {
  kin: () => (DB.kin || []).length, professions: () => (DB.professions || []).length, skills: () => (DB.skills || []).length,
  heroicAbilities: () => (DB.heroicAbilities || []).length, gear: () => (DB.gear || []).length,
  equipment: () => (DB.weapons || []).length + (DB.armor || []).length + (DB.helmets || []).length,
};

// Open one chapter of the Book (used by tiles and deep links such as the tutorial).
export function openChapter(key) { const r = document.querySelector("#screen .rules-lib"); if (r && r._openChapter) r._openChapter(key); }

export function rulesScreen() {
  const root = el(`
    <div class="rules-lib" data-mode="home">
      ${sectionTitle("The Book")}
      <div class="panel search-panel">
        <div class="search-wrap">
          <span class="search-ic">${icon("search")}</span>
          <input type="search" id="rules-search" class="input" placeholder="Search rules, spells, gear, journeys…" aria-label="Search rules, spells, gear, journeys" autocomplete="off">
          <button type="button" class="search-clear" aria-label="Clear search" hidden>✕</button>
        </div>
        <div class="search-count" role="status" aria-live="polite"></div>
        <div class="empty-illo search-empty" hidden>${illo("book")}</div>
      </div>
      <div class="rl-chapters"></div>
      <button type="button" class="btn ghost ch-back">← All chapters</button>
      <div id="rules-acc-wrap"></div>
      <button type="button" class="rl-top" aria-label="Back to top" hidden>↑ Top</button>
    </div>`);
  root.insertBefore(helpBox("Rules library", [
    "Tap a <b>chapter</b> to open it; <b>← All chapters</b> goes back.",
    "Type in the <b>search</b> box to find any rule, spell or item across every chapter.",
    "Anywhere in the app, <b>press and hold</b> a condition, attribute, skill, ability or spell to see its rule card.",
    "New to the game? Start with <b>📘 How to Play</b> for the full tutorial.",
    "Extra magic schools appear only with <b>Book of Magic</b> on (Settings)."
  ]), root.querySelector("#rules-acc-wrap"));

  const wrap = root.querySelector("#rules-acc-wrap");
  const cats = [];
  const groups = GM.enabled() ? GROUPS.concat([["Game master", [["💀 GM tables", "gmtables"]]]]) : GROUPS;
  // Front page: illustrated chapter tiles.
  const chapters = root.querySelector(".rl-chapters");
  groups.forEach(([gName, list]) => {
    const g = el(`<section class="ch-group"><h3 class="ch-h">${gName}</h3><div class="ch-grid"></div></section>`);
    list.forEach(([label, key]) => {
      const n = COUNT[key] ? COUNT[key]() : 0;
      const [set, k] = ART[key] || ["glyph", "book"];
      const name = label.replace(/^\S+\s/, "");
      const b = el(`<button type="button" class="ch-tile" data-ch="${key}"><span class="ch-art" aria-hidden="true">${emblem(set, k, "emb ch-emb")}</span><b>${esc(name)}</b>${n ? `<small>${n}</small>` : ""}</button>`);
      b.onclick = () => root._openChapter(key);
      g.querySelector(".ch-grid").appendChild(b);
    });
    chapters.appendChild(g);
  });
  root._openChapter = (key) => {
    const cat = root.querySelector(`details.rl-cat[data-cat='${key}']`); if (!cat) return;
    if (sInp.value) { sInp.value = ""; run(); }
    cats.forEach((c) => { c.classList.toggle("is-ch", c === cat); if (c !== cat) c.open = false; });
    cat.open = true; root.dataset.mode = "chapter";
    window.scrollTo(0, 0);
  };
  root.querySelector(".ch-back").onclick = () => { cats.forEach((c) => { c.classList.remove("is-ch"); c.open = c.dataset.def === "1"; }); root.dataset.mode = "home"; window.scrollTo(0, 0); };
  groups.forEach(([gName, list]) => {
    const g = el(`<section class="rl-group"><h3 class="rl-group-h">${gName}</h3><div class="rl-cats"></div></section>`);
    list.forEach(([label, key]) => {
      const n = COUNT[key] ? COUNT[key]() : 0;
      const acc = el(`<details class="rule-accordion rl-cat" data-cat="${key}">
        <summary class="cat-summary"><span class="rl-cat-name">${label}</span>${n ? `<span class="rl-count">${n}</span>` : ""}<span class="chev" aria-hidden="true"></span></summary>
        <div class="rule-content">${renderRuleDetail(key, null)}</div>
      </details>`);
      g.querySelector(".rl-cats").appendChild(acc);
      cats.push(acc);
    });
    wrap.appendChild(g);
  });

  root.querySelectorAll("details.rl-entry, details.rl-cat").forEach((d) => { d.dataset.def = d.open ? "1" : "0"; });

  // Heroic abilities: requirement filter + A–Z jump.
  root.addEventListener("click", (e) => {
    const f = e.target.closest(".rl-hfilter button");
    if (f) {
      const body = f.closest(".rule-content");
      f.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === f)));
      body.querySelectorAll(".rl-entry[data-req]").forEach((x) => { x.classList.toggle("rl-off", f.dataset.f !== "all" && x.dataset.req !== f.dataset.f); });
      return;
    }
    const l = e.target.closest(".rl-az button");
    if (l) {
      const hit = [...l.closest(".rule-content").querySelectorAll(`.rl-entry[data-l="${l.dataset.l}"]`)].find((x) => !x.hidden && !x.classList.contains("rl-off"));
      if (hit) { hit.open = true; hit.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }
  });

  // Entry-level search: hide non-matching rows, open matching ones, highlight the term.
  const sInp = root.querySelector("#rules-search"), sClr = root.querySelector(".search-clear");
  const sCnt = root.querySelector(".search-count"), sEmpty = root.querySelector(".search-empty");
  const HL = typeof Highlight === "function" && window.CSS && CSS.highlights;
  const units = (cat) => cat.querySelectorAll(".rl-entry:not(.rl-school), .rl-row");
  const reset = () => {
    root.querySelectorAll(".rl-entry, .rl-row, .rl-block, .rl-cat, .rl-group").forEach((x) => { if (x.hidden) x.hidden = false; });
    root.querySelectorAll("details.rl-entry, details.rl-cat").forEach((d) => { d.open = d.dataset.def === "1"; });
    if (HL) CSS.highlights.delete("rl-hit");
  };
  const highlight = (q) => {
    if (!HL) return;
    const ranges = [];
    const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, t = n.nodeValue.toLowerCase();
      if (!t.includes(q) || n.parentElement.closest("[hidden]")) continue;
      let i = t.indexOf(q);
      while (i >= 0) { const r = new Range(); r.setStart(n, i); r.setEnd(n, i + q.length); ranges.push(r); i = t.indexOf(q, i + q.length); }
    }
    CSS.highlights.set("rl-hit", new Highlight(...ranges));
  };
  let timer = 0;
  const run = () => {
    const q = sInp.value.toLowerCase().trim();
    reset();
    sClr.hidden = !q;
    if (!q) { sCnt.textContent = ""; sEmpty.hidden = true; if (root.dataset.mode === "search") root.dataset.mode = "home"; return; }
    root.dataset.mode = "search"; cats.forEach((c) => c.classList.remove("is-ch"));
    let results = 0, catHits = 0;
    cats.forEach((cat) => {
      let n = 0;
      units(cat).forEach((u) => {
        const hit = u.textContent.toLowerCase().includes(q);
        u.hidden = !hit;
        if (hit) { if (!u.querySelector(".rl-entry, .rl-row")) n++; if (u.tagName === "DETAILS") u.open = true; }
      });
      cat.querySelectorAll(".rl-school").forEach((s) => { const any = [...s.querySelectorAll(".rl-entry")].some((x) => !x.hidden) || s.querySelector("summary").textContent.toLowerCase().includes(q); s.hidden = !any; if (any) s.open = true; });
      cat.querySelectorAll(".rl-block").forEach((b) => { if (b.querySelector(".rl-entry, .rl-row")) b.hidden = ![...b.querySelectorAll(".rl-entry, .rl-row")].some((x) => !x.hidden); });
      const nameHit = cat.querySelector(".rl-cat-name").textContent.toLowerCase().includes(q);
      if (nameHit && !n) units(cat).forEach((u) => { u.hidden = false; });
      const show = n > 0 || nameHit;
      cat.hidden = !show; cat.open = show;
      if (show) catHits++;
      results += n;
    });
    root.querySelectorAll(".rl-group").forEach((g) => { g.hidden = ![...g.querySelectorAll(".rl-cat")].some((c) => !c.hidden); });
    sCnt.textContent = catHits ? `${results} result${results === 1 ? "" : "s"} in ${catHits} categor${catHits === 1 ? "y" : "ies"}` : "No matches";
    sEmpty.hidden = !!catHits;
    highlight(q);
  };
  sInp.oninput = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
  sInp.addEventListener("search", run);
  sClr.onclick = () => { sInp.value = ""; run(); sInp.focus(); };

  // Back-to-top button once you're deep in a long category.
  const top = root.querySelector(".rl-top");
  const onScroll = () => { if (!root.isConnected) { window.removeEventListener("scroll", onScroll); return; } top.hidden = window.scrollY < 700; };
  window.addEventListener("scroll", onScroll, { passive: true });
  top.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  return root;
}
