# Dungeon Party Builder: Design & Build Plan

> **Status:** agreed design, 2026-11-20. Built so far: M0 (project setup) and M1 (simulation core).
> Items marked **✅ DECIDED** were open questions; Mike accepted the recommended option for each.
> A summary of every decision is at the end.

---

## 1. The pitch

You run the guild hall in a town built around the edge of a pit. The town started as a mining camp, and the miners dug too deep: they broke into a dungeon that was already full. Now the pit is the way in.

You recruit heroes, kit them out, and send a party down. Once they leave town **you can only watch**. If they come back, their loot and experience let you build a better party. If they don't, you can send another party down after them to recover whoever and whatever is left.

The dungeon is getting worse. The deepest level keeps breeding, and the overflow is shoved upward, floor by floor, until monsters with nowhere left to go climb out of the pit. Your job is to keep the population down by killing everything you can.

## 2. Core loop

```
 ┌──────────── TOWN ─────────────┐        ┌──────── DUNGEON ────────┐
 │ recruit / dismiss heroes      │        │ auto-simulated           │
 │ buy, sell, equip gear         │ launch │ floor → rooms → events   │
 │ pick party + standing orders  │ ─────► │ (fights, traps, loot)    │
 │ spend level-ups               │        │ you watch the log/view   │
 │ build / upgrade buildings     │        │                          │
 └───────────────▲───────────────┘        └────────────┬────────────┘
                 │   return: loot, XP, morale changes  │
                 └──────────── or wipe → rescue run ◄──┘
                       dungeon clock advances
```

**Standing orders** are the player's only influence after launch, so they matter. They are set in town before departure, for example:

- Target: "clear floor 2", "push to floor 4", "recover the lost party on floor 3".
- Retreat rule: "turn back when any hero is below 30% HP" / "when potions run out" / "never".
- Loot rule: "grab everything" vs "only what the appraiser rates highly".

Heroes don't always obey. Low morale or a cowardly/greedy motivation can override orders (see §6). That gives the watching phase some tension.

## 3. Difficulty: depth and time

Every floor has a **threat level**. Two things push it up: how deep the floor is, and how long the dungeon has been left to breed.

### Comparing the curves

| Model | Depth | Time | Feels like | Risk |
|---|---|---|---|---|
| **Linear** both | +X per floor | +Y per day | Predictable, gear outpaces it | Gets boring; deep floors don't feel scary |
| **Exponential** both | ×k per floor | ×k per day | Tense, "roguelike run" | Death spiral: eventually unwinnable no matter what you do |
| **Hybrid (chosen)** | ×k per floor | Driven by population sim, pushed back by kills | Clear depth tiers, time pressure you can fight | Needs tuning of the population numbers |

**Chosen:** make depth **exponential** and time **not a fixed formula at all**. Instead, time difficulty comes from the monster population simulation in §4. The more you kill, the slower it rises; ignore a floor and it climbs fast. That ties the lore directly to the mechanic, and the player always has a lever to pull.

Starting numbers to tune from (power ≈ total monster strength in a typical encounter):

| Floor | Base power (×1.3 per floor) |
|---|---|
| 1 | 10 |
| 2 | 13 |
| 3 | 17 |
| 4 | 22 |
| 5 | 29 |
| 10 | 106 |

A fresh party of three should handle floor 1 comfortably, floor 2 with some risk, and get badly hurt on floor 3.

✅ **DECIDED 1: difficulty curve.** Decision: exponential depth + population-driven time (above). Alternative: a plain formula like `threat = base(floor) + days × rate`, which is simpler to build but ignores what the player does.

✅ **DECIDED 2: what is a "day"?** Decision: an in-game day, advanced by expeditions (a trip to floor 3 might take 3 days, plus 1 rest day in town). Alternative: real-time clock (idle-game style). I'd avoid real time, because it punishes people for not playing.

## 4. The push-up mechanic (lore as a system)

Each floor tracks a **population** and a **capacity**, plus a **level band** (the weakest and strongest monster level living there).

Each day:

