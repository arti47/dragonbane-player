# Rules-Accuracy Audit — NotebookLM query transcript (2026-06-29)

> Full list of the NotebookLM prompts used for the §7C audit, for reproducibility.
> **These are a record, not a script.** They are illustrative of the *method* (verify each
> app value against the named source); a future re-verification should query freely and more
> broadly, not just replay these. NotebookLM answers are non-deterministic and the notebook's
> sources can change, so treat any single answer as evidence to corroborate, not gospel.
>
> Notebook: `02d0a44e-6f59-4397-8b2a-ccd040fbc4f7` (tool: `notebooklm-mcp`).
> Sources in the notebook: **Rulebook.pdf** (core), **Bestiary.pdf**, **Book of Magic.pdf**,
> **Solo Adventure.pdf**, **PreGen Characters.pdf**, plus adventures (Path of Glory, Arkand,
> Adventures) and a GM note. Method: pull the app's value from the data/code, ask the notebook
> for the canonical value, compare; a mismatch is a finding.

## Core math & dice (Rulebook)
1. Exact tables: age categories (attribute mods + trained-skill counts, how many from profession), STR/AGL damage bonus table, AGL movement-modifier table, skill base-chance table, base movement per kin.
2. Pushing rules: is the condition freely chosen or tied to the roll's attribute; what if you already have it; which rolls can never be pushed; is there a D6-WP overflow rule at six conditions.
3. Boons/banes (how many dice, keep which, do they stack, one-for-one cancel); Dragon/Demon on the kept die under boon/bane; death rolls (attribute, thresholds, Dragon/Demon counts, damage-while-down).

## Rest & conditions (Rulebook)
4. What round / stretch / shift rest each restore (HP/WP/conditions, exact dice, once-per-shift limits); precisely how a condition penalises (bane on which rolls).

## Combat (Rulebook)
5. Initiative (10 cards 1–10, low acts first); actions + movement per turn; free actions; parry/dodge reactions (consume turn, dodge = Evade, can't do both).
6. Dragon-on-attack options (double dmg / extra attack / ignore-armor); Demon-on-attack fumble (auto-miss, D6 melee/ranged table).
7. Dying: ally HEALING save (roll, HP recovered); rally (ally PERSUASION vs self-WIL-with-bane); exact text of Lightning Fast and Veteran heroic abilities.

## Character creation (Rulebook)
8. Which attribute governs the magic skills (Animism/Elementalism/Mentalism); do professions have a key attribute (name Mage / Fighter).
9. Governing attribute for all 30 skills (20 general + 10 weapon).
10. Each profession's eight skills + starting heroic ability (all 10 professions).
11. Each kin's innate ability/abilities (name, WP cost, effect).
12. Attribute generation (4D6 drop lowest, assign-as-rolled, swap two, free-assign option); mage start (3 tricks + 3 rank-1 spells from school/General + grimoire).
13. Complete list of core heroic abilities with each one's skill requirement and WP cost.

## Magic mechanics (Rulebook)
14. Do magic tricks cost WP (0 or 1); WP per power level (2?); max power level (cap 3?).
15. Dragon-on-cast options (double dmg/range / no WP / cast-another-with-bane); Demon → D20 mishap table, what results 1–8 do.
16. "Power from the Body" — HP→WP conversion (die choice, gated ≤1 WP, no-healing restriction).
17. Metal armor/weapon casting restriction (block vs penalty; which items count; free hand?).

## Encumbrance (Rulebook)
18. Carrying limit (⌈STR/2⌉); worn-armor/helmet + weapons-at-hand exemption (how many at hand); coins per slot; rations grouping; quiver = 1 item; over-encumbered STR-roll-to-move.

## Spell data (Rulebook + Book of Magic)
19. Full General Magic list + ranks (incl. Dispel/Protector/Magic Shield/Transfer/Magic Seal/Charge/Permanence).
20. Full Animism list + ranks; Treat/Heal/Restoration/Banish/Purge dice.
21. Full Elementalism list + ranks; Fireball/Fire Blast/Firestorm damage; elemental summon HP.
22. Full Mentalism list + ranks; anything missing.
23. Sourcing: is Firebird a core or BoM Elementalism spell; is Sleep core Animism (and revised in BoM).
24. The 9 new Book-of-Magic schools + special rules (Harmonism = Performance/CHA bard-only; Dracomancy learn-in-play rank 6 @ 6 WP; Alchemy recipes; Enchanting binds items).

## Equipment (Rulebook)
25. Melee weapon damage + STR requirement for every weapon.
26. Ranged weapons (damage/STR/range), shields (STR/durability), armor ratings, helmet ratings.

## Bestiary — monsters (Bestiary)
27. Core 12 (Demon, Dragon, Ghost, Giant, Giant Spider, Griffon, Harpy, Manticore, Minotaur, Troll, Wight, Vampiric Bats): Ferocity/Movement/Armor/HP.
28. Demon variants (Blood/Chaos/Fire/Guardian/Shadow) + Dragon variants (Hatchling/Young/Ancient): Ferocity/Mov/Armor/HP.
29. Giants (Forest/Mountain/Sea) + Trolls (Cave/Forest/Mountain + generic) + Ancient Dragon: Mov/Armor/HP.
30. Giant Amoeba, Ant People, Basilisk, Beetle Kin, Brook Horse, Calydon, Centaur, Chimera: Mov/Armor/HP.
31. Ghoul, Giant Octopus, Hippogriff, Hydra, Lindworm, Living Dead, Medusa, Mermaid: Mov/Armor/HP.
32. Mummy, Naiad, Pegasus, Roc, Sea Serpent, Spider Kin, Swan Maiden, Titan, Tree Kin: Mov/Armor/HP.

## NPCs, animals, pregens (Bestiary / adventures / PreGen Characters)
33. Five pregens' six attribute scores (Aodhan, Orla, Makander, Krisanna, Bastonn).
34. Common animals (Horse, Wolf, Bear, Boar, Deer, Dog, Cat, Goat, Donkey, Moose, Fox): Movement/HP.
35. Goblin (scout/warrior), Orc (warrior/shaman), Skeleton (warrior/archer): HP/armor/weapon skills.

## Solo (Solo Adventure)
36. Solo heroic abilities (Army of One, Sole Survivor); Fortune Chart oracle (likelihood adjust + Yes/No D6 rows); solo advancement (+5 marks).
37. Inspiration table (D20 × 3 columns; entries 1/10/20); NPC templates (Minion/Boss); whether fail-forward table / NPC Attack Table are official.
