/*
 * data-magic.js — Dragonbane "Book of Magic" expansion library
 * -----------------------------------------------------------
 * Expansion content, gated behind the app's "Book of Magic" content toggle
 * (off by default) — EXCEPT `revisedSpells`, which are the official revised
 * versions of six core spells and are CANONICAL EVERYWHERE (the app applies
 * them regardless of the toggle). See CLAUDE.md §10.
 *
 * Source: Book of Magic, via the project's NotebookLM notebook
 * (source id 5cc43bfe-24f9-440c-afc4-b4b1a1c1621d).
 *
 * Exposed as the global `DRAGONBANE_MAGIC`.
 *
 * STATUS (extraction in progress):
 *   [x] revisedSpells — the 6 official revised core spells
 *   [ ] newSpells — Book of Magic additions to existing schools
 *       (General, Animism, Elementalism, Mentalism)
 *   [ ] schools — 9 new schools (Demonology, Harmonism, Illusionism,
 *       Necromancy, Symbolism, Witchcraft, Alchemy, Enchanting, Dracomancy)
 *
 * NOTE: the Book of Magic restructures the existing schools' rank/prereq
 * trees and moves some spells (e.g. Resurrection core rank 3 → revised rank 5).
 * The revised data below reflects the official Book of Magic versions.
 */