1. The bottom floor spawns new monsters at its level band. Its spawn rate creeps up slowly over time (this is the source of all escalation).
2. Any floor over capacity **evicts its weakest monsters** to the floor above.
3. Evicted monsters arrive at the upper floor's *strong* end. As they keep arriving, the upper floor's level band rises, and its own weakest get evicted upward in turn.
4. Floor 1 overflow **climbs out of the pit** toward the town (see Decision 3 and the defences in §8).

The result is exactly the lore: over time, the *weakest* thing on floor 1 is no longer a level-1 slime, because the "weak" rejects from below are stronger than they used to be. Killing monsters on a floor lowers its population, so the overflow stops and that floor's band stabilises.

A nice side effect: you can show the player a simple **dungeon pressure** map in town (per floor: population bar + level band) so they can see where the problem is building and choose targets.

✅ **DECIDED 3: what happens when floor 1 overflows?** Options:
- (a) **Town raids** (chosen): monsters climb out of the pit and attack the town, damaging buildings or injuring resting heroes. Bad, but not game over. Defences around the pit (§8) soften them.
- (b) **Game over** when overflow passes a limit. Gives a clear loss condition, roguelike style.
- (c) Nothing; floor 1 just gets harder.

## 5. Heroes and stats

### Primary stats (7)

Range 1–20, with 8–10 being an average person. Recruits start around 6–14 depending on class.

| Stat | What it's for |
|---|---|
| **STR** Strength | Melee damage, carry capacity, heavy armour |
| **DEX** Dexterity | Accuracy, evasion, initiative, locks and traps |
| **END** Endurance | HP, stamina, resisting poison and disease |
| **PER** Perception | Spotting ambushes and traps, ranged accuracy, appraisal |
| **INT** Intelligence | Spell power, mana, lore, medicine |
| **WIL** Willpower | Magic resist, fear resist, morale stability, mana |
| **CHA** Charisma | Party morale, leadership, town prices, recruit quality |

### Derived (secondary) stats

Starting formulas. These will change with balancing, but the shape is the point:

| Secondary | Formula |
|---|---|
| Max HP | 10 + END×3 + STR |
| Mana | INT×2 + WIL |
| Melee attack | STR + weapon bonus |
| Accuracy | DEX + PER/2 + weapon bonus |
| Evasion | DEX + PER/2 − armour penalty |
| Initiative | DEX + PER |
| Spell power | INT + focus bonus |
| Resist (magic/fear) | WIL |
| Carry slots | 4 + (STR + END)/5 |
| Morale stability | WIL (+ best party CHA as leader bonus) |

### Non-combat skills

Skills are a 0–100 value per hero, seeded from two primary stats and raised by use and perks. Party-wide checks use the **best** hero's value (one good scout covers the party), which makes picking party roles meaningful.

| Skill | Based on | Effect |
|---|---|---|
| **Appraisal** | PER + INT | Know loot's real value; when carry slots are full, keep the best items instead of random ones; spot cursed items |
| **Scouting** | PER + DEX | Detect ambushes and traps before they spring; sometimes avoid a fight or strike first |
| **Medicine** | INT + WIL | Heal between fights; stabilise downed heroes so they survive to be rescued |
| Trapwork | DEX + PER | Disarm traps, open locked chests *(later)* |
| Survival | END + PER | Supplies last longer, longer trips possible *(later)* |
| Lore | INT | Know monster weaknesses, bonus damage *(later)* |

The first slice ships with **Appraisal, Scouting and Medicine** only.

Appraisal works hand-in-hand with carry slots: a party can only bring back so much, and a good appraiser brings back the gem instead of the rusty helmet.

## 6. Morale and motivation

Every hero has:

- **A motivation**: Gold, Glory, Knowledge, or Comrades (more later, e.g. Revenge, Faith).
- **Likes/dislikes**: a preferred weapon or school of magic, and sometimes a disliked one.
- **Morale**: 0–100, starts around 60.

After each expedition, morale moves based on what the hero cares about:

| Motivation | Up when… | Down when… |
|---|---|---|
| Gold | Good loot share, high pay | Empty-handed return |
| Glory | Many kills, deep floors, boss kills | Retreating early, "boring" floors |
| Knowledge | New floors, new monster types, magic items | Repeating the same floor |
| Comrades | Party survives together | A party member dies or is abandoned |

Everyone also gets morale from using a liked weapon, and loses it from a disliked one, injuries, or too little rest.

- **Below 30**: the hero complains (shown in town). In the dungeon they may ignore standing orders (a Glory hero refuses to retreat; a Gold hero lags behind to loot).
- **At 0**: the hero quits the guild.

✅ **DECIDED 4: does a quitting hero take their gear?** Decision: they keep what they're wearing and leave the rest. That stings enough to matter without wiping out your stash.

## 7. Alignment (after the first slice)

> Added 2026-11-20. Not part of the first playable slice. It slots in once morale and motivations exist (M5), and is data-driven like everything else.

Every hero is **Good**, **Neutral** or **Evil**. Alignment is shown when recruiting and never changes on its own (perks or events might shift it later).

### Party alignment

- If **at least two-thirds** of the party share an alignment, that is the **party alignment**.
- Every other member should be **within one step** of it. Good and Evil are two steps apart; Neutral is one step from both.
- So a **Good** party can take Neutral heroes, an **Evil** party can take Neutral heroes, and a **Neutral** party can take *both* Good and Evil heroes. A Neutral-majority party is the only way Good and Evil heroes go into the dungeon together.
- With no two-thirds majority, the party is **divided**: no alignment bonuses, and the friction penalty below applies.

| Party (example) | Party alignment | OK? |
|---|---|---|
| Good, Good, Neutral | Good | Yes |
| Good, Good, Evil | Good | Mismatch: the Evil hero is two steps away |
| Neutral, Neutral, Good | Neutral | Yes |
| Neutral ×4, Good, Evil | Neutral | Yes, Good and Evil held together by the Neutral majority |
| Good, Neutral, Evil | Divided | Friction |

**Mismatches are a morale cost, not a ban.** You can always send any party, because sometimes the only heroes free for a rescue run are the wrong ones. A mismatched hero, and the heroes they clash with, lose morale on every day of the expedition, and a mismatched hero at low morale is more likely to ignore standing orders or walk out. Good and Evil heroes in the same party also feel a small amount of friction even when it is allowed. A Neutral majority keeps the peace, but doesn't make them friends.

### What alignment changes

- **Morale:** alignment acts like a second motivation. Good heroes lose morale when the party abandons a downed ally or robs a stranger; Evil heroes gain it from taking extra loot or finishing off fleeing monsters.
- **Room events:** the same event plays out differently. A wounded stranger is healed by a Good party (maybe a reward later), ignored by a Neutral one, and robbed by an Evil one.
- **Monsters:** some monsters react to the party's alignment. Undead go after Good heroes first; some goblin bands will parley with, or demand tribute from, an Evil party instead of fighting.
- **Loot:** holy and unholy items. Good heroes refuse to carry cursed or unholy gear, and Evil heroes are happy to use it.
- **Town:** the temple offers cheaper healing to Good heroes; a black market only deals with Evil ones. Too many Evil heroes in the guild could make townsfolk wary (worse recruit pool).

### Built to grow

Alignment is just another kind of content (`content/alignments/`): each alignment is a definition with a position on the scale, and party alignment is worked out as a tag on the party (`party:good`, `party:divided`). Events, monster behaviour, item rules and morale effects check those tags through the normal effects system (§13). A second axis (for example Lawful / Chaotic) could be added later without changing the engine.

✅ **DECIDED: small parties.** The plain two-thirds rule stays. Party size grows with the Guild Hall (§8), so early parties of 3 to 5 can't mix Good and Evil, and a 6-slot hall (4 Neutral, 1 Good, 1 Evil) unlocks it. Mixing the two becomes something you earn.

## 8. The town: guild hall and buildings

> Added 2026-11-20. The Guild Hall is in the first slice; the wider building system grows from M4 onward.

