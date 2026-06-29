/*
 * data-monsters.js — Dragonbane Bestiary Library
 * -----------------------------------------------
 * Canonical monster statistics extracted from the Dragonbane Core Rulebook
 * via user source data. True monsters auto-hit in combat and do not roll
 * skill checks. Humanoids/animals count as NPCs and roll standard d20 checks.
 */

const DRAGONBANE_MONSTERS = [
  {
    id: "demon",
    name: "Demon",
    mov: 16,
    armor: 4,
    hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Demonic Dread!", desc: "Fear attack (auto-hit)" },
      { name: "Claw Attack!", desc: "Auto-hit slashing", damage: "2d10" },
      { name: "Curse!", desc: "Random magical effect (auto-hit)" },
      { name: "Unseen Ferocity!", desc: "Auto-hit bludgeoning", damage: "2d8" },
      { name: "Scorpion Sting!", desc: "Auto-hit piercing + poison", damage: "1d12" },
      { name: "Possessed!", desc: "Mind control (auto-hit)" }
    ]
  },
  {
    id: "dragon",
    name: "Dragon",
    mov: 24,
    armor: 6,
    hp: 84,
    ferocity: 3,
    attacks: [
      { name: "Dragon Roar!", desc: "Fear attack (auto-hit)" },
      { name: "Claw Attack!", desc: "Auto-hit slashing", damage: "2d10" },
      { name: "Dragon Wind!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Tail Strike!", desc: "Auto-hit bludgeoning", damage: "2d8" },
      { name: "Dragon Bite!", desc: "Auto-hit slashing", damage: "4d10" },
      { name: "Fire Breath!", desc: "Auto-hit fire damage", damage: "3d10" }
    ]
  },
  {
    id: "ghost",
    name: "Ghost",
    mov: 12,
    armor: 0,
    hp: 27,
    ferocity: 2,
    attacks: [
      { name: "Ghost Strike!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Ghostly Embrace!", desc: "Auto-hit bludgeoning", damage: "3d6" },
      { name: "Cold Strike!", desc: "Auto-hit cold damage", damage: "2d8" }
    ]
  },
  {
    id: "giant",
    name: "Giant",
    mov: 18,
    armor: 0,
    hp: 74,
    ferocity: 1,
    attacks: [
      { name: "Crushing Blow!", desc: "Auto-hit bludgeoning", damage: "4d10" },
      { name: "Roar!", desc: "Fear attack (auto-hit)" },
      { name: "Stomp Attack!", desc: "Auto-hit bludgeoning", damage: "4d6" }
    ]
  },
  {
    id: "giant_spider",
    name: "Giant Spider",
    mov: 24,
    armor: 0,
    hp: 36,
    ferocity: 2,
    attacks: [
      { name: "Mandibles!", desc: "Auto-hit slashing", damage: "2d8" },
      { name: "Tearing Attack!", desc: "Auto-hit piercing", damage: "1d8" },
      { name: "Mesmerizing Eyes!", desc: "Fear attack (auto-hit)" },
      { name: "Poison Sting!", desc: "Auto-hit piercing + poison", damage: "1d10" },
      { name: "Web Attack!", desc: "Entangles victim (auto-hit)" },
      { name: "Ramming Attack!", desc: "Auto-hit bludgeoning", damage: "2d6" }
    ]
  },
  {
    id: "griffon",
    name: "Griffon",
    mov: 30,
    armor: 0,
    hp: 38,
    ferocity: 2,
    attacks: [
      { name: "Snapping Beak!", desc: "Auto-hit piercing", damage: "2d8" },
      { name: "Rearing Strike!", desc: "Auto-hit slashing", damage: "1d8" },
      { name: "Sweeping Claws!", desc: "Auto-hit slashing", damage: "1d8" },
      { name: "Griffon Throw!", desc: "Auto-hit piercing + falling", damage: "2d6" },
      { name: "Whirlwind!", desc: "Auto-hit bludgeoning", damage: "1d6" },
      { name: "High Drop!", desc: "Falling damage (auto-hit)" }
    ]
  },
  {
    id: "harpy",
    name: "Harpy",
    mov: 24,
    armor: 0,
    hp: 12,
    ferocity: 1,
    attacks: [
      { name: "Threatening Cackle!", desc: "Fear attack (auto-hit)" },
      { name: "Coordinated Attack!", desc: "Auto-hit slashing + falling", damage: "2d6" },
      { name: "Death From Above!", desc: "Auto-hit bludgeoning", damage: "1d6" },
      { name: "Eye Gouge!", desc: "Auto-hit piercing", damage: "2d6" },
      { name: "Mass Attack!", desc: "Auto-hit slashing", damage: "1d8" },
      { name: "Excrement Attack!", desc: "Inflicts a condition (auto-hit)" }
    ]
  },
  {
    id: "manticore",
    name: "Manticore",
    mov: 16,
    armor: 0,
    hp: 44,
    ferocity: 2,
    attacks: [
      { name: "Tail Strike!", desc: "Auto-hit piercing + poison", damage: "1d12" },
      { name: "Razor Sharp Bite!", desc: "Auto-hit slashing", damage: "3d8" },
      { name: "Claw Attack!", desc: "Auto-hit slashing", damage: "2d8" },
      { name: "Sweeping Attack!", desc: "Auto-hit slashing", damage: "2d6" },
      { name: "Crushing Charge!", desc: "Auto-hit bludgeoning", damage: "3d6" },
      { name: "Spike Rain!", desc: "Auto-hit piercing + poison", damage: "1d10" }
    ]
  },
  {
    id: "minotaur",
    name: "Minotaur",
    mov: 16,
    armor: 0,
    hp: 32,
    ferocity: 2,
    attacks: [
      { name: "Bull Fist!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Hoof Kick!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Horn Rush!", desc: "Auto-hit piercing", damage: "2d8" },
      { name: "Cleaving Chop!", desc: "Weapon damage + 1d10 (auto-hit)", damage: "1d10" },
      { name: "Sweeping Attack!", desc: "Weapon damage (auto-hit)" },
      { name: "Stomping Attack!", desc: "Auto-hit bludgeoning", damage: "2d10" }
    ]
  },
  {
    id: "troll",
    name: "Troll",
    mov: 10,
    armor: 0,
    hp: 38,
    ferocity: 2,
    attacks: [
      { name: "Troll Vomit!", desc: "Inflicts a condition (auto-hit)" },
      { name: "Rending Attack!", desc: "Auto-hit slashing + disease", damage: "1d10" },
      { name: "Repulsive Bite!", desc: "Auto-hit piercing", damage: "2d8" },
      { name: "Troll Throw!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Sweeping Blow!", desc: "Auto-hit bludgeoning", damage: "2d6" },
      { name: "Mangling Smash!", desc: "Auto-hit bludgeoning", damage: "2d8" }
    ]
  },
  {
    id: "wight",
    name: "Wight",
    mov: 10,
    armor: 8,
    hp: 38,
    ferocity: 2,
    attacks: [
      { name: "Unholy Roar!", desc: "Fear attack (auto-hit)" },
      { name: "Dreadful Gaze!", desc: "Fear attack (auto-hit)" },
      { name: "Hand of the Dead!", desc: "Auto-hit damage", damage: "2d4" },
      { name: "Sweeping Attack!", desc: "Equipped weapon damage (auto-hit)" },
      { name: "Crippling Cold!", desc: "Auto-hit cold damage", damage: "1d6" },
      { name: "Power Attack!", desc: "Equipped weapon damage × 2 (auto-hit)" }
    ]
  },
  {
    id: "vampiric_bats",
    name: "Vampiric Bats (Swarm)",
    mov: 24,
    armor: 0,
    hp: 18,
    ferocity: 2,
    attacks: [
      { name: "Swirling Horror!", desc: "Fear attack (auto-hit)" },
      { name: "Collective Attack!", desc: "Auto-hit slashing", damage: "2d6" },
      { name: "Mass Attack!", desc: "Auto-hit slashing", damage: "1d8" }
    ]
  },
  {
    id: "robber_knight",
    name: "Rothgar Wolfsbane (The Robber Knight)",
    mov: 10,
    armor: 8,
    hp: 38,
    ferocity: 2,
    attacks: [
      { name: "Unholy Roar!", desc: "Fear attack within 10m (auto-hit)" },
      { name: "Horrifying Threats!", desc: "Victim Scared, fear attack, WIL bane (auto-hit)" },
      { name: "Hand of the Dead!", desc: "Auto-hit bludgeoning + thrown prone", damage: "2d4" },
      { name: "Sweeping Attack!", desc: "Morningstar sweep within 2m (can be parried)", damage: "2d8" },
      { name: "Crippling Cold!", desc: "Cold condition, Evade roll required next turn (ignoring armor)", damage: "1d6" },
      { name: "Power Attack!", desc: "Massive morningstar strike + knockdown (can be parried)", damage: "4d8" }
    ]
  },
  {
    id: "blood_demon", name: "Blood Demon (Onaqui)", mov: 14, armor: 2, hp: 48,
    ferocity: 2,
    attacks: [
      { name: "Bloodthirst!", desc: "Piercing damage ignoring armor, D6 WP loss, Dazed", damage: "1d6" },
      { name: "Terrifying Roar!", desc: "Fear attack within 20m" },
      { name: "Venomous Claws!", desc: "Slashing damage + knockdown + paralyzing poison (potency 12)", damage: "2d6" },
      { name: "Deafening Scream!", desc: "10m cone damage ignoring armor + Dazed", damage: "2d8" },
      { name: "Long Drop!", desc: "Grabs victim and leaps D6+3 meters, drops next turn" },
      { name: "Boiling Blood!", desc: "Damage ignoring armor + fear attack with WIL bane", damage: "2d10" }
    ]
  },
  {
    id: "chaos_demon", name: "Chaos Demon", mov: 12, armor: 2, hp: 36,
    ferocity: 2,
    attacks: [
      { name: "Runic Sword!", desc: "Slashing damage + D6 WP drain", damage: "2d8" },
      { name: "Horn Attack!", desc: "Piercing damage + victim loses turn", damage: "2d10" },
      { name: "Threatening Hiss!", desc: "Fear attack within 10m" },
      { name: "Scorpion Sting!", desc: "Piercing damage + paralyzing poison (potency 15)", damage: "1d12" },
      { name: "Unseen Force!", desc: "Pushes 2D6m away + equal bludgeoning + prone", damage: "2d6" },
      { name: "Acid Spit!", desc: "Acid damage + D6 next round unless wiped off", damage: "2d6" }
    ]
  },
  {
    id: "fire_demon", name: "Fire Demon", mov: 18, armor: 0, hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Sweeping Staff!", desc: "Bludgeoning + D6 fire damage ignoring armor + knockdown", damage: "2d6" },
      { name: "Imps!", desc: "Summons burning imps, everyone within 10m becomes Angry" },
      { name: "Flaming Flail!", desc: "Bludgeoning + D8 fire ignoring armor + Dazed", damage: "2d8" },
      { name: "Fire Whirl!", desc: "Fire whirl within 4m ignoring armor + knockdown", damage: "2d8" },
      { name: "Crushing Kick!", desc: "Flings back 2D6m + equal bludgeoning + knockdown", damage: "2d6" },
      { name: "Fire Breath!", desc: "10m cone of fire ignoring armor", damage: "2d10" }
    ]
  },
  {
    id: "guardian_demon", name: "Guardian Demon", mov: 14, armor: 2, hp: 28,
    ferocity: 1,
    attacks: [
      { name: "Spear Sweep!", desc: "Leg sweep knockdown + Dazed" },
      { name: "Shield Bash!", desc: "Spiked shield piercing + knockdown", damage: "2d8" },
      { name: "Paralyzing Spear Thrust!", desc: "Piercing + paralyzing poison (potency 12)", damage: "2d10" },
      { name: "Impaling Horns!", desc: "Impales opponent", damage: "2d10" },
      { name: "Entangling Rope!", desc: "Weighted rope trips victim, AGL roll with bane to free" },
      { name: "Teleportation!", desc: "Teleports up to 20m without free attack" }
    ]
  },
  {
    id: "shadow_demon", name: "Shadow Demon", mov: 12, armor: 0, hp: 54,
    ferocity: 2,
    attacks: [
      { name: "Anxiety Attack!", desc: "Existential dread, Scared & Disheartened + fear attack" },
      { name: "Psychic Bite!", desc: "Drains 2D6 WP + blinded (roll D4 each shift)" },
      { name: "Dark Embrace!", desc: "Plunges into darkness, fear attack + Cold" },
      { name: "Doubt!", desc: "Derogatory remarks, opponents within 10m Disheartened" },
      { name: "Command!", desc: "WIL roll with bane or perform action chosen by GM" }
    ]
  },
  {
    id: "hatchling_dragon", name: "Hatchling Dragon", mov: 16, armor: 2, hp: 36,
    ferocity: 1,
    attacks: [
      { name: "Dragon Screech!", desc: "Everyone within 10m Scared / fear attack" },
      { name: "Claw Attack!", desc: "Slashing claws", damage: "1d8" },
      { name: "Ramming Attack!", desc: "Knocked back D6m + equal bludgeoning damage", damage: "1d6" },
      { name: "Tail Strike!", desc: "Slashing within 2m + knockdown", damage: "1d6" },
      { name: "Dragon Bite!", desc: "Big bite", damage: "2d6" },
      { name: "Toxic Smoke!", desc: "Poisonous smoke within 6m (potency 12)" }
    ]
  },
  {
    id: "young_dragon", name: "Young Dragon", mov: 24, armor: 4, hp: 60,
    ferocity: 2,
    attacks: [
      { name: "Dragon Roar!", desc: "Fear attack within 10m" },
      { name: "Claw Attack!", desc: "Slashing claws against two opponents", damage: "2d6" },
      { name: "Gust of Wind!", desc: "Flaps wings, hurled D8m + bludgeoning + prone", damage: "1d8" },
      { name: "Tail Strike!", desc: "Spiky tail within 4m + knockdown", damage: "2d6" },
      { name: "Dragon Bite!", desc: "Terrifying bite", damage: "3d8" },
      { name: "Fire Breath!", desc: "6m cone of fire ignoring armor", damage: "2d10" }
    ]
  },
  {
    id: "ancient_dragon", name: "Ancient Dragon", mov: 20, armor: 8, hp: 108,
    ferocity: 2,
    attacks: [
      { name: "Dragon Roar!", desc: "Everyone within 30m Scared + fear attack" },
      { name: "Claw Attack!", desc: "Slashing claws against two opponents", damage: "3d10" },
      { name: "Dragon Storm!", desc: "Storm within 20m, hurled 3D6m + bludgeoning + prone", damage: "3d6" },
      { name: "Crushing Tail!", desc: "Spiked tail within 8m + knockdown", damage: "2d10" },
      { name: "Dragon Bite!", desc: "Massive bite", damage: "5d10" },
      { name: "Inferno!", desc: "20m blazing fire cone ignoring armor", damage: "4d10" }
    ]
  },
  {
    id: "forest_giant", name: "Forest Giant", mov: 14, armor: 0, hp: 56,
    ferocity: 1,
    attacks: [
      { name: "Gnawing Friends!", desc: "Small animals swarm within 10m + knockdown", damage: "2d6" },
      { name: "Crushing Club!", desc: "Wooden club blow + knockdown", damage: "4d8" },
      { name: "Body Tackle!", desc: "Tackles opponent + knockdown + Dazed", damage: "4d6" },
      { name: "Bear Hug!", desc: "Hug ignoring armor + loses turn", damage: "3d6" },
      { name: "Forceful Throw!", desc: "Tosses victim 2D8m + bludgeoning + prone", damage: "2d8" },
      { name: "Snaring Roots!", desc: "Roots within 10m ignoring armor + immobilized", damage: "1d6" }
    ]
  },
  {
    id: "mountain_giant", name: "Mountain Giant", mov: 16, armor: 0, hp: 78,
    ferocity: 1,
    attacks: [
      { name: "Crushing Blow!", desc: "Fist or club swing + knockdown", damage: "4d10" },
      { name: "Where Did You Go?", desc: "Party must make SNEAKING roll" },
      { name: "Stomping Attack!", desc: "Stomps feet within 2m + knockdown", damage: "3d6" },
      { name: "Sweeping Blow!", desc: "Club sweep within 6m + knockdown", damage: "2d10" },
      { name: "Enough is Enough!", desc: "Stuffs victim into sack + immobilized", damage: "2d6" },
      { name: "Stone Throw!", desc: "Hurls large rock within 10m + knockdown", damage: "3d10" }
    ]
  },
  {
    id: "sea_giant", name: "Sea Giant", mov: 20, armor: 0, hp: 82,
    ferocity: 1,
    attacks: [
      { name: "Thunder and Lightning!", desc: "Lightning bolt ignoring metal armor + thunderclap Dazed", damage: "2d10" },
      { name: "Rock Throw!", desc: "Hurls rock within 20m + wave knockdown", damage: "3d10" },
      { name: "Skewering Spear!", desc: "Hurls mast spear + knockdown", damage: "4d10" },
      { name: "Whirling Flurry!", desc: "Rains blows within 4m", damage: "3d6" },
      { name: "Fishing Fortune!", desc: "Casts net over up to 4 opponents + immobilized" },
      { name: "Wave Attack!", desc: "Whips up waves pushing 2D10m away" }
    ]
  },
  {
    id: "cave_troll", name: "Cave Troll", mov: 12, armor: 2, hp: 42,
    ferocity: 2,
    attacks: [
      { name: "Rolling Attack!", desc: "Rolls into boulder mass + knockdown", damage: "2d8" },
      { name: "Cave Bats!", desc: "Disturbs bat flock for D3 rounds" },
      { name: "Head to Head!", desc: "Headbutt + Dazed (only helmet reduces)", damage: "2d6" },
      { name: "Gobble!", desc: "Bites enemy + stuck in maw", damage: "2d8" },
      { name: "Golden Spit!", desc: "Spits gold coin + condition", damage: "1d10" },
      { name: "Troll Throw!", desc: "Tosses victim 2D8m + prone", damage: "2d8" }
    ]
  },
  {
    id: "forest_troll", name: "Forest Troll", mov: 12, armor: 0, hp: 44,
    ferocity: 2,
    attacks: [
      { name: "Uprooting!", desc: "Rips tree and hits two victims + knockdown", damage: "3d6" },
      { name: "Troll Blade!", desc: "Stone knife ignoring armor", damage: "2d8" },
      { name: "Rotten Breath!", desc: "Foul breath within 4m, Sickly + CON bane" },
      { name: "Sinkhole!", desc: "Opens sinkhole within 10m" },
      { name: "Stomping Attack!", desc: "Stomps opponents within 2m + knockdown", damage: "2d6" },
      { name: "Bludgeoning Club!", desc: "Massive club swing + Dazed", damage: "4d6" }
    ]
  },
  {
    id: "mountain_troll", name: "Mountain Troll", mov: 10, armor: 0, hp: 42,
    ferocity: 1,
    attacks: [
      { name: "A Hundred Years of Solitude!", desc: "Opponent within 10m Disheartened" },
      { name: "Horn Thrust!", desc: "Thrusts horns + knockdown", damage: "2d10" },
      { name: "Entangling Roots!", desc: "Snares victim within 10m + immobilized" },
      { name: "Memory Lapse!", desc: "Rune in air within 20m, forget turn" },
      { name: "Terrifying Visions!", desc: "Mushroom powder fear attack" },
      { name: "Sweeping Blow!", desc: "Staff sweep within 2m + knockdown", damage: "2d6" }
    ]
  },
  {
    id: "giant_amoeba", name: "Giant Amoeba", mov: 8, armor: 0, hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Tentacle Attack!", desc: "Strikes within 2m + poison risk", damage: "1d10" },
      { name: "Faces of the Dead!", desc: "Fear attack within 10m" },
      { name: "Theft!", desc: "Snatches weapon and absorbs it" },
      { name: "Slime Ball!", desc: "Spits slime + poison risk", damage: "1d8" },
      { name: "Poison Cloud!", desc: "Stinking cloud within 10m, Dazed + poison (potency 12)" },
      { name: "Absorption!", desc: "Envelops victim ignoring armor + poison", damage: "1d6" }
    ]
  },
  {
    id: "ant_people_mon", name: "Ant People (Swarm)", mov: 14, armor: 2, hp: 8,
    ferocity: 1,
    attacks: [
      { name: "Painful Bite!", desc: "Bite + paralyzing poison (potency 9)", damage: "1d8" },
      { name: "Sword of Bronze!", desc: "Bronze sword", damage: "1d10" },
      { name: "Wrestling Attack!", desc: "Wrestling repeatedly on victim turn", damage: "1d8" },
      { name: "Electrocution!", desc: "Shocks ignoring armor + drops items", damage: "1d8" },
      { name: "Confusing Dance!", desc: "WIL roll with bane or Dazed" },
      { name: "Healing Kiss!", desc: "Cleans wounds restoring HP to ally", damage: "1d8" }
    ]
  },
  {
    id: "basilisk", name: "Basilisk", mov: 16, armor: 6, hp: 38,
    ferocity: 2,
    attacks: [
      { name: "Slash Attack!", desc: "Slashing claws against two opponents", damage: "2d8" },
      { name: "Peck!", desc: "Piercing beak", damage: "3d8" },
      { name: "Cock-a-Doodle-Doo!", desc: "CON roll or fall prone & Dazed" },
      { name: "Whip Attack!", desc: "Tail sweep within 4m + knockdown", damage: "1d10" },
      { name: "Poison Cloud!", desc: "Lethal poison within 10m (potency 15)" },
      { name: "Petrifying Gaze!", desc: "WIL roll or turn to stone" }
    ]
  },
  {
    id: "beetle_kin_mon", name: "Beetle Kin", mov: 12, armor: 6, hp: 18,
    ferocity: 1,
    attacks: [
      { name: "Clobbering Blow!", desc: "Bludgeoning blow", damage: "1d10" },
      { name: "Double Strike!", desc: "Two claws slashing", damage: "1d8" },
      { name: "Bite!", desc: "Bite + paralyzing poison (potency 9)", damage: "2d6" },
      { name: "Surprise Kick!", desc: "Pushes D6m + equal bludgeoning + prone", damage: "1d6" },
      { name: "Acid Spit!", desc: "Acid ignoring armor", damage: "1d8" },
      { name: "Shattering Shriek!", desc: "Everyone within 10m Dazed + fear attack" }
    ]
  },
  {
    id: "brook_horse", name: "Brook Horse", mov: 24, armor: 0, hp: 34,
    ferocity: 2,
    attacks: [
      { name: "Horse Kick!", desc: "Thrown 2D8m + equal bludgeoning + prone", damage: "2d8" },
      { name: "Ravenous Bite!", desc: "Slashing bite", damage: "2d10" },
      { name: "Crushing Hooves!", desc: "Hooves against two opponents + fear attack", damage: "2d6" },
      { name: "Hateful Gaze!", desc: "Fear attack with bane" },
      { name: "Drowning!", desc: "Pulls underwater to drown" },
      { name: "Wild Ride!", desc: "Rides off at breakneck speed ignoring armor", damage: "1d6" }
    ]
  },
  {
    id: "calydon", name: "Calydon", mov: 14, armor: 0, hp: 52,
    ferocity: 2,
    attacks: [
      { name: "Charge!", desc: "Thrown 2D6m + bludgeoning + knockdown", damage: "2d6" },
      { name: "Skewering Tusks!", desc: "Piercing tusks", damage: "1d12" },
      { name: "Crushing Hooves!", desc: "Bludgeoning hooves + knockdown", damage: "2d8" },
      { name: "Hurling Attack!", desc: "Hurls 2D4m ignoring armor + Dazed", damage: "2d4" },
      { name: "Hateful Grunt!", desc: "Fear attack within 10m" },
      { name: "Breath of Fire!", desc: "6m fire cone ignoring armor", damage: "2d10" }
    ]
  },
  {
    id: "centaur_mon", name: "Centaur", mov: 20, armor: 0, hp: 28,
    ferocity: 2,
    attacks: [
      { name: "Horse Kick!", desc: "Thrown 2D6m + equal bludgeoning + prone", damage: "2d6" },
      { name: "Spear Thrust!", desc: "Piercing spear", damage: "2d10" },
      { name: "Crushing Hooves!", desc: "Hooves against two opponents", damage: "2d6" },
      { name: "Quick Shot!", desc: "Piercing arrow", damage: "1d12" },
      { name: "Ramming Attack!", desc: "Bludgeoning ram + knockdown", damage: "2d10" },
      { name: "Mocking Laughter!", desc: "WIL roll or become Angry" }
    ]
  },
  {
    id: "chimera", name: "Chimera", mov: 14, armor: 0, hp: 42,
    ferocity: 3,
    attacks: [
      { name: "Claw Attack!", desc: "Slashing claws + knockdown", damage: "2d8" },
      { name: "Lion Jaws!", desc: "Slashing jaws", damage: "2d10" },
      { name: "Cacophony!", desc: "Fear attack within 10m" }
    ]
  },
  {
    id: "ghoul", name: "Ghoul", mov: 10, armor: 0, hp: 16,
    ferocity: 1,
    attacks: [
      { name: "Diseased Bite!", desc: "Piercing bite + disease (virulence 12)", damage: "2d8" },
      { name: "Tearing, Biting, Striking!", desc: "Slashing within 2m + disease", damage: "1d8" },
      { name: "Scream of the Dead!", desc: "Fear attack within 10m, attracts ghoul" }
    ]
  },
  {
    id: "giant_octopus", name: "Giant Octopus", mov: 16, armor: 3, hp: 32,
    ferocity: 4,
    attacks: [
      { name: "Disarm!", desc: "Snatches weapon" },
      { name: "Crushing Embrace!", desc: "Repeated bludgeoning per turn", damage: "1d10" },
      { name: "Tentacle Slam!", desc: "Slam + knockdown", damage: "2d6" },
      { name: "Drowning!", desc: "Pulls underwater to drown" },
      { name: "Devour!", desc: "Swallows whole (slashing + ongoing)", damage: "2d6" }
    ]
  },
  {
    id: "hippogriff", name: "Hippogriff", mov: 24, armor: 0, hp: 36,
    ferocity: 2,
    attacks: [
      { name: "Horse Kick!", desc: "Bludgeoning kick + knockdown", damage: "2d6" },
      { name: "Razor Sharp Beak!", desc: "Slashing beak", damage: "2d8" },
      { name: "Rearing Slash!", desc: "Two claw swipes", damage: "1d8" },
      { name: "Wingbeat!", desc: "Bludgeoning within 2m + knockdown", damage: "1d6" },
      { name: "Hunting Call!", desc: "Fear attack within 20m" },
      { name: "Long Drop!", desc: "Lifts D6+6m and drops next turn" }
    ]
  },
  {
    id: "hydra", name: "Hydra", mov: 8, armor: 3, hp: 40,
    ferocity: 1,
    attacks: [
      { name: "Swift Bite!", desc: "Slashing bite + lethal poison (potency 12)", damage: "2d6" },
      { name: "Poison Spit!", desc: "Spit + lethal poison", damage: "1d8" },
      { name: "Rending Claws!", desc: "Slashing claws", damage: "2d6" }
    ]
  },
  {
    id: "lindworm", name: "Lindworm", mov: 18, armor: 6, hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Hissing Roar!", desc: "Fear attack within 10m" },
      { name: "Claw Attack!", desc: "Slashing claws against two opponents", damage: "2d8" },
      { name: "Dorsal Spikes!", desc: "Slashing within 6m + knockdown", damage: "2d4" },
      { name: "Deadly Embrace!", desc: "Repeated bludgeoning per turn", damage: "2d8" },
      { name: "Ravenous Bite!", desc: "Slashing bite", damage: "3d8" },
      { name: "Devouring Attack!", desc: "Swallows whole + ongoing ignoring armor", damage: "2d6" }
    ]
  },
  {
    id: "living_dead", name: "Living Dead", mov: 6, armor: 0, hp: 9,
    ferocity: 1,
    attacks: [
      { name: "Headbutt!", desc: "Bludgeoning headbutt", damage: "1d8" },
      { name: "Clawing Attack!", desc: "Slashing claws + undead disease", damage: "1d10" },
      { name: "Diseased Bite!", desc: "Piercing bite + Scared + undead disease", damage: "1d8" },
      { name: "Vile Vomit!", desc: "Everyone within 10m Sickly" },
      { name: "Undead Embrace!", desc: "Bludgeoning + immobilizes + bite next turn", damage: "1d8" },
      { name: "Overpowering Hunger!", desc: "Slashing + knockdown + lose turn", damage: "2d8" }
    ]
  },
  {
    id: "medusa", name: "Medusa", mov: 12, armor: 0, hp: 36,
    ferocity: 2,
    attacks: [
      { name: "Snakebite!", desc: "Piercing within 2m + lethal poison (potency 12)", damage: "1d8" },
      { name: "Snake Tongues!", desc: "Fear attack within 4m" },
      { name: "Fists of Bronze!", desc: "Bludgeoning fists", damage: "2d8" },
      { name: "Up in the Air!", desc: "Lifts D6+3m in air and drops" },
      { name: "Gust of Wind!", desc: "10m cone pushes 2D4m + bludgeoning + prone", damage: "2d4" },
      { name: "Petrifying Gaze!", desc: "WIL roll with bane or petrification" }
    ]
  },
  {
    id: "mermaid_mon", name: "Mermaid", mov: 14, armor: 0, hp: 16,
    ferocity: 1,
    attacks: [
      { name: "Harpoon Throw!", desc: "Piercing harpoon up to 10m", damage: "2d6" },
      { name: "Spear Thrust!", desc: "Piercing spear + knockdown", damage: "2d8" },
      { name: "Fishing Fortune!", desc: "Casts net within 6m + immobilized" },
      { name: "Drowning Attack!", desc: "Pulls underwater to drown" },
      { name: "Wave Attack!", desc: "10m cone pushes 2D6m + bludgeoning", damage: "2d6" },
      { name: "Whirlwind!", desc: "Throws within 4m + bludgeoning", damage: "2d4" }
    ]
  },
  {
    id: "mummy", name: "Mummy", mov: 6, armor: 0, hp: 42,
    ferocity: 2,
    attacks: [
      { name: "Curse!", desc: "Fear attack with WIL bane (10m)" },
      { name: "Double Strike!", desc: "Bludgeoning against two opponents + knockdown", damage: "2d6" },
      { name: "Swarm of Insects!", desc: "Piercing ignoring armor within 4m + lose turn", damage: "1d8" },
      { name: "Deadly Throw!", desc: "Throws 2D6m + bludgeoning + prone", damage: "2d6" },
      { name: "Strangulation!", desc: "Bludgeoning ignoring armor + ongoing", damage: "2d6" },
      { name: "Heartbreak!", desc: "Damage ignoring armor + fear attack + lose turn", damage: "1d10" }
    ]
  },
  {
    id: "naiad", name: "Naiad", mov: 12, armor: 0, hp: 24,
    ferocity: 2,
    attacks: [
      { name: "Strangulation!", desc: "Bludgeoning + ongoing per turn + immobilized", damage: "1d10" },
      { name: "Broken Heart!", desc: "WIL roll with bane to resist fear" },
      { name: "Sharp Nails!", desc: "Slashing nails + blindness for D3 rounds", damage: "1d8" },
      { name: "Drowning Attack!", desc: "Pulls underwater to drown" },
      { name: "Enchanting Song!", desc: "WIL roll or perform action chosen by GM" },
      { name: "Tidal Wave!", desc: "10m cone pushes 2D6m + bludgeoning", damage: "2d6" }
    ]
  },
  {
    id: "pegasus", name: "Pegasus", mov: 30, armor: 0, hp: 32,
    ferocity: 2,
    attacks: [
      { name: "Horse Kick!", desc: "Throws 2D6m + bludgeoning + prone", damage: "2d6" },
      { name: "Horse Bite!", desc: "Bludgeoning bite + Angry", damage: "1d8" },
      { name: "Crushing Hooves!", desc: "Bludgeoning against two opponents", damage: "2d6" },
      { name: "Whirlwind!", desc: "Blows enemies within 6m + bludgeoning + prone", damage: "1d6" },
      { name: "Nosedive!", desc: "Line attack fear attack" },
      { name: "Mind Strike!", desc: "Mental fear attack with WIL bane" }
    ]
  },
  {
    id: "roc", name: "Roc", mov: 28, armor: 0, hp: 80,
    ferocity: 2,
    attacks: [
      { name: "Claw Attack!", desc: "Slashing claws against two opponents", damage: "2d10" },
      { name: "Pecking Attack!", desc: "Slashing beak", damage: "3d10" },
      { name: "Piercing Shriek!", desc: "Dazes opponents within 20m + fear attack" },
      { name: "Wing Attack!", desc: "Bludgeoning within 4m + knockdown", damage: "2d8" },
      { name: "Gust of Wind!", desc: "10m cone throws 2D6m + bludgeoning + prone", damage: "2d6" },
      { name: "High Drop!", desc: "Lifts D6+6m and drops + slashing + fall", damage: "1d8" }
    ]
  },
  {
    id: "sea_serpent", name: "Sea Serpent (Large)", mov: 18, armor: 3, hp: 56,
    ferocity: 2,
    attacks: [
      { name: "Tail Swipe!", desc: "Bludgeoning tail + knockdown", damage: "2d8" },
      { name: "Devour!", desc: "Swallows strongest opponent + ongoing ignoring armor", damage: "2d6" },
      { name: "Ferocious Bite!", desc: "Slashing bite", damage: "2d8" },
      { name: "Drowning!", desc: "Pulls underwater" },
      { name: "Crushing Blow!", desc: "Drops on two opponents + bludgeoning + knockdown", damage: "2d6" },
      { name: "Constriction!", desc: "Ongoing bludgeoning + immobilized", damage: "2d6" }
    ]
  },
  {
    id: "spider_kin_mon", name: "Spider Kin", mov: 16, armor: 0, hp: 28,
    ferocity: 2,
    attacks: [
      { name: "Poison Bite!", desc: "Bite + paralyzing poison (potency 12)", damage: "1d10" },
      { name: "Too Many Eyes!", desc: "Fear attack within 10m" },
      { name: "Ominous Vision!", desc: "Fear attack with bane within 10m" },
      { name: "Poison Sting!", desc: "Piercing sting + poison (potency 12)", damage: "1d8" },
      { name: "Sticky Web!", desc: "Spits web + immobilized" },
      { name: "Hypnotizing Eyes!", desc: "WIL roll or perform action chosen by GM" }
    ]
  },
  {
    id: "swan_maiden", name: "Swan Maiden", mov: 14, armor: 0, hp: 16,
    ferocity: 1,
    attacks: [
      { name: "Wingbeat!", desc: "Throws within 4m + bludgeoning + prone", damage: "1d8" },
      { name: "Pecking Attack!", desc: "Slashing beak + fear attack", damage: "2d8" },
      { name: "Swan Song!", desc: "Everyone within 10m Disheartened" },
      { name: "Flock of Swans!", desc: "Slashing within 10m + fear attack", damage: "2d4" },
      { name: "Pleading Gaze!", desc: "WIL roll or perform action chosen by GM" },
      { name: "Gift of the Gods!", desc: "Curse fear attack with bane" }
    ]
  },
  {
    id: "titan", name: "Titan", mov: 14, armor: 6, hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Hammer Blow!", desc: "Three blows bludgeoning + knockdown", damage: "1d10" },
      { name: "Battering Ram!", desc: "Plows movement range + bludgeoning + prone + Dazed", damage: "2d10" },
      { name: "Out of the Way!", desc: "Throws 2D6m + bludgeoning + prone", damage: "2d6" },
      { name: "Ferocious Shake!", desc: "Lifts and shakes ignoring armor + lose turn", damage: "3d6" },
      { name: "Deafening Roar!", desc: "Fear attack with bane within 10m" },
      { name: "Earthquake!", desc: "Damage ignoring armor within 10m + AGL roll or prone", damage: "1d6" }
    ]
  },
  {
    id: "tree_kin", name: "Tree Kin", mov: 8, armor: 6, hp: 64,
    ferocity: 2,
    attacks: [
      { name: "Command!", desc: "Fear attack within 10m" },
      { name: "Death From Above!", desc: "Bird swarm within 10m + lose turn", damage: "1d8" },
      { name: "Spear Thrust!", desc: "Piercing spear", damage: "2d10" },
      { name: "Crushing Blow!", desc: "Bludgeoning blow + knockdown", damage: "2d10" },
      { name: "Up, Up and Away!", desc: "Throws 2D8m + bludgeoning + prone", damage: "2d8" },
      { name: "Hang Them High!", desc: "Strangles + ongoing bludgeoning per turn", damage: "2d6" }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DRAGONBANE_MONSTERS };
}