const DRAGONBANE_MAGIC = {

  /* ----------------------------------------------------------------
   * REVISED SPELLS — official revised versions of six core spells.
   * Applied regardless of the Book of Magic toggle (canonical).
   * The app should override the matching entries in data.js with these.
   * ---------------------------------------------------------------- */
  revisedSpells: [
    { name: "Dispel", school: "General", rank: 1, prerequisite: "Any school of magic", requirement: "Word, gesture", castingTime: "Action/stretch", range: "10 meters", duration: "Instant",
      text: "You cancel an ongoing spell of lower or equal power level (including PROTECTOR). To DISPEL a ritual takes a stretch of time. Can also end other magical effects if the GM allows. DISPEL cannot be used against powerful rituals such as FAMILIAR, NEXUS, and PERMANENCE (including the spell made permanent) — those require COUNTER RITUAL." },
    { name: "Protector", school: "General", rank: 1, prerequisite: "Any school of magic", requirement: "Gesture, ingredient (something to draw with)", castingTime: "Action", range: "Touch", duration: "Shift",
      text: "You protect a person or item (no larger than a human) from magic; you can cast it on yourself. The power level of all spells cast at the target (including DISPEL) is reduced by PROTECTOR's power level. The effect ends immediately if the target moves, willingly or otherwise. Against magical monster attacks, each power level reduces the damage dice by 1 (the GM decides what counts as a magical attack)." },
    { name: "Magic Seal", school: "General", rank: 4, prerequisite: "Transfer or any rank 3 enchanting spell", requirement: "Word, gesture", castingTime: "Shift", range: "Touch", duration: "Until use",
      text: "Bind a spell to an inanimate object. Roll the spell first then MAGIC SEAL, both at the same power level (PL1 suffices for a magic trick); both must succeed. You set the trigger condition; activation uses the activator's WP (no roll — auto-succeeds, no Dragon/Demon; an opposed-roll spell instead lets the target roll straight to resist). The seal breaks on activation unless combined with PERMANENCE. Can combine with CHARGE or NEXUS (item provides its own power). Cannot bind alchemical recipes or enchanting spells. Binding a ritual costs −1 max WP per power level (−1 even on failure); PERMANENCE/NEXUS cost further permanent WP. A separate MAGIC SEAL is needed per bound spell." },
    { name: "Permanence", school: "General", rank: 5, prerequisite: "Magic Seal or any rank 4 enchanting spell", requirement: "Word, gesture", castingTime: "Shift", range: "Touch", duration: "Permanent",
      text: "Combined with another spell to make it permanent. The same mage rolls for both, at the same power level. Permanently reduces your max WP by 1 per power level (−1 even on failure). Cannot be applied to instant-duration spells. With MAGIC SEAL, the seal becomes permanent (bound spell reusable at normal WP cost, or via CHARGE/NEXUS). Cannot be cancelled by DISPEL — only by COUNTER RITUAL." },
    { name: "Resurrection", school: "Animism", rank: 5, prerequisite: "Healing Radiance", requirement: "Word, gesture, ingredient (corpse)", castingTime: "Shift", range: "Touch", duration: "Instant",
      text: "Resurrect a dead person — truly alive, not undead. Difficulty scales with time since death: within a shift = PL1, within a day = PL2, within a week = PL3; over a week, too decomposed. Only one attempt — failure means permanent death. Permanently reduces your max WP by 1 (even on failure), though Focused can still raise it (a change from core). The revived person loses D3 skill levels in all CHA-based skills (minimum 3). Cannot be undone by COUNTER RITUAL." },
    { name: "Sleep", school: "Animism", rank: 2, prerequisite: "Treat Wound", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
      text: "Opposed roll against the target's WIL (target rolls with a boon at PL1, normally at PL2, with a bane at PL3). On a win, the target falls into a deep sleep for a stretch — very hard to wake, but wakes on taking damage. Living targets only; no effect on monsters." }
  ],

  /* ----------------------------------------------------------------
   * NEW SPELLS for the existing schools (Book of Magic additions).
   * Gated behind the Book of Magic toggle.  — COMPLETE
   * ---------------------------------------------------------------- */
  newSpells: {
    general: {
      tricks: [], // Book of Magic adds no new General tricks (Sense Magic text slightly clarified)
      spells: [
        { name: "Alarm", rank: 1, prerequisite: "Any school of magic", requirement: "Gesture", castingTime: "Action", range: "Touch", duration: "Shift (a week at PL2, a year at PL3)",
          text: "Inscribe an invisible rune on an isolated non-organic object (a door, floor tile, urn, etc.) and set a trigger condition (someone opening the door, stepping on the tile, touching the urn). When the condition is met, you immediately become aware of it, no matter where you are." },
        { name: "Familiar", rank: 2, prerequisite: "Alarm or Protector", requirement: "Ingredient (the animal)", castingTime: "Stretch", range: "Touch", duration: "Shift",
          text: "Summon a willing spirit from the realm of the dead and bind it to the body of a recently deceased small animal. The spirit has no memory of its previous life but intensely desires a second chance, serving you. (Animal options listed in `familiarAnimals`.) A familiar gains two abilities from the familiar abilities list." },
        { name: "Magic Ward", rank: 3, prerequisite: "Magic Shield", requirement: "Gesture", castingTime: "Reaction", range: "10 meters", duration: "Instant",
          text: "Surround yourself or another creature with a momentary field that reduces an incoming attack's damage by 2D4. Each power level reduces it by an additional D4. Cast once you know the attack will hit, before damage is rolled. Can be combined with armor." },
        { name: "Greater Familiar", rank: 4, prerequisite: "Transfer", requirement: "Word, ingredient (the animal)", castingTime: "Shift", range: "Touch", duration: "Shift (a week at PL2, your remaining lifespan at PL3)",
          text: "Like FAMILIAR but binds a spirit to a larger, more powerful animal; can also transfer a spirit from a familiar to a larger animal. A greater familiar gains four abilities from the familiar abilities list (one may be replaced by an ability unique to your school of magic). Upgrading an existing familiar adds two new abilities to its existing two." },
        { name: "Counter Ritual", rank: 5, prerequisite: "Magic Seal or any rank 4 enchanting spell", requirement: "Word, gesture", castingTime: "Shift", range: "4 meters", duration: "Instant",
          text: "Negates another powerful ritual (Rejuvenation, Nexus, Permanence); its power level must match the ritual being undone. Permanently reduces your max WP by 1 per power level (−1 even on failure). Cannot be dispelled or undone by another Counter Ritual. May break other powerful rituals/curses if the GM allows." },
        { name: "Nexus", rank: 5, prerequisite: "Charge", requirement: "Word, gesture", castingTime: "Shift", range: "Touch", duration: "Permanent",
          text: "Cast only on an object that already has a MAGIC SEAL with PERMANENCE. Opens a small portal to Chaos as an inexhaustible power source, letting the bound spell activate without costing the user WP (no roll, any number of times). Its power level must match the Magic Seal and Permanence. Permanently reduces your max WP by 1 per power level (−1 even on failure). Cannot be dispelled; only undone by Counter Ritual." },
        { name: "Rejuvenation", rank: 5, prerequisite: "Charge", requirement: "Word, gesture, focus", castingTime: "Shift", range: "Personal", duration: "Permanent",
          text: "Make your body younger. PL1: restart aging within your current age category. PL2: reduce your age category one step (old→adult or adult→young). PL3: old→young. Attributes change accordingly (affecting max HP/WP); skills are unaffected. The young cannot be rejuvenated. Permanently reduces your max WP by 1 per power level (−1 even on failure). On a Demon roll, instead of a mishap you become one age category older (if already old, you die). Cannot be dispelled; Counter Ritual undoes it (immediately fatal if the mage is old)." }
      ],
      // Animals a Familiar can be bound to (Book of Magic).
      familiarAnimals: [
        { name: "Rat",        movement: 10, hp: 3, attack: "Bite (skill 8, D2)",  skills: "Awareness 14, Evade 16, Sneaking 14" },
        { name: "Cat",        movement: 12, hp: 4, attack: "Bite (skill 8, D3)",  skills: "Awareness 12, Evade 14, Sneaking 16" },
        { name: "Dog",        movement: 14, hp: 8, attack: "Bite (skill 12, D8)", skills: "Awareness 14, Evade 10" },
        { name: "Fox",        movement: 10, hp: 6, attack: "Bite (skill 12, D6)", skills: "Awareness 12, Evade 10, Sneaking 14" },
        { name: "Grass Snake", movement: 8,  hp: 3, attack: "Bite (skill 12, D3)", skills: "Awareness 10, Evade 14, Sneaking 16" },
        { name: "Raven",      movement: 18, hp: 4, attack: "Beak (skill 10, D4)", skills: "Awareness 16, Evade 10" }
      ]
    },
    animism: {
      tricks: [], // no new Animism tricks
      spells: [
        { name: "Cure", rank: 1, prerequisite: "Animism", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "Immediately ends the effect of a natural disease or poison on yourself or another living creature. Magical diseases may require PL2 or PL3, or rarely be impossible to cure." },
        { name: "Nourish", rank: 1, prerequisite: "Animism", requirement: "Gesture", castingTime: "Stretch", range: "Personal", duration: "Instant",
          text: "Sprout threadlike roots from your hands and feet into the earth to draw nutrients and water, fulfilling your need for food and water for a full day. Power level by environment: PL1 in forests/fertile wilderness, PL2 in towns/villages/vegetated mountains, PL3 in barren mountains or caverns." },
        { name: "Calm Animal", rank: 2, prerequisite: "Animal Whisperer", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Pacify a number of common mammals or birds up to the power level. The effect ends immediately if the animals are attacked. No effect on monsters." },
        { name: "Lightning Bolt", rank: 2, prerequisite: "Lightning Flash", requirement: "Gesture", castingTime: "Action", range: "40 meters", duration: "Instant",
          text: "A great bolt of lightning deals 2D8 to the target, then arcs to a second random target within 2 m (2D6), then a third (2D4). Each power level beyond the first adds one die to each. Metal armor has no effect; can be dodged/parried as a ranged attack (stops the arc). Indoors WP cost is doubled (or, if bound by Magic Seal, power level is halved, rounding up)." },
        { name: "Recovery", rank: 2, prerequisite: "Cure", requirement: "Word", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "Immediately removes one condition of your choice per power level from yourself or another living creature." },
        { name: "Reinvigorate", rank: 2, prerequisite: "Nourish", requirement: "Word", castingTime: "Stretch", range: "Personal", duration: "Instant",
          text: "Like NOURISH, but the roots also heal body and mind: fulfills your food/water needs for a day AND reinvigorates you, curing all conditions. Power level by environment as NOURISH (PL1 fertile, PL2 settled/vegetated, PL3 barren)." },
        { name: "Command Animal", rank: 3, prerequisite: "Calm Animal", requirement: "Word, gesture", castingTime: "Stretch", range: "20 meters", duration: "Concentration",
          text: "Take control of a number of mammals or birds up to the power level; they obey while you concentrate. Communication is telepathic with no range limit — track enemies, deliver messages, attack, etc. In combat they act on your turn (move + one action each). No effect on monsters." },
        { name: "Daze", rank: 3, prerequisite: "Sleep", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Force multiple individuals within range (up to your base chance in WIL) to make a WIL roll (boon at PL1, bane at PL3). All who fail become Dazed. No effect on monsters." },
        { name: "Exhaust", rank: 3, prerequisite: "Sleep", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Force multiple individuals within range (up to your base chance in WIL) to make a WIL roll (boon at PL1, bane at PL3). All who fail become Exhausted. No effect on monsters." },
        { name: "Mass Purge", rank: 3, prerequisite: "Purge", requirement: "Word, gesture, focus (sacred symbol)", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Exorcise multiple demons or undead within range (up to your base chance in WIL): 2D6 damage each (rolled separately). Armor/natural armor have no effect; cannot be dodged or parried. Each power level beyond the first: +D6 damage or +10 m range." },
        { name: "Thorn Field", rank: 3, prerequisite: "Engulfing Forest", requirement: "Word, gesture, ingredient (a handful of seeds)", castingTime: "Action", range: "10 meters (sphere)", duration: "Shift",
          text: "Seeds instantly take root (even on stone). The area is rough terrain; everyone except you (not monsters) in it when cast is ensnared by thorns, unable to move, and takes D8 piercing at the start of each turn. Breaking free requires an EVADE roll (boon PL1, normal PL2, bane PL3); one attempt per round; unensnared others can help." },
        { name: "Thunderbolt", rank: 3, prerequisite: "Lightning Bolt", requirement: "Gesture", castingTime: "Action", range: "50 meters", duration: "Instant",
          text: "A mighty thunderstroke deals 2D10 to the target, then arcs to up to three more random targets within 2 m of each other: 2D8, 2D6, 2D4. Each power level beyond the first adds one die to each. Metal armor has no effect; can be dodged/parried as a ranged attack (stops the arc). Indoors WP cost doubled (or power level halved if Magic Seal-bound, rounding up)." },
        { name: "Animalistic Influence", rank: 4, prerequisite: "Command Animal", requirement: "Word, gesture", castingTime: "Stretch", range: "50 meters", duration: "Shift",
          text: "Animalistic emotions overtake an intelligent living creature (e.g. a boar's rage, a cat's laziness, a sparrow's skittish fear); the GM decides the behavior. Affect a group: PL2 for up to your base chance in WIL individuals, PL3 for up to five times that. Targets still defend if attacked. Not usable on monsters or undead." },
        { name: "Healing Radiance", rank: 4, prerequisite: "Restoration", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "All your allies within range immediately heal 2D6 HP each. Each power level beyond the first restores an additional D6 to each. Does not heal yourself." },
        { name: "Weather Mastery", rank: 4, prerequisite: "Thunderbolt", requirement: "Word, gesture", castingTime: "Action", range: "100 meters", duration: "Shift",
          text: "Create a drastic weather shift. Minor shift (cloudy→rainy, calm→breeze) = PL1; unusual but seasonal weather (winter blizzard, summer heat, autumn storms) = PL2; completely unnatural weather (desert blizzard, midwinter heatwave) = PL3." },
        { name: "Healing Aura", rank: 5, prerequisite: "Healing Radiance", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Healing energy radiates from you: all allies within range heal 2D8 HP and one non-permanent severe injury. Each power level beyond the first: +10 m range or +D8 HP to each. Does not heal yourself." }
      ]
    },
    elementalism: {
      tricks: [], // no new Elementalism tricks
      spells: [
        { name: "Firebird", rank: 3, prerequisite: "Fire Blast", requirement: "Word, gesture", castingTime: "Action", range: "40 meters", duration: "Instant",
          text: "Send a terrifying bird of fire from your hand or focus; can be dodged or parried as a ranged attack. 2D10 on a hit and sets fire to flammables. Each power level beyond the first adds D10 OR creates another firebird that hits another target in range." },
        { name: "Firebomb", rank: 4, prerequisite: "Firebird or Firestorm", requirement: "Word, gesture", castingTime: "Action", range: "40 meters", duration: "Instant",
          text: "Hurl a blazing sphere at a point in the terrain; it explodes. Everyone within 4 m takes 2D8 fire damage. Can be dodged as a ranged attack but with a bane. Each power level adds D8 damage and 4 m of blast radius." },
        { name: "Hailstorm", rank: 4, prerequisite: "Sylph", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Blast a target with a gale of razor-sharp ice: 2D10 piercing damage and the target becomes cold. Leather armor is shredded (armor rating −1). Can be dodged as a ranged attack but with a bane. Each power level adds D10 OR creates an additional hailstorm against another target." },
        { name: "Rock Tornado", rank: 4, prerequisite: "Gnome", requirement: "Word, gesture", castingTime: "Action", range: "4 meters (sphere)", duration: "Instant",
          text: "Conjure a raging vortex of sharp rock shards around you. All targets within range take 2D8 bludgeoning. Can be dodged as a ranged attack but with a bane. Each power level adds 4 m range and D8 damage." },
        { name: "Scalding Shower", rank: 4, prerequisite: "Undine", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Gather and heat moisture into a sphere of boiling water above a target, then drop it: the target takes 2D10 and everyone within 2 m takes 2D4. Armor has no effect; can be dodged with a bane. Each power level adds D10 to the primary target and D4 to the splash." },
        { name: "Conjure", rank: 5, prerequisite: "Firebomb, Hailstorm, Scalding Shower, or Rock Tornado", requirement: "Word, gesture", castingTime: "Stretch", range: "Touch", duration: "Shift",
          text: "Conjure an inanimate object from thin air. PL1: a Common item up to weight 1 (generic only — not, e.g., a key to a specific lock). PL2: an Uncommon or heavier item (up to weight 4). PL3: a Rare item or something as large as a cart, rowboat, or small hut. Conjured objects crumble to dust after one shift unless combined with PERMANENCE." },
        { name: "Elemental Path", rank: 5, prerequisite: "Firebomb, Hailstorm, Scalding Shower, or Rock Tornado", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "You become immune to damage from natural elements, and magical elemental damage is halved (after armor, rounded up). You can move at normal speed through magma, earth, stone, air (hovering), and water (no air needed) — except metal-rich earth/stone and solid bedrock. Each power level adds one stretch of duration." },
        { name: "Meteor Swarm", rank: 5, prerequisite: "Firebomb or Rock Tornado", requirement: "Word, gesture", castingTime: "Action", range: "100 meters", duration: "Instant",
          text: "Summon a rain of burning meteors at a point within range. Everyone within 6 m takes 2D10 fire damage. Can be dodged as a ranged attack but with a bane. Each power level adds D10 damage and 4 m of blast radius." }
      ]
    },
    mentalism: {
      tricks: [], // no new Mentalism tricks
      spells: [
        { name: "Shockwave", rank: 3, prerequisite: "Mental Strike", requirement: "Word, gesture", castingTime: "Action", range: "4 meters (sphere)", duration: "Instant",
          text: "Strike the ground with mental power: everyone within range is hurled 2D6 m away and takes that much bludgeoning damage. Can be dodged as a ranged attack. Each power level adds 2 m range and D6. Large and Huge creatures take damage but are not moved." },
        { name: "True Sight", rank: 3, prerequisite: "Divination", requirement: "Word, gesture", castingTime: "Action", range: "50 meters", duration: "Stretch",
          text: "You automatically see through all rank 3 or lower spells meant to distort your perception. PL2 also covers rank 4 spells; PL3 covers rank 5." },
        { name: "Bounce", rank: 4, prerequisite: "Teleport", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Teleport to a spot you can see within range, immediately perform a normal action there, then instantly teleport to another chosen spot within range. Each power level doubles the range." },
        { name: "Control Person", rank: 4, prerequisite: "Dominate", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Take total control over another creature (opposed WIL roll — boon at PL1, bane at PL3). On success it acts on your turn doing exactly what you want; actions that cost WP cost your own. Monsters and undead are unaffected." },
        { name: "Matter Control", rank: 4, prerequisite: "Shockwave", requirement: "Gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Lift and move a creature or object of human size or smaller up to 12 m horizontally. As an attack (slam into a wall or hurl an object): 2D8 bludgeoning, dodged as a ranged attack. Each power level adds 6 m distance and D8 damage, or one additional target (roll once; each dodges and takes damage separately)." },
        { name: "Speed", rank: 4, prerequisite: "Flight", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Grant yourself or a willing target increased speed. PL1: one extra reactive action per round. PL2: instead, one extra normal action (not casting a spell or taking a round rest) or movement on their turn. PL3: both. When the spell expires the target becomes Exhausted." },
        { name: "Dominate Monster", rank: 5, prerequisite: "Control Person", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Take temporary control of a monster; power level caps its size (PL1 ≤20 HP, PL2 ≤40, PL3 ≤60). On success it immediately makes one movement and one monster attack of your choosing (never against itself or an inanimate object) and loses its next turn. No effect on dragons or demons." },
        { name: "Invisibility", rank: 5, prerequisite: "Bounce", requirement: "Gesture", castingTime: "Action", range: "Personal/touch", duration: "Stretch",
          text: "Become completely invisible — impossible to perceive while still. While moving or acting you gain two boons on SNEAKING, opponents suffer two banes on AWARENESS to notice you, and you cannot be hit by ranged attacks; a melee attacker must first make an AWARENESS roll with a double bane (no action). PL2: turn a touched human-sized living being invisible instead of yourself. PL3: both yourself and another." }
      ]
    }
  },

  /* ----------------------------------------------------------------
   * NEW SCHOOLS (Book of Magic). Each: { keyAttribute, entry, tricks[], spells[] }.
   * Gated behind the Book of Magic toggle.  — COMPLETE
   * Harmonism is cast with the Performance (CHA) skill (bards); others are INT.
   * Dracomancy is learn-in-play only (requires mastering another school).
   * ---------------------------------------------------------------- */
  schools: {
    demonology: { keyAttribute: "INT", entry: "Frowned upon / illegal in civilized lands. Higher spells learned via demonic pacts (a cost set by the GM).", tricks: [],
      spells: [
        { name: "Abyssal Stench", rank: 1, prerequisite: "Demonology", requirement: "Word, gesture", castingTime: "Action", range: "Personal", duration: "Round",
          text: "Release the vile stench of Chaos. Until your next turn, anyone attempting a melee attack against you must succeed on a CON roll (boon at PL1, bane at PL3); the roll is not an action. On a failure the attack is cancelled and the attacker loses their action. No effect on demons, undead, or monsters." },
        { name: "Carbuncle", rank: 1, prerequisite: "Demonology", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Hurl a demonic winged louse that auto-finds its target, burrows in, and multiplies. Immediately D4 damage, then escalating damage each turn until it bursts — D6, then D8, then D10. Dodged as a ranged attack; armor has no effect; continues even if you are incapacitated. Power level sets when it bursts (2nd roll at PL1, 3rd at PL2, 4th at PL3). No effect on demons or undead." },
        { name: "Chaos Swamp", rank: 1, prerequisite: "Demonology", requirement: "Word, gesture", castingTime: "Stretch", range: "10 meters", duration: "Shift",
          text: "Infect the ground in a 10 m radius with demonic energy (you may leave an unaffected area at the center, e.g. for camp). The ground becomes scorching, swampy, and full of noxious fumes. Each power level doubles the radius. Wild animals avoid it; NPCs have movement halved; living creatures (including monsters) take D4 damage each turn they begin in it. Flying creatures are unaffected." },
        { name: "Demonic Gust", rank: 1, prerequisite: "Demonology", requirement: "Word, gesture", castingTime: "Action", range: "10 meters (cone)", duration: "Instant",
          text: "Summon a gust of pungent Chaos wind. All opponents in the area are shocked and must make a WIL roll to resist fear (boon at PL1, bane at PL3)." },
        { name: "Beetle Boil", rank: 2, prerequisite: "Carbuncle", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Launch a demonic spawn-filled beetle that auto-finds its target and releases ravenous spawn. Immediately D6 damage, then escalating each turn until the spawn die — D8, D10, D12. Dodged as a ranged attack; armor no effect; continues even if you are incapacitated. Power level sets the timing (2nd/3rd/4th roll). No effect on demons or undead." },
        { name: "Bloodlust", rank: 2, prerequisite: "Demonic Gust", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Shift",
          text: "Invite a demonic spirit into your mind or a willing target's. The target must immediately succeed on a WIL roll or gain the Sickly condition. In return the demon's bloodlust grants a boon on all melee attacks and on WIL rolls to resist fear, for the duration (+1 shift per power level). While influenced, the target cannot dodge or parry." },
        { name: "Chaos Mire", rank: 2, prerequisite: "Chaos Swamp", requirement: "Word, gesture", castingTime: "Action", range: "30 meters", duration: "Stretch",
          text: "Transform the ground beneath one opponent per power level into a 2×2 m patch of scalding chaos mire. The target sinks knee-deep and takes D6 damage at the start of each subsequent turn it remains; armor has no effect. Escaping requires an action and a successful EVADE roll (others can help). No effect on Large/Huge creatures or immaterial beings; creatures immune to fire/heat take no damage." },
        { name: "Demon Face", rank: 2, prerequisite: "Abyssal Stench", requirement: "Word, gesture", castingTime: "Action", range: "Personal", duration: "Round",
          text: "Assume the grotesque, reeking visage of a demon. Until the start of your next turn, any melee attacker must succeed on a WIL roll (boon at PL1, bane at PL3). On a failure the attack is cancelled and the attacker rolls on the Fear table. No effect on demons, undead, or monsters." },
        { name: "Beetle Swarm", rank: 3, prerequisite: "Beetle Boil", requirement: "Word, gesture", castingTime: "Action", range: "20 meters (sphere)", duration: "Instant",
          text: "Summon a swarm of flesh-eating demonic beetles attacking up to four targets in an order you choose: 2D10, 2D8, 2D6, 2D4. Armor has no effect; parrying/dodging as a ranged attack (boon at PL1, bane at PL3) stops the swarm moving on. No effect on demons or undead." },
        { name: "Dimensional Slip", rank: 3, prerequisite: "Demon Face", requirement: "Gesture", castingTime: "Reaction", range: "Personal", duration: "Instant",
          text: "When hit by an attack, before damage is rolled, momentarily slip into Chaos: on success you avoid all damage and effects. Even on a failure you may move 2 m without triggering a free attack (+2 m per power level beyond the first)." },
        { name: "Gutworm", rank: 3, prerequisite: "Beetle Boil", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Open a rift inside an opponent's abdomen, inviting a demonic worm that eats its way out. Opposed roll against the victim's WIL. On success, immediately D8 damage, then D8 each turn for a number of rounds equal to the power level. Armor no effect; continues even if you or the target are incapacitated. No effect on demons or undead." },
        { name: "Rage", rank: 3, prerequisite: "Bloodlust", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Let a rage demon possess you or a willing target, who is consumed with fury and gains the Angry condition. For the duration the possessed cannot parry or dodge but gains a bonus action (same turn) usable only to attack. PL2 also grants a boon to resist fear; PL3 a boon to resist mind-altering magic. When it ends, the target must make a CON roll or become Sickly." },
        { name: "Demonic Exile", rank: 4, prerequisite: "Dimensional Slip", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Round",
          text: "Temporarily banish a target to a demonic realm. Opposed roll against the target's WIL (boon at PL1, bane at PL3). On a win the target vanishes and reappears on your turn next round, charred and reeking, having taken 2D10 damage (armor no effect). Can be parried or dodged; cannot be used on Large or Huge monsters." },
        { name: "Summon Champion", rank: 4, prerequisite: "Gutworm", requirement: "Word, gesture, focus (ritual circle)", castingTime: "Stretch", range: "4 meters", duration: "Stretch",
          text: "Draw a ritual circle; on success a demon (from the Rulebook/Bestiary) materializes to fight for you for a stretch, attacking targets you point out (it can't be micromanaged — GM uses the monster attacks table). Sending it home when the spell expires requires another Demonology roll (an action, no WP; bane at PL1, boon at PL3). On a failure it breaks free — roll D6: 1–3 it attacks you and your allies, 4–6 it strides off to spread havoc unless attacked immediately." },
        { name: "Summon Guardians", rank: 4, prerequisite: "Gutworm", requirement: "Word, gesture, focus (ritual circle)", castingTime: "Shift", range: "4 meters", duration: "Shift",
          text: "Summon guardian demons (twice the power level) to guard a location or building up to 50 m across. They cannot leave the area and attack anyone approaching from outside except you. Guardian demons are loyal and return obediently when the spell expires." },
        { name: "Bind Champion", rank: 5, prerequisite: "Summon Champion", requirement: "Word, gesture, focus (ritual circle)", castingTime: "Shift", range: "4 meters", duration: "One day per power level",
          text: "Like SUMMON CHAMPION but maintains control for longer. On success the demon is summoned into the circle and a negotiation is held: it serves you and agrees to return at your command, but demands something in return (the GM sets the cost using the demonic-pacts table)." },
        { name: "Dimensional Travel", rank: 5, prerequisite: "Demonic Exile", requirement: "Word, gesture, focus (ritual circle)", castingTime: "Stretch", range: "Personal", duration: "Instant",
          text: "Transport yourself to Chaos and other worlds beyond our own; what you find there is up to the GM (and can be an adventure in itself). PL2 lets you bring one willing human-sized creature; PL3 up to a dozen others. To return home you must perform the ritual again." }
      ]
    },
    harmonism: { keyAttribute: "CHA", entry: "Not a skill of its own — cast using PERFORMANCE (need Performance 12). Bards may start with it; others need the Magic Talent heroic ability. Harmonists cannot learn General Magic. Spells use the 'Melody' requirement (vocal or instrumental).",
      tricks: [
        { name: "Double Tongue",  text: "You say something aloud, but one person nearby hears something completely different — your true message (to signal a companion to flee, fight, or keep quiet)." },
        { name: "Embellish",      text: "Enhance reality with more vibrant colors, purer sounds, or richer flavors and scents over a room-sized area for a stretch. Won't fool anyone who doesn't want to be fooled." },
        { name: "Luring Song",    text: "Attract a group of small mammals (squirrels, hedgehogs, mice, rats — by environment). They remain as long as you keep singing or playing." },
        { name: "Magical Melody", text: "Imbue your voice or instrument with a magical quality that impresses listeners, granting a boon on PERFORMANCE in relevant situations (GM's discretion), excluding spellcasting." },
        { name: "Phantasm",       text: "Conjure false objects and glowing orbs from thin air to entertain and impress; gain a boon on BLUFFING or PERFORMANCE." },
        { name: "Voice Distortion", text: "Alter your voice beyond recognition, possibly granting a boon on BLUFFING in certain situations (GM's discretion)." }
      ],
      spells: [
        { name: "Inspire", rank: 1, prerequisite: "Performance 12", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Your song inspires your companions: all allies within range gain a boon on all skill rolls while you concentrate. Each power level beyond the first doubles the range. You cannot Inspire yourself." },
        { name: "Mend", rank: 1, prerequisite: "Performance 12", requirement: "Melody", castingTime: "Stretch", range: "2 meters", duration: "Permanent",
          text: "By playing a fragment of the ancient Hymn of Creation, restore a damaged/warped/broken object (max weight 1) that once held the form you restore. PL2: up to weight 4. PL3: an object as large as a cart, rowboat, or small hut." },
        { name: "Protective Harmonies", rank: 1, prerequisite: "Performance 12", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Surround yourself or an ally with protective vibrations, reducing incoming attack damage by D6 per power level (before armor). If you take damage despite it, your concentration breaks." },
        { name: "Serenity", rank: 1, prerequisite: "Performance 12", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Pacify a living creature (opposed WIL roll — boon at PL1, bane at PL3). On a win it stops to listen while you concentrate, until it is attacked or takes damage. No effect on monsters or undead." },
        { name: "Tune Mood", rank: 1, prerequisite: "Performance 12", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Stretch",
          text: "Influence the emotional state of all listeners within range (happy, sad, angry, afraid…) for a stretch; BLUFFING/PERSUASION rolls consistent with their mood get a boon. Range 20 m at PL2, 40 m at PL3." },
        { name: "Doubt", rank: 2, prerequisite: "Serenity", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Sow doubt: all opponents within range make a WIL roll (boon at PL1, bane at PL3). Those who fail suffer a bane on all skill rolls until your next turn, when they may roll again to shake it off. Ends if you break concentration. No effect on monsters or undead." },
        { name: "Elude Senses", rank: 2, prerequisite: "Protective Harmonies", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "All enemies within range cannot see, hear, or smell you (even with AWARENESS). PL1 affects living non-monsters, PL2 also undead, PL3 also monsters. They can still detect you by touch, which ends the effect for that creature." },
        { name: "Encourage", rank: 2, prerequisite: "Inspire", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "All allies within range gain a boon on all skill rolls while you concentrate and are immune to fear attacks. Each power level beyond the first doubles the range. You cannot Encourage yourself." },
        { name: "Frenzy", rank: 2, prerequisite: "Tune Mood", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Drive a person berserk (opposed WIL — boon at PL1, bane at PL3). On success they must spend their next turn rushing toward the nearest person/creature and attacking in melee, and cannot 'wait', for the duration. Monsters and undead are unaffected." },
        { name: "Paralyze", rank: 2, prerequisite: "Mend", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Hypnotize a person (opposed WIL — boon at PL1, bane at PL3). On a win they cannot move or act except reactions while you concentrate. No effect on monsters or undead." },
        { name: "Cacophony", rank: 3, prerequisite: "Paralyze", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "A harsh, discordant noise makes all opponents within range Dazed and forces a WIL roll (not an action). Those who fail must spend their next turn fleeing out of range and may not approach again (can't 'wait' to postpone it). They may re-roll WIL each turn. Range 20 m at PL2, 40 m at PL3. Monsters and undead unaffected." },
        { name: "Dance", rank: 3, prerequisite: "Frenzy", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Compel a target to dance frantically (opposed WIL — boon at PL1, bane at PL3). On a win they cannot act (even reactions) and you fully control their movement — even over a precipice or into deep water — while you concentrate, until they take damage from an attack. No effect on monsters or undead." },
        { name: "Placate Nature", rank: 3, prerequisite: "Elude Senses", requirement: "Melody", castingTime: "Action", range: "Personal", duration: "Concentration",
          text: "While you play, you cannot be harmed by natural forces: immune to fire and cold, walk on water and breathe underwater, unaffected by wind (glide through air at normal speed), see in total darkness, not dazzled by bright light. PL2 extends it to one other person within 4 m, PL3 to another. No protection against magically summoned effects." },
        { name: "Rest", rank: 3, prerequisite: "Doubt or Encourage", requirement: "Melody", castingTime: "Stretch", range: "10 meters", duration: "Instant",
          text: "All friendly creatures within range gain shift-rest benefits within a stretch rest's time/conditions. PL1: one of recover HP, recover WP, or heal all conditions (same choice for everyone). PL2: two of them. PL3: all three. You don't benefit yourself." },
        { name: "Break", rank: 4, prerequisite: "Cacophony", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "A piercing note breaks inanimate, non-magical objects within range (up to your base chance in WIL) such as weapons or doors: 2D20 damage each, ignoring armor. Each power level adds D20. Objects without listed HP are simply destroyed (GM's call)." },
        { name: "Hypnotize Monster", rank: 4, prerequisite: "Placate Nature", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Disrupt even mighty monsters and demon lords. For each power level, afflict a creature with one effect (lasting while you concentrate, likely making you its primary target): reduce its Ferocity by 1 (min 1); halve its movement; or force it to roll twice for monster attacks (you choose which result; not the same attack twice in a row)." },
        { name: "Mass Dance", rank: 4, prerequisite: "Dance", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Compel all chosen living creatures within range to dance (each makes a WIL roll, not an action). Those who fail cannot act and you fully control their movement — even over a precipice or into water — while you concentrate, until they take damage. Range 20 m at PL2, 40 m at PL3. No effect on monsters or undead." },
        { name: "Musical Blast", rank: 4, prerequisite: "Cacophony", requirement: "Melody", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Damaging harmonies make all opponents within range Dazed and deal D8 immediately, plus D8 on each of your subsequent turns while they remain in range and you concentrate. Armor has no effect. Range 20 m at PL2, 40 m at PL3." },
        { name: "Spiritual Solace", rank: 4, prerequisite: "Rest", requirement: "Melody", castingTime: "Stretch", range: "10 meters", duration: "Instant",
          text: "All allies within range gain all shift-rest benefits within a stretch rest's time/conditions. PL2 also cleanses negative soul effects (spells — except PERMANENCE ones — fear effects, etc.). PL3 also heals severe injuries, restoring full bodily function. You don't benefit yourself." },
        { name: "Abyssal Resonance", rank: 5, prerequisite: "Musical Blast", requirement: "Melody", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Thunderous harmonies make all enemies within range Dazed and deal D12 immediately, plus D12 on each of your subsequent turns while they remain in range and you concentrate. Armor has no effect. Range 40 m at PL2, 80 m at PL3." }
      ]
    },
    illusionism: { keyAttribute: "INT", entry: null,
      tricks: [
        { name: "Double Tongue", text: "You say something aloud, but one person nearby hears something completely different — your true message." },
        { name: "Embellish",     text: "Enhance reality with more vibrant colors, purer sounds, or richer flavors/scents over a room-sized area for a stretch. Won't fool anyone who doesn't want to be fooled." },
        { name: "Phantasm",      text: "Conjure false objects and glowing orbs to entertain and impress; gain a boon on BLUFFING or PERFORMANCE." },
        { name: "Shadow Play",   text: "Breathe life into shadows, making them dance or take ominous shapes; so distracting that anyone watching suffers a bane on AWARENESS." }
      ],
      spells: [
        { name: "Apparition", rank: 1, prerequisite: "Illusionism", requirement: "Gesture", castingTime: "Action", range: "30 meters", duration: "Concentration",
          text: "Create an animated, purely visual apparition of a creature up to human size; it cannot make sound. Seeing through it requires an AWARENESS roll (boon at PL1, bane at PL3); those who fail must act as if it were real (re-roll each round). It instantly dissipates for everyone if anyone tries to touch it." },
        { name: "Confusion", rank: 1, prerequisite: "Illusionism", requirement: "Gesture", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Overwhelm a target's mind (opposed INT — boon at PL1, bane at PL3). On success they cannot react and act randomly each turn (D4): 1 do nothing; 2 attack a random creature; 3 attack themselves; 4 dash randomly (hitting a wall = prone + D6). New opposed INT each turn; ends if you break concentration or lose a roll. No monsters or undead." },
        { name: "Long Shadows", rank: 1, prerequisite: "Illusionism", requirement: "Gesture", castingTime: "Action", range: "10 meters", duration: "Stretch",
          text: "All naturally occurring shadows within range deepen, granting a boon on SNEAKING. No effect where there are no natural shadows. Range 30 m at PL2, 100 m at PL3." },
        { name: "Mind Mask", rank: 1, prerequisite: "Illusionism", requirement: "Gesture", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Veil your mind: your appearance is unchanged, but spells like DIVINATION and MAGIC SEAL (and traps/locations/monsters that distinguish creature types) can be fooled about what you are. Also imposes a bane on mind-affecting spells (TELEPATHY, DOMINATE). PL2 covers one more person, PL3 two more. Cannot recast while active." },
        { name: "Send Dream", rank: 1, prerequisite: "Illusionism", requirement: "Word, gesture", castingTime: "Stretch", range: "1 kilometer", duration: "Concentration",
          text: "Project a dream into a sleeping person you have met before — deliver a message or a nightmare. A nightmare means the sleep doesn't count as rest and they cannot take a shift rest for a full day. The victim resists with an INT roll (boon at PL1, bane at PL3)." },
        { name: "Amnesia", rank: 2, prerequisite: "Send Dream", requirement: "Gesture", castingTime: "Action", range: "4 meters", duration: "Instant",
          text: "Look into the victim's eyes and force them to forget everything that occurred within the last stretch (opposed INT — boon at PL1, bane at PL3)." },
        { name: "Illusion", rank: 2, prerequisite: "Apparition", requirement: "Gesture", castingTime: "Action", range: "30 meters", duration: "Concentration",
          text: "Create an illusion of a creature up to human size that affects all senses (sight, sound, smell, touch, taste) — or limit it to specific senses. Seeing through requires an AWARENESS roll (boon at PL1, bane at PL3); failers treat it as real. It can engage in combat (skill level 15, all attacks D6 bludgeoning). New roll to see through each round." },
        { name: "Impersonate", rank: 2, prerequisite: "Mind Mask", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Assume the voice and appearance of a specific individual. Fooled from a distance; deceiving someone who knows them in conversation requires a BLUFFING or PERFORMANCE roll (bane at PL1, boon at PL3)." },
        { name: "Shadow Shroud", rank: 2, prerequisite: "Long Shadows", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Shadows cling to your body, granting a boon on SNEAKING. Duration increases to a shift at PL2 and a full day at PL3." },
        { name: "Trip", rank: 2, prerequisite: "Confusion", requirement: "Gesture", castingTime: "Reaction", range: "20 meters", duration: "Instant",
          text: "Used on a bipedal creature just about to move (opposed EVADE — boon at PL1, bane at PL3). On success it trips and falls prone, interrupting its movement. Monsters are unaffected." },
        { name: "Group Identity", rank: 3, prerequisite: "Impersonate", requirement: "Gesture", castingTime: "Round", range: "4 meters", duration: "Stretch",
          text: "Give yourself and willing creatures within range (up to your base chance in WIL) an illusory disguise as a type of creature (not specific individuals). Fooled from a distance; deceiving in conversation requires your spokesperson to succeed at BLUFFING or PERFORMANCE (bane at PL1, boon at PL3)." },
        { name: "Mass Confusion", rank: 3, prerequisite: "Trip", requirement: "Gesture", castingTime: "Action", range: "10 meters", duration: "Concentration",
          text: "Confuse all opponents within range; each makes an INT roll (boon at PL1, bane at PL3). A confused target can't react and acts randomly (D4, as Confusion). They may re-roll INT each turn. No effect on monsters or undead." },
        { name: "Mirror Image", rank: 3, prerequisite: "Illusion", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Create illusory duplicates of yourself equal to the power level. Enemies can't tell which is real (the GM randomly determines which is hit; a hit duplicate instantly dissipates). Duplicates can't fight or interact. Cannot recast while active." },
        { name: "Shadow Leap", rank: 3, prerequisite: "Shadow Shroud", requirement: "Gesture", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "Teleport from one shadow to another you can see within 30 m. Each power level beyond the first: bring one additional touched human-sized creature, or double the range." },
        { name: "Waking Nightmare", rank: 3, prerequisite: "Amnesia", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Stretch",
          text: "Thrust a living creature into a waking nightmare (opposed INT — boon at PL1, bane at PL3). On success it cannot act or move and loses D6 WP each turn. Each turn after the first it may make a straight INT roll (not an action) to break free. No effect on monsters or undead." },
        { name: "Doppelganger", rank: 4, prerequisite: "Mirror Image", requirement: "Gesture", castingTime: "Stretch", range: "30 meters", duration: "Concentration",
          text: "Create an illusory double; you cannot move while it exists and it vanishes if you break concentration. You fully control it; it has your attributes, skills, abilities, and gear and moves freely within 30 m (100 m at PL2, 500 m at PL3), using your WP. When it attacks, the target may roll AWARENESS to see through it (it vanishes on success). If reduced to 0 HP it disappears and you must roll on the fear table." },
        { name: "False Terrain", rank: 4, prerequisite: "Mirror Image", requirement: "Word, gesture", castingTime: "Stretch", range: "30 meters", duration: "Shift",
          text: "Create illusory terrain hiding what's actually there. PL1 covers a door or hole; PL2 a wagon, small boat, or cave entrance; PL3 a house, ship, or small ravine. An intelligent creature that physically interacts automatically sees through it (though it doesn't vanish); anyone who has seen through it may ignore it." },
        { name: "Fatal Mistake", rank: 4, prerequisite: "Mass Confusion", requirement: "Gesture", castingTime: "Reaction", range: "20 meters", duration: "Instant",
          text: "Force a creature just about to attack to make a fatal error and attack a random ally within reach instead (or itself if it has no allies). Opposed INT roll (boon at PL1, bane at PL3). Monsters are unaffected." },
        { name: "Cheat Fate", rank: 5, prerequisite: "Fatal Mistake", requirement: "Gesture", castingTime: "Reaction", range: "20 meters", duration: "Instant",
          text: "Force the target (a friend or foe, but not yourself) to immediately reroll a roll just made. PL1 affects a skill roll (after they push it, if they do); PL2 a damage roll (incl. damage bonus); PL3 a monster attack roll. Must be cast before any further rolls; the new result stands." },
        { name: "Fata Morgana", rank: 5, prerequisite: "False Terrain", requirement: "Word, gesture", castingTime: "Stretch", range: "100 meters", duration: "Shift",
          text: "Weave a lie so powerful it alters reality: a static illusion so realistic that even those who know it's fake are affected as if it were physical. PL1 a small cottage or boat; PL2 a mansion or ship; PL3 a fortress or grand hunting lodge. When the duration expires it fades fast — a problem for anyone on an upper floor or open water." }
      ]
    },
    necromancy: { keyAttribute: "INT", entry: "Frowned upon / illegal in civilized lands; a necromancer may be met with suspicion or hostility.",
      tricks: [
        { name: "Blight",        text: "Mar the world around you with shades of gray, discordant harmonies, disgusting tastes, or foul odors — a temporary reminder that life is fleeting." },
        { name: "Preserve",      text: "With a touch, arrest the decay of a recently deceased body for a full day; renewable as long as you wish." },
        { name: "Spectral Slap", text: "Your grim gaze delivers a stinging, humiliating slap: 1 HP of damage at a range of 10 meters." },
        { name: "Taint",         text: "Corrupt food, drink, or a fresh corpse through your presence; nearby small animals grow agitated. Anyone who consumes the tainted food/drink is exposed to a lethal poison of potency 9." }
      ],
      spells: [
        { name: "Cadaverous Stench", rank: 1, prerequisite: "Necromancy", requirement: "Gesture", castingTime: "Action", range: "10 meters (cone)", duration: "Instant",
          text: "Exhale a cone of revolting rot; everyone in the area makes a CON roll (not an action; boon at PL1, bane at PL3). Those who fail lose their next turn retching and cannot react until then. No effect on monsters or undead." },
        { name: "Fright", rank: 1, prerequisite: "Necromancy", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Strike fear into a living creature (opposed WIL — boon at PL1, bane at PL3). On success it loses D6 WP and gains the Scared condition. No effect on monsters or undead." },
        { name: "Pain", rank: 1, prerequisite: "Necromancy", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Send waves of excruciating pain through a living creature (opposed CON — boon at PL1, bane at PL3). On success it loses D6 HP (armor no effect) and gains the Exhausted condition. No effect on monsters or undead." },
        { name: "Rigor Mortis", rank: 1, prerequisite: "Necromancy", requirement: "Word, focus", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Stiffen the target's limbs (opposed CON — boon at PL1, bane at PL3). On success its movement is halved and it gains the Dazed condition. No effect on monsters or undead." },
        { name: "Speak With Dead", rank: 1, prerequisite: "Necromancy", requirement: "Word, focus (skull)", castingTime: "Stretch", range: "Touch", duration: "Instant",
          text: "Summon a deceased person's spirit and ask a number of questions equal to the power level. The dead don't lie but only know what they knew in life (hazy, possibly cryptic answers). Requires the deceased's head or skull. A given spirit can only be summoned once." },
        { name: "Undead Aura", rank: 1, prerequisite: "Necromancy", requirement: "Word, gesture", castingTime: "Action", range: "Personal/touch", duration: "Stretch",
          text: "Undead perceive you as one of their own and won't attack unless you strike first; you're also immune to fear caused by undead. PL2: affect a touched willing living being instead of yourself; PL3: both yourself and another." },
        { name: "Animate Carcass", rank: 2, prerequisite: "Speak With Dead", requirement: "Word, ingredient (corpse)", castingTime: "Stretch", range: "Touch", duration: "Shift",
          text: "Reanimate a dead animal as a loyal thrall you command telepathically. Power level caps its HP: PL1 ≤8, PL2 ≤14, PL3 ≤20." },
        { name: "Corrosive Darkness", rank: 2, prerequisite: "Cadaverous Stench", requirement: "Word, gesture", castingTime: "Action", range: "10 meters (cone)", duration: "Instant",
          text: "Cough up a cone of corrosive darkness that lingers a number of rounds equal to the power level. Anyone inside acts as if in total darkness and takes D4 at the start of each turn they remain. Armor has no effect." },
        { name: "Dread", rank: 2, prerequisite: "Fright", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Fill a creature with dread (opposed WIL — boon at PL1, bane at PL3). On success it rolls on the Fear Table (one D8 per power level, use the highest). No effect on monsters or undead." },
        { name: "Incapacitate", rank: 2, prerequisite: "Rigor Mortis", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Paralyze a target (opposed CON — boon at PL1, bane at PL3). On success it is rendered completely helpless — unable to move, act, speak, or gesture for magic. It may make a straight CON roll (not an action) at the start of each turn (except the one right after casting) to break free. No effect on monsters or undead." },
        { name: "Injure", rank: 2, prerequisite: "Pain", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Blast a creature with necromantic energy (opposed CON). On success it takes 2D6 internal-hemorrhage damage, ignoring armor and undodgeable. Each power level adds D6. No effect on the undead." },
        { name: "Undead Resilience", rank: 2, prerequisite: "Undead Aura", requirement: "Word, gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Become immune to cold and drowning. PL2: also immune to fear from any source. PL3: also take half damage from non-magical weapons (after armor, rounded up) — still full damage from fire, magic, and magical weapons." },
        { name: "Hand of Death", rank: 3, prerequisite: "Incapacitate or Injure", requirement: "Gesture", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "An invisible claw of hatred tears at the victim's heart (opposed CON). On success D8 immediately and another D8 per turn while you concentrate (D10 at PL2, D12 at PL3). Ignores armor, undodgeable. No effect on monsters or undead." },
        { name: "Raise Skeleton", rank: 3, prerequisite: "Animate Carcass", requirement: "Word, gesture, ingredient (skeleton)", castingTime: "Stretch", range: "Touch", duration: "Stretch",
          text: "Animate a standard skeleton from a human-sized humanoid. PL2: two skeletons, or duration a shift. PL3: three skeletons for a stretch, two for a shift, or one skeleton champion for a stretch. You command them telepathically at any range; they follow instructions exactly and have no gear unless you provide it." },
        { name: "Terror", rank: 3, prerequisite: "Dread", requirement: "Word, gesture", castingTime: "Action", range: "10 meters (sphere)", duration: "Instant",
          text: "Unleash a wave of terror in all directions; everyone within range makes a WIL roll, and those who fail roll on the Fear Table (one D8 per power level each, use the highest). No effect on monsters or undead." },
        { name: "Drain Life", rank: 4, prerequisite: "Hand of Death", requirement: "Gesture", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Your icy gaze drains the target's life force (opposed WIL). On success D8 immediately and another D8 per turn while you concentrate (D10 at PL2, D12 at PL3). You heal 1 HP per point of damage dealt (up to your max). Ignores armor, undodgeable. No effect on monsters or undead." },
        { name: "Necrotic Chill", rank: 4, prerequisite: "Terror", requirement: "Word, gesture", castingTime: "Action", range: "20 meters (sphere)", duration: "Instant",
          text: "A wave of mortal dread: everyone within range takes D6 (armor no effect), becomes cold, and must succeed on a WIL roll or roll on the Fear Table (one D8 per power level each, use the highest). No effect on monsters or undead." },
        { name: "Raise Wight", rank: 4, prerequisite: "Raise Skeleton", requirement: "Word, gesture, ingredient (a dead ruler or mighty warrior)", castingTime: "Shift", range: "Touch", duration: "Shift",
          text: "Reanimate a deceased lord, lady, or mighty warrior as an undead wight bound to your service (often interred with weapons and armor). Duration: a full day at PL2, a week at PL3. You command it telepathically at any range and decide whom it attacks, but not its specific actions (rolled on the monster attack table). Only one wight at a time." },
        { name: "Defy Death", rank: 5, prerequisite: "Drain Life", requirement: "Word, gesture, ingredient (fresh corpse)", castingTime: "Shift", range: "Unlimited", duration: "Instant",
          text: "Prepare a new vessel for your spirit. Requires the intact corpse of someone dead no more than a day; once embalmed it can be stored up to a year, protected from decay. On your death, make a WIL roll (cannot be pushed; bane at PL1, boon at PL3) — on success you awaken in the new body a stretch after death, retaining memories and stats, except CHA and all CHA-based skills are reduced by D3 (minimum 3)." },
        { name: "Raise Mummy", rank: 5, prerequisite: "Raise Wight", requirement: "Word, gesture, ingredient (a dead ruler or mighty warrior, plus oils and linen wrappings)", castingTime: "Shift", range: "Touch", duration: "Shift",
          text: "Anoint and wrap the corpse of a deceased lord, lady, or mighty warrior to raise a powerful, obedient mummy. Duration: a full day at PL2, a week at PL3. You command it telepathically at any range and decide whom it attacks, but not its specific actions (monster attack table). Only one mummy at a time." },
        { name: "Raise Skeletal Horde", rank: 5, prerequisite: "Raise Wight", requirement: "Word, gesture, ingredient (skeletons)", castingTime: "Stretch", range: "50 meters", duration: "Shift",
          text: "Raise a horde of skeletons that blindly obey you, up to your base chance in WIL (×2 at PL2, ×3 at PL3). The horde takes a single turn per round but makes attacks equal to the number of skeletons ÷ 5 (rounded up). Each skeleton has its own HP and moves individually but must stay within 2 m of another. Only one horde at a time." }
      ]
    },
    symbolism: { keyAttribute: "INT", entry: "Most symbolist spells require the 'Symbol' requirement — a magical symbol drawn or carved (longer casting times yield longer durations).",
      tricks: [
        { name: "Cipher",        text: "Turn a written text into a personal cipher so only a named person you know can read it normally. Can be dispelled." },
        { name: "Dictation",     text: "A quill writes down exactly what you say, word for word, for a stretch." },
        { name: "Erase",         text: "Erase one page of text not carved into durable material, simply by looking at it." },
        { name: "Speed Reading", text: "Read one page of text per breath, retaining it as if read at normal pace — you can learn something from a book (e.g. a spell) in a stretch instead of a shift." }
      ],
      spells: [
        { name: "Farscribe", rank: 1, prerequisite: "Symbolism", requirement: "Symbol", castingTime: "Stretch/shift", range: "100 meters", duration: "Stretch/shift",
          text: "Draw/carve this symbol, then write or draw on it to project that text or image as glowing script onto any flat surface within range (you must have seen the surface before). PL2 range 1 km, PL3 10 km." },
        { name: "Hesitation", rank: 1, prerequisite: "Symbolism", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone who sees the symbol makes a WIL roll on their turn (not an action; boon at PL1, bane at PL3). On a failure they swap their initiative card for the worst available (in combat) and suffer a bane on all skill rolls. Re-roll each turn; success ends it for that individual." },
        { name: "Lure", rank: 1, prerequisite: "Symbolism", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone who sees the symbol makes a WIL roll (not an action; boon at PL1, bane at PL3). On a failure they must move toward the symbol at normal rate and can't look away (a bane on AWARENESS); they can still fight. Re-roll each turn; success ends it." },
        { name: "Shield Rune", rank: 1, prerequisite: "Symbolism", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Touch", duration: "Round/stretch/shift",
          text: "An invisible shield imposes a bane on all non-magical attacks against the target. Each power level after the first doubles the duration. Self ok." },
        { name: "Sunder", rank: 1, prerequisite: "Symbolism", requirement: "Symbol", castingTime: "Action", range: "Touch", duration: "Instant",
          text: "Quickly draw the symbol on a non-magical inanimate object (weapon, door, etc.) to inflict 2D10 damage, ignoring armor. Each power level adds D10." },
        { name: "Fortify", rank: 2, prerequisite: "Sunder", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Touch", duration: "Round/stretch/shift",
          text: "Reinforce a door, wall, bridge, or pillar: its armor rating increases by 10 per power level for the duration." },
        { name: "Halt", rank: 2, prerequisite: "Hesitation or Lure", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone who sees the symbol must succeed on a WIL roll (boon at PL1, bane at PL3) to be able to move toward it at all. Re-roll each turn; success ends it." },
        { name: "Magic Armor", rank: 2, prerequisite: "Shield Rune", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Touch", duration: "Round/stretch/shift",
          text: "Protect a person against magic: any spell cast on them is rolled with one bane per power level. Self ok." },
        { name: "Warding Mark", rank: 2, prerequisite: "Farscribe", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Touch", duration: "Round/stretch/shift",
          text: "Prevent all teleportation and magical transport to or from a location, plus any magical spying directed at it. PL1 wards a room, PL2 a building, PL3 an entire city." },
        { name: "Arcane Vortex", rank: 3, prerequisite: "Warding Mark", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters (sphere)", duration: "Round/stretch/shift",
          text: "Create a vortex consuming magical energy. Anyone entering loses D6 WP per power level, and each power level imposes a bane on casting inside. Magical weapons inside no longer count as magical (keep non-magical effects). You are unaffected; everyone else is, friend or foe." },
        { name: "Horrify", rank: 3, prerequisite: "Halt", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone who sees the symbol must succeed on a WIL roll with a bane or roll on the Fear Table (one D8 per power level, use the highest). No effect on monsters or undead." },
        { name: "Power Source", rank: 3, prerequisite: "Fortify", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "10 meters", duration: "Round/stretch/shift",
          text: "Everyone within range except you recovers D6 WP and heals one condition per power level — on casting, or when they come within range while it's active. Friend or foe. A person benefits only once per shift." },
        { name: "Retribution Rune", rank: 3, prerequisite: "Magic Armor", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Personal", duration: "Round/stretch/shift",
          text: "An invisible shield imposes one bane per power level on all non-magical attacks against the protected person (self ok). If an attack against them misses, it hits the attacker instead." },
        { name: "Blind", rank: 4, prerequisite: "Horrify", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone who sees the symbol must succeed on a WIL roll (not an action; boon at PL1, bane at PL3) or be blinded for one stretch, acting as if in complete darkness. Once it ends, that creature is immune to this specific symbol. No effect on monsters or undead." },
        { name: "Golem", rank: 4, prerequisite: "Power Source", requirement: "Symbol", castingTime: "Stretch/shift", range: "Touch", duration: "Stretch/shift",
          text: "Carve symbols on a clay figure or stone statue to bring it to life as a golem bodyguard that obeys your commands. [Movement 8, Armor 6, HP 8 per power level; Stone fists hit automatically in melee (can be dodged/parried) for D6 bludgeoning per power level.]" },
        { name: "Portal", rank: 4, prerequisite: "Arcane Vortex", requirement: "Symbol", castingTime: "Stretch/shift", range: "1 kilometer", duration: "Stretch/shift",
          text: "Create a portal to another location within 1 km (you must see it or have visited it). Creatures up to human size pass through as a normal movement. PL2 range 10 km, PL3 100 km." },
        { name: "Reflect Magic", rank: 4, prerequisite: "Retribution Rune", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "Personal", duration: "Round/stretch/shift",
          text: "Protect a person against magic and reflect hostile spells. Any spell cast on them by another mage (not you) is rolled with one bane per power level; if it fails, the caster suffers its effect instead. Self ok." },
        { name: "Petrify", rank: 5, prerequisite: "Blind", requirement: "Symbol", castingTime: "Action/stretch/shift", range: "20 meters", duration: "Round/stretch/shift",
          text: "Anyone except the caster who sees the symbol must succeed on a WIL roll (boon at PL1, bane at PL3) or be turned to stone for the duration — unable to move, act, or speak, but gaining armor rating 10 (their gear is petrified too). No effect on monsters or undead." },
        { name: "Raise Fortress", rank: 5, prerequisite: "Golem", requirement: "Symbol", castingTime: "Shift", range: "Touch", duration: "Shift",
          text: "Carve symbols into living rock to raise a stone structure: PL1 a small cottage, PL2 a two-story tower, PL3 a walled castle. The walls have armor rating 10× the power level and withstand 20 damage per power level before collapsing. When the duration expires, the structure crumbles into sand." },
        { name: "Runic Prison", rank: 5, prerequisite: "Portal", requirement: "Symbol", castingTime: "Stretch/shift", range: "20 meters", duration: "Stretch/shift",
          text: "Carve a symbol containing a person's name; if that creature sees it, they must succeed on a WIL roll (boon at PL1, bane at PL3) or be pulled into the symbol, imprisoned with their gear for the duration. You can carve it on a portable object. If made permanent via PERMANENCE, the victim does not age while imprisoned. No effect on monsters or undead." }
      ]
    },
    witchcraft: { keyAttribute: "INT", entry: null,
      tricks: [
        { name: "Broom Sweep", text: "Enchant a broom to clean the room you're in — dust and dirt vanish and items are tidied." },
        { name: "Itch",        text: "Trigger a localized itch on a person within 20 m that you can see; irritating but harmless, subsiding after a stretch." },
        { name: "Read Stars",  text: "Divine another person's future in the stars (takes a stretch), granting a boon on a BLUFFING and a PERSUASION roll against them." }
      ],
      spells: [
        { name: "Animal Sense", rank: 1, prerequisite: "Witchcraft", requirement: "Word", castingTime: "Action", range: "30 meters", duration: "Concentration",
          text: "Project your consciousness into a common animal within range, controlling its body. PL1 it must stay within 30 m of your body, PL2 up to 300 m, PL3 freely. You can't compel it against its nature or make it fight on command. While in it you can't speak or use your own skills (its stats are used). If it's killed while active, you take damage equal to the power level." },
        { name: "Augury", rank: 1, prerequisite: "Witchcraft", requirement: "Word, gesture", castingTime: "Stretch", range: "Personal", duration: "Instant",
          text: "Divine the future: ask a number of questions equal to the power level about the coming day; the GM answers each truthfully with yes, no, or uncertain." },
        { name: "Helper", rank: 1, prerequisite: "Witchcraft", requirement: "Word, ingredient", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Fashion a knee-high helper from sticks, moss, and candles that obeys simple commands (no skill rolls) and must stay within 50 m. PL2 lasts a shift, PL3 a day. Only one at a time; it dissolves into debris when the spell ends." },
        { name: "Protective Aura", rank: 1, prerequisite: "Witchcraft", requirement: "Word", castingTime: "Action", range: "Personal", duration: "Round",
          text: "Any living creature wishing to attack you must succeed on a WIL roll (not an action) or choose another target or refrain. PL2 lasts a stretch, PL3 a shift. Demons, monsters, and undead are unaffected." },
        { name: "Witch Mark", rank: 1, prerequisite: "Witchcraft", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Mark a creature with an invisible witch's mark, imposing a bane on its WIL rolls to resist fear. PL2 expands this to all WIL rolls, PL3 increases the duration to a shift. Only one Witch Mark per victim at a time." },
        { name: "Bestial Traits", rank: 2, prerequisite: "Animal Sense", requirement: "Word", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Grant yourself a number of animal traits equal to the power level (can't recast while active): Claws (unarmed 2D6 slashing); Fangs (unarmed D8 piercing + paralyzing poison potency 12); Fur or Feathers (auto-resist cold); Gills and Webbing (breathe underwater, boon on SWIMMING); Night Vision (unaffected by total darkness); Scales (armor rating 3, not combinable with worn armor)." },
        { name: "Curse", rank: 2, prerequisite: "Protective Aura or Witch Mark", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Place a curse (opposed WIL — boon at PL1, bane at PL3). On success the target suffers a bane on all skill rolls for a stretch. A creature already Cursed can't be Cursed again while it lasts. Monsters are unaffected." },
        { name: "Fury of the Wild", rank: 2, prerequisite: "Helper", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Make a number of common mammals or birds up to the power level become aggressive and attack the nearest enemy (you can't control exactly which targets). No effect on monsters." },
        { name: "Soothsaying", rank: 2, prerequisite: "Augury", requirement: "Word, gesture", castingTime: "Stretch", range: "Personal", duration: "Instant",
          text: "Ask the GM one question per power level (about the current adventure, people/creatures you encounter, or your location); answered truthfully, though possibly cryptically." },
        { name: "Bestial Helper", rank: 3, prerequisite: "Fury of the Wild", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Bleed, vomit, or lay an egg to bring forth a helper of your own flesh and blood (costs you D6 HP, no armor). It looks like an animal from afar but monstrous up close; it obeys and fights for you, dissolving into a bloody mass when the spell ends. PL1 has a dog's stats, PL2 a boar's, PL3 a bear's. Anyone it attacks suffers a fear attack. One at a time." },
        { name: "Hex", rank: 3, prerequisite: "Curse", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Put a hex on a creature (opposed WIL — boon at PL1, bane at PL3). On success it loses 2D6 WP and suffers a bane on all skill rolls for a stretch. Can't be re-hexed while active, but a target can be both Cursed and Hexed (two banes). Monsters are unaffected." },
        { name: "Safe Travels", rank: 3, prerequisite: "Soothsaying", requirement: "Word", castingTime: "Stretch", range: "Touch", duration: "Instant",
          text: "Wish someone a safe journey. If sincere, the GM rolls twice for the next random encounter and takes the most favorable result; if ironic, the least favorable. The power level sets how many random encounters are affected. You may use it on your own companions to benefit yourself too." },
        { name: "Shapeshift", rank: 3, prerequisite: "Bestial Traits", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Transform into a mammal (from the animals table). You gain its stats and attacks but keep your own skill levels and heroic abilities, and keep any damage taken. You lose speech and higher reasoning — INT-based skill rolls get a bane. PL2 lasts a shift, PL3 a week. Change back early by recasting at the same power level." },
        { name: "Animate Object", rank: 4, prerequisite: "Hex", requirement: "Word, gesture, focus", castingTime: "Action", range: "Touch", duration: "Stretch",
          text: "Animate an inanimate object (e.g. a broom) so it carries you up to 20 m per movement (you move on your turn). Each additional power level adds one: the object can fly; it can carry up to four people; or the duration increases to a shift." },
        { name: "Compulsion", rank: 4, prerequisite: "Hex", requirement: "Word, gesture, ingredient (a lock of hair or item belonging to the victim)", castingTime: "Stretch", range: "100 meters", duration: "Day",
          text: "Speak a compelling command (opposed WIL — boon at PL1, bane at PL3). On success the target must carry out your command over the coming day. You cannot force them to kill, and it has no effect on monsters." },
        { name: "Flattery", rank: 4, prerequisite: "Safe Travels", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Concentration",
          text: "Lavish a living creature with praise: it gains one boon per power level on all skill rolls as long as you maintain concentration and keep flattering it." },
        { name: "Monster Whisperer", rank: 4, prerequisite: "Shapeshift", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Influence a monster's attack: either choose the target of its next monster attack (within the attack's range) or have the GM reroll the monster attack (the second result stands). PL2 lets you do both; PL3 lets the GM reroll twice. You can't force it to attack itself or an inanimate object." },
        { name: "Doomsday Prophecy", rank: 5, prerequisite: "Compulsion", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Stretch",
          text: "Invoke the nature spirits' judgment on a creature, which it cannot resist (except by magical means). PL1: a bane on all skill rolls; PL2: also takes double damage from all attacks (before armor); PL3: also cannot roll dragons. Can't be cast twice on the same target but stacks with Curse and Hex. No effect on monsters." },
        { name: "Monster Form", rank: 5, prerequisite: "Monster Whisperer", requirement: "Gesture", castingTime: "Action", range: "Personal", duration: "Permanent",
          text: "Transform into a monster (HP cap by power level: 20/40/60), keeping any damage taken. Only creatures with monster attacks — not other humanoids, and never dragons, demons, or undead. You follow the monster rules, gaining its stats and monster attacks (choose freely, but not the same attack twice in a row), and may take other reasonable actions. You keep your INT-based skills, but if the monster can't speak you lose speech and those rolls get a bane. Change back by recasting." },
        { name: "Monster Warden", rank: 5, prerequisite: "Monster Whisperer", requirement: "Word, gesture", castingTime: "Stretch", range: "30 meters", duration: "Shift",
          text: "Bind a monster within range to guard a place within sight against intruders (you decide who counts as an intruder when casting). HP cap by power level (20/40/60). You roll with a bane if the place is the monster's own lair. If you or your companions harm it, the effect immediately ends. No effect on demons, dragons, or undead." },
        { name: "Polymorph", rank: 5, prerequisite: "Animate Object", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Shift",
          text: "Transform a living humanoid into an insignificant creature (toad, harmless snake, mouse, large insect…) — opposed WIL (boon at PL1, bane at PL3). On success it becomes a creature with 1 HP and Movement 6 but gains skill level 15 in SNEAKING and EVADE; it cannot speak or use other skills. If reduced to 0 HP it doesn't revert but uses its original CON for death rolls. No effect on monsters or undead." }
      ]
    },
    alchemy: { keyAttribute: "INT",
      entry: "Recipes, not spells: you brew substances (usually potions) in a laboratory. Preparing a recipe takes a shift, an ALCHEMY roll, and consumes the listed ingredients (one dose each per dose made) even on a failure. Except for poisons, alchemical substances don't scale with power level — power level = how many doses you produce. New alchemists start with a field laboratory. Substances keep forever; only a COUNTER RITUAL (not DISPEL) can neutralize one. Spells here use `ingredients`/`cost` instead of range/duration. No magic tricks.",
      tricks: [],
      spells: [
        { name: "Focus Tonic", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, wolf blood", cost: "5 gold (rare)", text: "Cures the Dazed condition." },
        { name: "Herbal Concoction", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs", cost: "1 gold (uncommon)", text: "Grants a boon on HEALING rolls to tend someone suffering from a disease." },
        { name: "Invigorating Decoction", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, boar tusk", cost: "5 gold (rare)", text: "Cures the Exhausted condition." },
        { name: "Liquid Courage", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, bear tooth", cost: "5 gold (rare)", text: "Cures the Scared condition." },
        { name: "Medicinal Water", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, deer antler", cost: "5 gold (rare)", text: "Cures the Sickly condition." },
        { name: "Sleeping Poison", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, spider venom", cost: "6 silver × potency (uncommon)", text: "A sleeping poison — ingested or applied to a weapon. Potency 12, +3 per additional power level." },
        { name: "Soothing Brew", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, mead", cost: "5 gold (rare)", text: "Cures the Angry condition." },
        { name: "Spiritlifter", rank: 1, prerequisite: "Alchemy", ingredients: "General herbs, sulfur", cost: "5 gold (rare)", text: "Cures the Disheartened condition." },
        { name: "Stun Powder", rank: 1, prerequisite: "Alchemy", ingredients: "Saltpeter, sulfur", cost: "4 gold (uncommon)", text: "Blown into the face of a target within 4 m (BRAWLING roll); on a hit the target becomes Dazed." },
        { name: "Antidote", rank: 2, prerequisite: "Focus Tonic, Invigorating Decoction, Medicinal Water, or Soothing Brew", ingredients: "General herbs, sea serpent bile", cost: "20 gold (rare)", text: "Cancels the full effect of a poison; any limited effects remain." },
        { name: "Healing Draught", rank: 2, prerequisite: "Herbal Concoction", ingredients: "General herbs, hobgoblin blood", cost: "10 gold (rare)", text: "Immediately restores D6 HP." },
        { name: "Lock Acid", rank: 2, prerequisite: "Spiritlifter", ingredients: "Sulfur, troll bile", cost: "10 gold (rare)", text: "Corrodes and destroys a lock or other small metal object in one stretch." },
        { name: "Love Potion", rank: 2, prerequisite: "Liquid Courage", ingredients: "General herbs, nymph tears", cost: "20 gold (rare)", text: "Grants a boon on all CHA-based skill rolls directed at the person who drank it, for one shift." },
        { name: "Paralyzing Poison", rank: 2, prerequisite: "Sleeping Poison", ingredients: "General herbs, bat blood", cost: "12 silver × potency (uncommon)", text: "A paralyzing poison — ingested or applied to a weapon. Potency 12, +3 per additional power level." },
        { name: "Puff Bomb", rank: 2, prerequisite: "Stun Powder", ingredients: "Charcoal, saltpeter, sulfur", cost: "10 gold (rare)", text: "Thrown up to STR meters (BRAWLING roll); deals D8 fire damage on a hit. Can also light a campfire." },
        { name: "Smokescreen", rank: 2, prerequisite: "Stun Powder", ingredients: "Charcoal, saltpeter, sulfur, octopus ink", cost: "10 gold (rare)", text: "Thrown up to STR meters; creates a thick 4 m-radius smoke cloud blocking all vision (everyone inside acts as in complete darkness). At the start of each round roll D4 (outdoors) or D8 (indoors); on a 1 the smoke dissipates." },
        { name: "Corrosive Sludge", rank: 3, prerequisite: "Lock Acid", ingredients: "Sulfur, troll bile, ghoul bone", cost: "25 gold (rare)", text: "A viscous acid thrown up to STR meters (BRAWLING roll); D8 damage on a hit. If the target wears armor, its armor rating is permanently reduced by the same amount (not natural armor)." },
        { name: "Drops of Strength", rank: 3, prerequisite: "Antidote", ingredients: "General herbs, giant blood", cost: "60 gold (rare)", text: "Raises STR to 18 for one shift (STR damage bonus +D6, carrying capacity 9); also cures Exhausted and grants a boon on all STR-based skill rolls (skill levels unaffected)." },
        { name: "Elixir of Wisdom", rank: 3, prerequisite: "Antidote", ingredients: "General herbs, troll tooth", cost: "60 gold (rare)", text: "Grants a boon on all INT-based skill rolls for one shift; also cures Angry." },
        { name: "Healing Potion", rank: 3, prerequisite: "Healing Draught", ingredients: "General herbs, troll blood", cost: "50 gold (rare)", text: "Immediately restores 2D6 HP." },
        { name: "Lethal Poison", rank: 3, prerequisite: "Paralyzing Poison", ingredients: "General herbs, spider venom", cost: "2 gold × potency (uncommon)", text: "A lethal poison — ingested or applied to a weapon. Potency 12, +3 per additional power level." },
        { name: "Nimble Nectar", rank: 3, prerequisite: "Antidote", ingredients: "General herbs, griffon feather", cost: "60 gold (rare)", text: "Raises AGL to 18 for one shift (AGL damage bonus +D6, increased movement); also cures Dazed and grants a boon on all AGL-based skill rolls (skill levels unaffected)." },
        { name: "Sunflash", rank: 3, prerequisite: "Puff Bomb", ingredients: "Charcoal, saltpeter, sulfur, manticore spike", cost: "30 gold (rare)", text: "Thrown on the ground for a bright flash; everyone within 10 m who is unprepared must succeed on an EVADE roll (not an action) or be blinded and lose their next turn (no reactions until then). Nightkin also take D6 damage (armor no effect)." },
        { name: "Tincture of Beauty", rank: 3, prerequisite: "Love Potion", ingredients: "General herbs, vampire blood", cost: "80 gold (rare)", text: "Grants a boon on all CHA-based skill rolls for one shift; also cures Disheartened." },
        { name: "Battle Fumes", rank: 4, prerequisite: "Drops of Strength", ingredients: "General herbs, saltpeter, sulfur, giant blood", cost: "100 gold (unique)", text: "A bubbling cauldron releasing strengthening fumes for one shift. Anyone who takes a Stretch rest within 4 m gains a boon on all melee attacks for the next shift." },
        { name: "Explosive Orb", rank: 4, prerequisite: "Sunflash", ingredients: "Charcoal, saltpeter, sulfur, iron filings", cost: "60 gold (rare)", text: "Thrown up to STR meters (BRAWLING roll); deals 3D6 bludgeoning to the target and everyone within 4 m." },
        { name: "Healing Tincture", rank: 4, prerequisite: "Healing Potion", ingredients: "General herbs, hydra blood", cost: "80 gold (unique)", text: "Immediately restores 3D6 HP and 3D6 WP." },
        { name: "Healing Vapors", rank: 4, prerequisite: "Healing Potion", ingredients: "General herbs, saltpeter, sulfur, troll blood", cost: "70 gold (rare)", text: "A bubbling cauldron releasing healing vapors for one shift. Anyone who takes a Stretch rest within 4 m gains the full benefits of a Shift rest." },
        { name: "Philosopher's Stone", rank: 4, prerequisite: "Elixir of Wisdom", ingredients: "Demon blood, dragon blood", cost: "— (unique)", text: "Produces one dose of Philosopher's Stone, used as an ingredient in other recipes." },
        { name: "Toxic Mist", rank: 4, prerequisite: "Lethal Poison", ingredients: "Charcoal, saltpeter, sulfur, spider venom", cost: "50 gold (rare)", text: "A poison bomb thrown up to STR meters; produces a 4 m-radius toxic mist. Anyone inside is afflicted by a paralyzing, sleeping, or lethal poison (your choice) of potency 15." },
        { name: "Create Gold", rank: 5, prerequisite: "Philosopher's Stone", ingredients: "Philosopher's stone, iron filings", cost: "—", text: "Each dose transmutes the iron into gold (worth D8 × 10 gold coins)." },
        { name: "Elixir of Life", rank: 5, prerequisite: "Healing Tincture", ingredients: "General herbs, philosopher's stone, hydra blood", cost: "— (unique)", text: "Immediately restores all lost HP and WP and cures all conditions, diseases, poison effects, and severe injuries. Anyone at 0 HP who drinks it stops making death rolls." },
        { name: "Homunculus", rank: 5, prerequisite: "Philosopher's Stone", ingredients: "Philosopher's stone, ghoul bone, fairy dust", cost: "— (unique)", text: "Create a ~30 cm humanoid that follows your commands like a familiar: 6 HP, Movement 8, skill level 15 in SNEAKING and EVADE, all standard familiar abilities except Trained, plus the Gather ability. It is disobedient and must be successfully PERSUADED daily or it runs away." }
      ]
    },
    enchanting: { keyAttribute: "INT",
      entry: "Bind magic to inanimate objects (items you craft — needing Master Tanner/Blacksmith/Carpenter — or existing ones) rather than casting on your surroundings. Requires blacksmithing/carpentry/tanning tools; binding takes a stretch; the effect is immediate and lasts a shift unless made permanent with PERMANENCE. Multiple enchanting spells can be bound to one item at once (roll/pay WP each; if any fails, all fail). No Magic Seal needed, and using the item costs no WP. An enchanted weapon counts as magical. Spells here use `item` (what they're cast on). No magic tricks.",
      tricks: [],
      spells: [
        { name: "Concealing", rank: 1, prerequisite: "Enchanting", item: "Leather armor or clothing", text: "The wearer gains a boon on SNEAKING rolls." },
        { name: "Farshot", rank: 1, prerequisite: "Enchanting", item: "Slings, bows, crossbows, quivers", text: "The weapon's range (or the range of arrows drawn from the quiver) is doubled at PL1, tripled at PL2, quadrupled at PL3." },
        { name: "Keen Edge", rank: 1, prerequisite: "Enchanting", item: "Slashing/piercing weapons, or a quiver", text: "The armor rating of any worn or natural armor struck by the weapon (or arrows) counts as one step lower per power level (minimum 0)." },
        { name: "Luminous", rank: 1, prerequisite: "Enchanting", item: "Any item", text: "The item emits a bright glow whenever a specific type of non-human creature comes within 30 m (e.g. elves, dwarves, halflings, wolfkin, nightkin, undead, dragons, demons)." },
        { name: "Supple Armor", rank: 1, prerequisite: "Enchanting", item: "Metal armor (chainmail, plate)", text: "The wearer suffers no bane on EVADE rolls (otherwise standard for metal armor)." },
        { name: "Thinking Cap", rank: 1, prerequisite: "Enchanting", item: "Helmets, hats, headwear", text: "The wearer gains a boon on a number of these skills equal to the power level: Beast Lore, Languages, Myths & Legends, or an INT-based secondary skill of choice (excluding magic schools)." },
        { name: "Unbreakable", rank: 1, prerequisite: "Enchanting", item: "Weapons and shields", text: "The item's durability increases by 9 points per power level." },
        { name: "Warming", rank: 1, prerequisite: "Enchanting", item: "Clothing or armor", text: "The wearer gains armor rating 6 per power level against all cold-based damage (incl. magical cold), plus immunity to the effects of cold." },
        { name: "Bane Weapon", rank: 2, prerequisite: "Luminous", item: "Weapons, shields, quivers", text: "All attacks and parries with the weapon/shield (or arrows) are rolled with a boon against a specific type of non-human creature (e.g. undead, dragons, demons)." },
        { name: "Bleeding Weapon", rank: 2, prerequisite: "Keen Edge", item: "Slashing/piercing weapons, or a quiver", text: "When the weapon (or an arrow) deals damage to a living target, the victim takes 1 damage on each of their turns until they reach 0 HP or someone stops the bleeding with a successful HEALING roll." },
        { name: "Dread Weapon", rank: 2, prerequisite: "Farshot", item: "Weapons or quivers", text: "When the weapon (or an arrow) deals damage to a living target, the victim must succeed on a WIL roll or roll on the Fear Table." },
        { name: "Fireproof", rank: 2, prerequisite: "Warming", item: "Clothing or armor", text: "The wearer gains armor rating 6 per power level against all fire and heat damage (incl. magical fire), in addition to existing armor." },
        { name: "Fleet Step", rank: 2, prerequisite: "Concealing or Supple Armor", item: "Clothing (shoes/boots)", text: "The wearer's movement rate increases by 4 per power level." },
        { name: "Heroism", rank: 2, prerequisite: "Thinking Cap", item: "Worn item (helmet, ring, etc.)", text: "The wearer may ignore the negative effects of one condition per power level (they still have the condition, but are immune to its effects). Must be worn as intended." },
        { name: "Poison Sting", rank: 2, prerequisite: "Unbreakable", item: "Slashing/piercing weapons, or a quiver", text: "When the weapon (or an arrow) deals damage to a living target, it afflicts a poison of a chosen type (set at casting). Potency 12, +3 per additional power level." },
        { name: "Bloodsucker", rank: 3, prerequisite: "Bleeding Weapon", item: "Melee slashing/piercing weapons", text: "When the weapon deals damage to a living target, the victim loses half that amount of WP (rounded up) and the user regains the same amount of spent WP (up to their max)." },
        { name: "Enchanted Weapon", rank: 3, prerequisite: "Bane Weapon or Dread Weapon", item: "Weapons, shields, quivers", text: "When attacking/parrying with the weapon/shield (or arrows), a result of 1–2 counts as a dragon (1–3 at PL2, 1–4 at PL3)." },
        { name: "Garment of Strength", rank: 3, prerequisite: "Fleet Step", item: "Clothing or armor", text: "While worn, the user's STR is treated as 18 (damage bonus +D6, carrying capacity 9). STR-based skills are not affected." },
        { name: "Hidden Weapon", rank: 3, prerequisite: "Poison Sting", item: "Non-weapon items (clothing, boxes, chests)", text: "On the user's command (an action), a weapon emerges and attacks, hitting automatically (but can be dodged/parried). It is equivalent to a dagger (D8) at PL1, a short spear (D10) at PL2, or a short bow (D10, range 30 m) at PL3 — no damage bonus, can't parry, undetectable while hidden. Other weapon enchanting spells may also be applied to it." },
        { name: "Magic Wand", rank: 3, prerequisite: "Heroism", item: "Staff or wand", text: "The user gains a boon on all rolls for a specific school of magic." },
        { name: "Resonant Plate", rank: 3, prerequisite: "Fireproof", item: "Plate armor", text: "When the wearer is hit by a melee attack, the armor emits a deafening sound; everyone within 6 m (except the wearer) becomes Dazed unless already Dazed. Monsters are unaffected." },
        { name: "Endless Capacity", rank: 4, prerequisite: "Magic Wand", item: "Storage items (bottles, chests, barrels, backpacks)", text: "The item's storage capacity is multiplied by 10 per power level." },
        { name: "Heavy Hitter", rank: 4, prerequisite: "Enchanted Weapon", item: "Bludgeoning weapons", text: "When the weapon deals damage to a living target, the victim becomes Dazed." },
        { name: "Lifesaver", rank: 4, prerequisite: "Garment of Strength or Resonant Plate", item: "Worn item (armor, amulet, etc.)", text: "The wearer gains a boon per power level on death rolls. Must be worn as intended." },
        { name: "Seeking Arrow", rank: 4, prerequisite: "Enchanted Weapon", item: "Slings, bows, crossbows, quivers", text: "Attacks with the weapon (or arrows) are not affected by banes, only by boons." },
        { name: "Swift Swing", rank: 4, prerequisite: "Enchanted Weapon", item: "Weapons", text: "If an attack with the weapon reduces a target to 0 HP, the user may immediately perform an additional attack." },
        { name: "Throwable", rank: 4, prerequisite: "Enchanted Weapon", item: "Melee weapons", text: "As a ranged attack, the weapon can be thrown a number of meters equal to STR × the power level, then automatically returns to the thrower's hand." },
        { name: "Epic Armor", rank: 5, prerequisite: "Lifesaver", item: "Armor and helmets", text: "The item's armor rating increases by 1 per power level." },
        { name: "Epic Weapon", rank: 5, prerequisite: "Heavy Hitter, Seeking Arrow, Swift Swing, or Throwable", item: "Weapons", text: "All attacks with the weapon deal +2 damage per power level." },
        { name: "Power Item", rank: 5, prerequisite: "Lifesaver", item: "Headwear or jewelry", text: "The user's maximum WP increases by 2 per power level as long as the item is worn as intended." }
      ]
    },
    dracomancy: { keyAttribute: "INT", entry: "Learn-in-play ONLY. You must already be a master of another school (have learned at least one rank 5 spell). All dracomantic spells are rank 6. Extremely taxing: casting costs THREE times the normal WP — 6 WP per power level. No magic tricks.",
      tricks: [],
      spells: [
        { name: "Astral Form", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word", castingTime: "Action", range: "Personal", duration: "Shift",
          text: "Project your mind out of your body. In astral form you move freely through air and solid matter at 20 m/round (doubled when dashing; each power level beyond the first doubles your speed). You can see, hear, and pass through all materials except metal, but cannot interact or communicate. Your physical body remains unconscious (you're vaguely aware of it) and you can return to it as an action. If your body is killed while you're in astral form, you become a ghost." },
        { name: "Command Dragon", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word, gesture", castingTime: "Action", range: "20 meters", duration: "Instant",
          text: "Seize temporary control of a dragon; power level sets the age you can command (PL1 a hatchling or young dragon, PL2 an adult dragon, PL3 an ancient dragon). On success the dragon immediately makes one movement and one monster attack of your choice, then loses its next turn." },
        { name: "Draconic Push", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Release a wave of energy that hurls all creatures (including monsters) within range 2D8 m away regardless of size; all land prone. It affects everyone in range, friend or foe (roll separately for each). Each victim takes bludgeoning damage equal to the meters hurled, and the attack cannot be dodged. Distance/damage increase to 3D8 at PL2 and 4D8 at PL3." },
        { name: "Force Field", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word, gesture", castingTime: "Action", range: "Personal", duration: "Stretch",
          text: "Create a shimmering, stationary field of energy. No physical object (including you) can pass through it, and it even blocks teleportation. PL2 can cover a building, PL3 an entire city; an extra power level increases the duration to a shift. It can only be undone by another dracomancer's COUNTER RITUAL (a DRACOMANCY roll)." },
        { name: "Reshape", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word, gesture", castingTime: "Action", range: "Touch", duration: "Permanent",
          text: "Permanently and fundamentally alter the nature of an object or creature — change a person's appearance or kin (including their innate ability), or turn a sword into a shovel. An unwilling creature requires an opposed roll against its WIL (monsters have WIL 15 unless stated). Power level caps the size: Small at PL1, Normal at PL2, Large at PL3. The new object must be the same material and roughly the same size." },
        { name: "Translocate", rank: 6, prerequisite: "Any rank 5 spell", requirement: "Word, gesture", castingTime: "Action", range: "10 meters", duration: "Instant",
          text: "Teleport another creature or object (up to Normal size) within range to any point up to 1 km away (you must see the destination or have visited it). An unwilling creature requires an opposed roll against its WIL (monsters have WIL 15 unless stated). Each additional power level either increases the size by one category (Large, then Huge) or multiplies the range by 10." }
      ]
    }
  }
};

if (typeof window !== "undefined") { window.DRAGONBANE_MAGIC = DRAGONBANE_MAGIC; }
if (typeof module !== "undefined" && module.exports) { module.exports = DRAGONBANE_MAGIC; }