Your progress lives in two places: your **heroes** (who can die) and your **town** (which can't). Loot pays for both.

### Party size comes from the Guild Hall

How many heroes you can send at once is set by the size of your **Guild Hall**. You start small and upgrade it, so the game begins with simple parties and the complexity grows as you do.

| Guild Hall level | Party slots | Roster size | Notes |
|---|---|---|---|
| 1 (start) | 3 | 6 | |
| 2 | 4 | 8 | |
| 3 | 5 | 10 | |
| 4 | 6 | 12 | Good and Evil can now share a Neutral party (§7) |

Six is the planned cap for now. More levels are just more rows of data.

### Buildings

- Buildings cost a **one-off** price, with no upkeep.
- Better buildings need more than gold: **materials only found on deeper floors** (iron ore, spider silk, bone dust…) and sometimes a guild **renown** level. So stronger heroes, who can reach deeper, are what unlock the better buildings.
- Buildings are **permanent**. If a party wipes, the town is still there. This is the safety net that stops one bad expedition ending the game.
- **Town raids** (decision 3) can damage a building. A damaged building stops working until it is repaired (cheap), but it is never destroyed.

Starting list (more later):

| Building | Does | Slice? |
|---|---|---|
| **Guild Hall** | Party slots and roster size (above) | **First slice** (levels 1–2) |
| **Market** | Buy and sell basic gear and potions | **First slice** (built from the start) |
| Tavern | Better recruits to choose from; resting heroes recover morale faster | Later (M4) |
| Blacksmith | Better gear for sale; repair and upgrade items | Later (M4) |
| Apothecary | Cheaper potions; injuries heal faster | Later |
| Training Yard | Heroes resting in town gain a little XP | Later |
| Library | Identify trinkets; Knowledge heroes like it; teaches the Lore skill | Later |
| Pit defences | Hold back monsters climbing out of the pit (see below) | Later (M4, with raids) |
| Vault | Protects your stash from raids | Later |
| Temple / Black Market | Alignment services for Good / Evil heroes (§7) | With alignment |

### Defences around the pit

Whatever overflows floor 1 climbs out of the pit. Defences built around the pit decide how much of it reaches the town.

| Defence | Does |
|---|---|
| **Palisade → Stone wall** | Adds defence. Each level holds back more climbing monsters |
| **Gate** | Lets parties in and out; a stronger gate stops raiders breaking straight through |
| **Watchtowers** | Early warning: shows a raid coming a day ahead, so you can keep strong heroes home. Also adds a little defence |
| Later: traps, a pit-edge garrison of resting heroes | More ways to defend |

How it works each day:

1. Floor 1 overflow climbs out. Its **strength** = number of monsters × their level.
2. The town's **defence** (from its defences) soaks up that much strength.
3. Anything left over becomes a **raid**: the bigger the leftover, the worse the raid (a damaged building, an injured resting hero, stolen stash).

So raids measure how well you're keeping the population down. A town that clears floor 1 often hardly sees raids, even with weak walls. A town that neglects the dungeon will eventually be overrun, whatever its walls are made of, because overflow keeps growing and walls don't. Defences buy time; only clearing the dungeon fixes the problem.

In town, a simple **pit gauge** shows the overflow climbing out against your defence. It's the most direct sign of how things are going.

Defences are ordinary buildings in `content/buildings/` with a `defence` (or `raidWarning`) effect, so new kinds of defence are just new data.

### Later: the opening, holding the pit

> Added 2026-11-20. **Not in the first playable version**, which still starts with a Guild Hall and delving available. This becomes the game's opening once raids and defences exist (after M4).

The game starts when you arrive at a mining site that has just dug too far. There are no defences, no Guild Hall, and monsters are already climbing out of the pit.

1. **Hold the line.** There's no delving yet. You assign your first heroes to **makeshift defence posts** around the pit (barricade, gate gap, lookout) and to **makeshift roles** (whoever is holding the pick-axe is the fighter). Then you watch them hold. Each night's overflow is fought with the normal combat sim, as waves against the posts.
2. **Gather materials.** Fallen raiders drop materials, and the miners salvage what they can. Losses still hurt, and heroes still have morale.
3. **Build up.** Once you have enough, you build the first real defences (palisade, gate) and the Guild Hall.
4. **Push down.** With the town secure enough, delving unlocks and the normal game begins: send parties down to thin the population at its source.

This works as a tutorial in disguise. It teaches assigning heroes, watching auto-battles, morale and building, before the player has to think about expeditions. It reuses the combat sim and the defence buildings, so it is mostly new content and a few new rules rather than new systems. Defence posts and makeshift roles are data like everything else (`content/posts/`, roles as temporary class definitions).

### Favourite buildings

Every hero has a **favourite building**, usually linked to their motivation (a Comrades hero loves the Tavern, a Knowledge hero the Library, a Glory hero the Training Yard, a Gold hero the Vault or Market). Their profile shows it.

- **Built:** a small morale boost on every rest day in town.
- **Missing:** a small morale drain on every rest day, and a grumble shown in town ("Bram keeps asking when we're getting a tavern").
- Later, a strong recruit might refuse to join a town without their favourite building.

This turns building choices into hero management: the town you build shapes which heroes are happy to stay.

### Built to grow

Buildings are data (`content/buildings/`): each has a cost, required materials and renown, levels, and its effects written in the normal effects system (§13). For example, the Guild Hall's levels just set `partySlots` and `rosterSize`, and the Tavern adds a `restMorale` bonus. A favourite building is a field on the hero, picked from a list weighted by motivation. Adding a building never changes the engine.

## 9. Levelling up

Options:

- **Class-baked**: stats rise automatically by class. Simple, but the player has no input.
- **Player-chosen**: the player spends points and picks perks. Lots of agency, harder to balance.
- **Hybrid (chosen)**: each level the class gives fixed small stat gains, *and* the player picks **1 perk from 3 offered** (weighted toward the class). Every 3rd level, +1 free stat point.

Why hybrid: this is a watch-only game, so nearly all of the player's agency lives in town. Level-ups are one of the best places to give them real choices. Class baselines keep classes distinct and keep balance manageable.

Optional twist that ties into morale: a hero may *want* a particular perk ("Bram wants to learn Cleave"). Granting it gives a morale bump.

✅ **DECIDED 5: level-up style.** Decision: hybrid, as above.

## 10. Death, wipes and recovery runs

- At 0 HP a hero is **downed**, not dead. A downed hero bleeds out over a few turns unless stabilised (Medicine) or the fight ends. Allies carry downed heroes out if they have the carry slots.
- If the whole party goes down, it's a **wipe**. Each hero then rolls: dead, or alive and **trapped/captured**, with a rescue window of a few days.
- The wipe leaves a **lost party site** on that floor with their gear.
- A **recovery run** is a normal expedition with the target "recover lost party on floor N". It brings back surviving heroes (injured) and whatever gear is still there.
- Over time, monsters **pick up gear from the site**. Those monsters get stronger, and killing one drops the gear. This makes delay costly and gives a great "we got Bram's sword back" moment.

✅ **DECIDED 6: permadeath.** Decision: yes, dead heroes stay dead, but the rescue window means a quick recovery run can save some. Alternative: nobody dies, only "lost until rescued".

## 11. How an expedition is simulated

1. A floor is a short chain of **rooms** (5–8 for floor 1), generated from a seed.
2. Entering a room: a **Scouting check** may reveal what's inside (ambush, trap, treasure).
3. Room types: fight, trap, treasure, rest spot, event (a wounded stranger, a strange shrine…).
4. **Fights** are turn-based and fully automatic:
   - Two rows: front (melee, takes most hits) and back (ranged, casters). The player sets the formation in town.
   - Turn order by initiative. Hit = accuracy vs evasion. Damage = attack − armour.
   - Each class has a simple AI (fighter attacks the biggest threat, mage uses spells on groups, etc.).
5. After each room: check standing orders (retreat?), morale, and supplies.
6. Every step writes to an **event log**. The "watch" screen is just a player for that log.

The simulation is **deterministic**: same seed + same party = same result. That makes it easy to test, debug, balance and replay.

✅ **DECIDED 7: how the watching looks.** Decision: start with an animated, readable text log (like a battle report), with HP bars. Add a simple 2D view later. Building the sim first and the visuals second means the game is playable much sooner.

## 12. First playable slice

Small on purpose. Everything here is data, so adding more later means adding entries, not rewriting code.

**Classes (3)**

| Class | Main stats | Role | Likes |
|---|---|---|---|
| Fighter | STR, END | Front row, soaks hits | Swords, axes, shields |
| Scout | DEX, PER | Scouting + appraisal, ranged | Bows, daggers |
| Mage | INT, WIL | Back row, area damage, medicine | Staves; fire spells |

The Cleric (healer, WIL/CHA) is the obvious 4th class to add next.

**Monsters (5), floors 1–3**

| Monster | Gimmick |
|---|---|
| Slime | Weak, splits when hit hard |
| Giant Rat | Comes in swarms, low HP |
| Goblin | Mixed groups with archers in the back row |
| Cave Spider | Ambusher: big first strike unless scouted |
| Skeleton | Resists piercing; rewards bringing an axe |

**Items (~12)**

- Weapons: sword, axe, dagger, short bow, staff
- Armour: leather, chainmail, wooden shield
- Consumables: healing potion, bandages
- Loot: coins, gems (value varies a lot, so appraisal matters), unidentified trinkets

**Dungeon:** 3 floors, a starting roster of 4 recruits, one party out at a time.

**Town:** Guild Hall level 1 (3 party slots), upgradeable to level 2 (4 slots), plus a Market. That's enough to prove the building system without much content.

✅ **DECIDED 8: one party or several at once?** Decision: one at a time in the first slice; multiple parties later (which also makes rescue runs work while your main party is busy).

## 13. Built to grow (extensibility)

The game will start small and grow, so the main design rule is: **new content is data, not code.** Adding a class, monster, item, skill or perk should mean adding one entry to a data file, with no changes to the engine.

**Everything is a definition.** Each kind of content has its own folder of definitions, checked against a schema when the game loads:

```
content/
  classes/fighter.ts      # stat growth, likes, starting kit, perk pool
  monsters/goblin.ts      # stats, level band, behaviour, loot table
  items/sword.ts          # slot, stat bonuses, damage type, tags
  skills/scouting.ts      # base stats, where it is checked
  perks/cleave.ts         # effects + who can be offered it
  motivations/glory.ts    # what raises and lowers morale
  rooms/shrine.ts         # room/event types
```

For example, a monster is just:

```ts
export default defineMonster({
  id: "cave-spider",
  name: "Cave Spider",
  levelBand: [2, 5],
  stats: { STR: 6, DEX: 14, END: 6, PER: 12, INT: 2, WIL: 6, CHA: 1 },
  tags: ["beast", "ambusher"],
  behaviour: "ambush-then-bite",
  abilities: ["venom-bite"],
  loot: "spider-loot",
});
```

**Effects, not special cases.** Perks, items, spells and monster abilities are built from a small shared set of **effects** (`modifyStat`, `dealDamage`, `heal`, `applyStatus`, `bonusVsTag`, `modifySkill`, `onEvent`…). A new perk like "+20% damage vs undead" is a combination of existing effects, not new engine code. New effect types get added only when something genuinely new is needed, and then every kind of content can use them.

**Tags drive the rules.** Items, monsters and heroes carry tags (`undead`, `piercing`, `heavy`, `fire`, `ambusher`). Resistances, likes/dislikes, perk conditions and AI choices all look at tags, so a new monster or weapon type plugs into existing rules automatically.

**Hooks for behaviour.** Things that really do need code (a class AI, an unusual room event) register under an id and are referenced from data by that id. The sim calls them through a fixed interface, so adding one never means editing the combat loop.

**Stable ids and versioned saves.** Every definition has a permanent id, and saves store ids, not copies of the data. Saves carry a version number with migrations, so old saves keep working as content changes.

**Guard rails.** A content check (run in tests and CI) fails if a definition references an id that doesn't exist, breaks the schema, or produces a wildly out-of-band balance number in a quick headless simulation. That keeps a growing content library from quietly breaking.

## 14. Tech stack and hosting

**Chosen: a TypeScript web game.**

| Part | Choice | Why |
|---|---|---|
| Language | TypeScript | One language for sim and UI, typed data for game content |
| Simulation | Plain TS package, no UI code, seeded RNG | Testable on its own, can run headless for balance testing |
| Tests | Vitest | Fast, simple |
| UI | React + Vite | The town screens are menus, lists and forms, which suit a web UI well |
| Watch view | Text log first, then PixiJS or Canvas for a 2D view | Visuals can come later without touching the sim |
| Game content | Typed TS definition files with schema checks (see §13) | Growing the game = adding data |
| Saves | Browser storage (IndexedDB) | No server needed |
| Hosting | GitHub Pages, deployed by GitHub Actions | Free, already on GitHub, auto-deploys on merge |

No backend is needed until something like cloud saves or leaderboards is wanted.

Alternatives considered:

- **Godot**: great if rich visuals and animation are the priority, but menu-heavy UI is slower to build and the web export is heavier.
- **Unity**: overkill for this, slow iteration.
- **Python**: fine for prototyping the sim, but hard to ship as a web game.

✅ **DECIDED 9: stack and hosting.** Decision: TypeScript + React + Vite, hosted on GitHub Pages.

## 15. Build plan

Each milestone ends with something you can run.

| # | Milestone | You can… |
|---|---|---|
| M0 | Project setup: Vite + TS, tests, CI, deploy to GitHub Pages | Open a "hello" page at a public URL |
| M1 | Sim core: content definitions + schema checks, effects system, stats, seeded combat between a party and a monster group | Run a fight from the command line and read the log |
| M2 | Expeditions: floors, rooms, scouting, traps, loot, appraisal, standing orders | Simulate a full trip to floor 1–3 |
| M3 | Town UI: roster, recruit, equip, formation, launch, watch the log, results screen | Actually play a loop in the browser |
| M4 | Time, town and saves: dungeon days, population push-up, pressure map, Guild Hall upgrades and first buildings (Tavern, Blacksmith), pit overflow, raids and the first defences (palisade, gate), save/load | Feel the dungeon getting worse over time |
| M5 | Heroes with personalities: morale, motivations, favourite buildings, level-up perks, wipes and recovery runs | Play the full design in miniature |
| M6+ | Balance pass, then grow content: Cleric, alignment (§7), more buildings, the "holding the pit" opening (§8), more monsters/floors, 2D watch view, multiple parties | Keep growing |

## 16. Decisions (agreed 2026-11-20)

| # | Decision | Agreed |
|---|---|---|
| 1 | Difficulty curve | Exponential with depth; time difficulty driven by the population sim |
| 2 | What is a "day" | In-game days, advanced by expeditions, not real time |
| 3 | Floor 1 overflow | Town raids (penalties, not game over) |
| 4 | Quitting heroes and gear | They keep what they're wearing |
| 5 | Level-up style | Hybrid: class stat gains + pick 1 of 3 perks |
| 6 | Permadeath | Yes, with a rescue window after a wipe |
| 7 | Watch presentation | Text battle log first, 2D view later |
| 8 | Parties at once | One in the first slice, several later |
| 9 | Stack and hosting | TypeScript + React + Vite on GitHub Pages |
| 10 | Alignment | Good / Neutral / Evil; two-thirds sets party alignment, others within one step; mismatches cost morale rather than being banned. Added after the first slice |
| 11 | Party size | Set by the Guild Hall level: 3 slots at the start, up to 6. Good + Evil mixing unlocks at 6 |
| 12 | Town buildings | One-off cost (gold, deep-floor materials, renown); permanent, survive wipes; raids damage but never destroy |
| 13 | Favourite buildings | Each hero has one; built = morale boost, missing = morale drain |
| 14 | Dungeon entrance and defences | An open pit dug by the original mining camp. Defences around it (walls, gate, watchtowers) soak up overflow; what gets past becomes a raid |
| 15 | Game opening (later) | Start at an undefended mining site, assign heroes to makeshift defences, gather materials, build up, then unlock delving. The first playable version is unchanged |
