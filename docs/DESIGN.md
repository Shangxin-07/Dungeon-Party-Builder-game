# Dungeon Party Builder: Design & Build Plan

> **Status:** agreed design, 2026-11-20. Built so far: M0 (project setup), M1 (simulation core), M2 (expeditions), M3 (the town), M4 (time, raids and saves) and M5 (morale, levels and rescue runs).
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
| Temple | Resurrection (§10); cheaper healing for Good heroes (§7) | Later (M6+) |
| Graveyard | Bury the fallen: friends' morale recovers faster (§10) | Later (M6+) |
| Black Market | Alignment services for Evil heroes (§7) | With alignment |

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

### Later: freeform classes and progression

> Added 2026-11-20. **Not in the first playable version**, where each hero has a single base class and every level goes into it. Class names below are examples only, not commitments. Numbers are starting points to tune.

Two rules keep this simple:

1. **Heroes only move forward, never swap.** A hero keeps every class they learn. Nobody stops being a Fighter; they become *more* than one.
2. **Depth is rewarded.** Spreading levels out gives breadth and opens combos; staying in one class gives the strongest perks and abilities. A level-50 Fighter should hit very hard.

#### Hero level and class levels

- **Hero level** runs from 1 to about **50**. It drives HP and general power, and its XP is what heroes earn on expeditions.
- **Each level-up, you choose which of the hero's known classes gets the level.** That class gives its stat gains and a perk offer (pick 1 of 3) from its own pool at its new class level. The free stat point every 3rd hero level stays.
- **Class levels are not capped.** A hero who puts every level into Fighter ends up Fighter 50. A hero's class levels always add up to their hero level.
- **Learning a new base class:** at any level-up, a hero can put the level into a base class they don't have yet, if they meet its stat minimum. It starts at class level 1.

#### Rewarding depth

- **Class abilities scale with class level**, not hero level: a Fighter's weapon bonus or a Mage's spell power grows with Fighter or Mage levels.
- **Milestone perks** sit at class levels 5, 10, 20, 30, 40 and 50, and the deeper ones are the strongest (a level-50 capstone). Only a hero who commits gets them.
- So a Fighter 25 / Mage 25 has two good kits and access to combos, but nothing close to a Fighter 50's damage. Spread too thin (five classes at level 10) and the hero is a jack of all trades.

#### Unlocks are thresholds, not caps

Advanced and combo classes open up when a hero reaches certain class levels and stats. Once unlocked, they're another class to put levels into, uncapped like the rest, and the earlier classes stay.

| Kind | Unlocks at (example) | Example |
|---|---|---|
| **Base** | Recruited, or learned at any level-up if the stat minimum is met | Fighter, Scout, Mage, Cleric |
| **Advanced** | One base class at a threshold, plus a stat minimum | Mage 10 + high WIL → Necromancer; Mage 10 + high INT → Ice Mage |
| **Combo** | Two (or more) classes at thresholds, plus stat minimums | Fighter 5 + Mage 5 → Spellblade |

There's no forced choice at any level: a hero who qualifies for nothing just keeps levelling what they have, and specialises later if they ever meet a requirement. Because unlocks are just requirements, the system keeps growing: deeper unlocks (an advanced class at level 20 that opens a further one) are just more class definitions.

**Extra requirements**, all optional per class:

- **A town building**: training a new advanced class needs the right building (a Mage Tower for spellcasting specialisations, an Arena for fighting ones). This links class progression to the town (§8).
- **Alignment**: some classes might need or forbid an alignment (§7).
- **Motivation**: a hero's motivation can favour a path ("Mira wants to be a Necromancer"). Granting it gives a morale boost; when it's possible and you choose something else, they lose morale.

**Built to grow:** every class, whatever its kind, is a class definition with a `requires` block, so adding one is just data:

```ts
export default defineClass({
  id: "spellblade",
  kind: "combo",
  requires: {
    classLevels: { fighter: 5, mage: 5 },
    stats: { STR: 12, INT: 12 },
    building: "mage-tower",
  },
  milestonePerks: { 5: [...], 10: [...], 20: [...] },
  // stat growth per class level, perk pool, gear likes, AI behaviour…
});
```

## 10. Death, wipes and recovery runs

- At 0 HP a hero is **downed**, not dead. A downed hero bleeds out over a few turns unless stabilised (Medicine) or the fight ends. Allies carry downed heroes out if they have the carry slots.
- If the whole party goes down, it's a **wipe**. Each hero then rolls: dead, or alive and **trapped/captured**, with a rescue window of a few days.
- The wipe leaves a **lost party site** on that floor with their gear.
- A **recovery run** is a normal expedition with the target "recover lost party on floor N". It brings back surviving heroes (injured) and whatever gear is still there.
- Over time, monsters **pick up gear from the site**. Those monsters get stronger, and killing one drops the gear. This makes delay costly and gives a great "we got Bram's sword back" moment.

### Later: what happens to the fallen

> Added 2026-11-20. **Not in the first playable version** (M3 shows dead heroes on a memorial). This builds on rescue runs (M5) and needs the Temple and Graveyard buildings, so it lands in M6+.

A dead hero leaves a **body**, and the body matters. Recovery runs (above) can bring bodies home as well as survivors and gear. Once a body is in town, you choose:

| Choice | Needs | Result |
|---|---|---|
| **Resurrect** | A **Temple** (§8), plus a cost: gold and rare materials | The hero comes back, but **loses a level** (or a percentage of their levels; the amount is tunable data). See below |
| **Bury** | A **Graveyard** (§8) | The hero is laid to rest. Their friends' morale recovers faster, and Comrades-motivated heroes especially care that it was done |

**The resurrection cost.** The lost levels come off the top: the most recent levels go first, in reverse order. Stat gains from those levels disappear. The levels aren't gone for good, though. As the hero earns XP back, each lost level is restored exactly as it was, with the same class, stat gains and perk. So death costs time, not the choices you made.

**If neither happens**, because the body is never recovered or there's nowhere to bury it, the dungeon keeps it. After a while it rises as an **undead version of the hero**. It has their name ("Bram, Risen"), their class and fighting style, and the gear they died in. It joins the population of the floor where it fell, and pushes upward like any other monster (§4). A later party might run into it:

- Heroes who knew the fallen hero lose morale fighting them, and Good heroes especially.
- Killing it returns the gear and the body. The body can then only be buried, not resurrected.
- A scouting or lore check might recognise it before the fight ("That's... Bram's shield").

This gives every death a story and a reason to run a recovery, without making death meaningless.

**Built to grow:** "rising" is a transform applied to a snapshot of the dead hero (adds the `undead` tag and an undead stat template, and keeps class AI and gear), defined in `content/transforms/`. Resurrection and burial are building actions with costs and effects in the building definitions. Rise time, resurrection cost and morale effects are all numbers in data.

✅ **DECIDED 6: permadeath.** Decision: yes, dead heroes stay dead, but the rescue window means a quick recovery run can save some. Later, a recovered body can be resurrected at a Temple, at a cost (above). Alternative: nobody dies, only "lost until rescued".

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

### As built in M2

> Added 2026-11-20. The numbers are starting points for tuning.

- **Floors** are content (`content/floors/`): a name, a room count (5–7 on floor 1, 6–8 on floors 2–3) and rooms every floor always has. Each floor has one **rest spot**, placed somewhere in the middle.
- **Rooms** are content (`content/rooms/`). Each names a behaviour: `fight`, `trap`, `treasure`, `rest` or `quiet`. New behaviours (shrines, a wounded stranger) are registered by id, like combat AIs.
- **Scouting:** before a fight, the best scout may get the jump on the monsters (chance = Scouting − 30, up to 60%). The party then gets a free opening round. Traps are spotted with chance Scouting − hidden + 50, and a spotted trap is simply avoided. Disarming waits for Trapwork.
- **Traps** hurt one hero or the whole party, ×1.3 per floor like monsters. Resistances help; armour doesn't.
- **Medicine:** the fight ending stops the bleeding. After every room, the best medic tries to get downed heroes up (30% + 60% × Medicine) and uses bandages on anyone below 60% HP, getting more out of each one the better their Medicine. A hero who can't be brought round is carried and takes up 4 carry slots.
- **Rest spots** restore HP (60% of max, scaled from half to full by Medicine) and 60% of mana. Casters also get back WIL ÷ 4 mana per room walked. This fixes the M1 problem of the mage running dry.
- **Loot:** monsters and chests roll loot tables (`content/loot/`). Valuables have a value range, and the party only knows its *guess*: Appraisal 100 is exact, Appraisal 0 can be 90% off. Carry slots are shared across the party; when packs are full, the best appraiser leaves behind whatever looks least valuable per slot.
- **Standing orders:** a target floor, a retreat rule (below 30% HP, below 50% HP, anyone down, out of potions, never) and a loot rule (carry everything, or leave the junk). Orders are checked after every room. Heroes always obey for now; disobedience comes with morale in M5.
- **The way home** goes back through cleared floors, with a 20% chance per floor of meeting wandering monsters.
- **Wipes:** the party and its haul stay where they fell, and the result records the spot for a rescue run (M5). A trip takes one day per floor reached.

Balance with a fresh starter party (500 trips each, `npm run balance`):

| Target floor | Orders | Came home as ordered | Turned back | Wiped |
|---|---|---|---|---|
| 1 | below 30% HP | 100% | 0% | 0% |
| 2 | below 30% HP | 85% | 13% | 2% |
| 3 | below 30% HP | 27% | 54% | 19% |
| 3 | never turn back | 47% | 0% | 53% |

Floor 1 is unchanged from M1. Careful orders on floor 3 trade reaching the bottom for staying alive, so the orders are a real choice.

### As built in M3: the town

> Added 2026-11-20. The numbers are starting points for tuning.

- **Town rules are content** (`content/town.ts`): 100 starting gold, a roster of 4 (Fighter, Scout, Mage, Fighter), two rolls of bandages in the store room, 3 recruits on offer, 60 gold to hire, the Market pays 50% of value, and heroes heal 40% of max HP per day in town.
- **Buildings are content** (`content/buildings/`). Each level lists its cost, a one-line summary and its effects (`partySlots`, `rosterSize`, `sells`). Guild Hall level 1 (3 slots, roster 6) and level 2 (4 slots, roster 8, 300 gold); the Market is built from the start. New effect types are added once in `src/sim/town.ts`.
- **Town logic** lives in `src/sim/town.ts` as pure functions over a plain-data `TownState`: hire, dismiss (the guild keeps their gear), buy, sell, equip, pack supplies, set row, pick the party, set orders, upgrade, rest a day, launch. Same seed, same town.
- **Recruits** bring their class's starting kit. A new batch turns up every day.
- **Launch** simulates the whole trip at once, then the UI plays back the log. The town already reflects the outcome, so there's nothing to change while watching.
- **Coming home:** the Market pays the real value of the haul (the results screen shows the party's guess next to it). The trip takes one day per floor; heroes who stayed home rest that long, the party gets one night's rest. Each hero keeps a record of trips and kills.
- **Wipes:** the dead go on the memorial; the rest are listed as lost on that floor, with their gear. Rescue runs come in M5.
- The town is saved in the browser (localStorage) so a refresh doesn't lose it. Proper save slots are still M4.

### As built in M4: time, the pit and saves

> Added 2026-11-20. The numbers are starting points for tuning. `npm run days` plays a town with a simple bot and prints the dungeon night by night.

- **The dungeon keeps a population** (§4). Each floor has a capacity and a starting population (`content/floors/`: 40/50/60, starting at 28/38/50) and an average **monster level**. Levels are depth-equivalent: level 1.6 means "between a floor-1 and a floor-2 monster".
- **Every night** (`src/sim/dungeon.ts`, rules in `content/dungeon.ts`): the bottom floor breeds 6 monsters, plus 0.15 more each day. A floor over capacity pushes its extra up; they arrive half a level below their old floor's average and pull the new floor's level up. Every floor settles 5% of the way back to its own depth each day. Floor 1's extra climb out of the pit. No dice, so it can be forecast exactly.
- **Expeditions feel it.** A floor's level sets how big its fights are (power = 10 × 1.3^(level − 1), so a floor-1 at level 1.6 fights like 11.7 instead of 10), deeper floors' monster groups can turn up, and a floor can't throw more monsters at you than it has left. Every kill comes off the population, and a floor that's been cleared out has quiet fight rooms. Clearing floor 1 makes room, so for a while stronger rejects from floor 2 move in: you see the lore happen.
- **The pit** (§8): what climbs out has **strength** = monsters × level. Defences hold back that much. Whatever's left is a **raid**: raiders worth 3 power per point of leftover strength come for the town, and the healthy heroes at home (at least 50% HP, up to 6) fight them with the normal combat sim. The fight is saved and can be watched. Nobody bleeds out in town: defenders who fall wake up hurt. If nobody is fit to fight or the defenders lose, the raiders steal 5 gold per point of leftover and damage one building per 4 points. A damaged building does nothing until it's repaired (25% of what it cost); it's never destroyed. The Guild Hall is raid-proof so a raid can never cost you party slots.
- **Nights pass one at a time.** Resting a day is one night. A trip of N days is N nights, and while the party is away only the heroes left home can defend. That's the watchtower decision: when a raid is coming, keep someone strong home.
- **Building takes time** (added after Mike played M4). Every building level has a `days` build time. You pay up front, the builders start, and the new level takes effect on the morning the work is done. Until then the building keeps working at its old level. Each building can have one job at a time, but several buildings can go up at once, and work goes on while a party is away. Repairs are still instant.
- **New buildings** (all data in `content/buildings/`, with new effect types `defence`, `raidWarning`, `recruitOffers`, `recruitPicks`):

| Building | Levels |
|---|---|
| Palisade → Stone wall → High stone wall | 80 / 250 / 600 gold, 2 / 4 / 6 days: defence 6 / 12 / 20 |
| Pit Gate | 60 / 180 gold, 1 / 3 days: defence 3 / 6 |
| Watchtower | 100 / 220 gold, 2 / 3 days: see 1 / 2 nights ahead, defence 1 / 2 |
| Tavern | 150 / 400 gold, 2 / 4 days: +1 / +2 recruits a day, each the best of 2 / 3 rolls. Morale comes in M5 |
| Blacksmith | 200 / 450 gold, 3 / 5 days: sells Iron Sword, War Axe, Longbow, Iron Shield; then Scale Mail and Iron-shod Staff. Repairs and upgrades later |
| Guild Hall levels 2, 3 and 4 | 300 / 600 / 1000 gold, 3 / 5 / 7 days: 4 / 5 / 6 per party, roster 8 / 10 / 12 |

- **In town**, the pit panel shows last night's gauge (strength vs defence), the watchtower's forecast, the last 30 nights as a chart, the home guard if the party leaves, recent raids (with "Watch the fight"), and a **pressure map**: population, level band and today's fight power per floor. The trip results say what happened at the pit while the party was away.
- **Saves:** three save slots in the browser, each autosaving after every action, plus save to and load from a file. Saves carry a version number and are upgraded step by step on load (`src/sim/save.ts`); an M3 save is moved into slot 1 and upgraded.

What the bot sees over 60 days (40 towns each; the bot rests to 90% HP, then goes down):

| Plan | First raid (median) | Raids | Overflow strength on day 60 |
|---|---|---|---|
| Never go down | day 6 | 55 (almost all beaten off by 4 heroes at home) | 20 |
| Floor-1 trips, no defences | day 37 | 15 (half beaten off) | 10 |
| Floor-1 trips, building defences | none | 0 | 5 |
| Floor-2 trips, building defences | none | 2.5 | 12 |

Not yet: materials and renown as building costs, the Tavern's morale bonus, Blacksmith repairs and upgrades, the Vault (stash protection), and garrisons or traps at the pit.

### As built in M5: personalities, levels and rescue runs

> Added 2026-11-20. The numbers are starting points for tuning. Alignment (§7) is still M6+.

- **Personalities** (§6). Every hero has a **motivation** (Gold, Glory, Knowledge, Comrades; `content/motivations/`), a gear tag they **like** (from their class's likes) and sometimes one they **hate**, a **favourite building** (picked from their motivation's list) and **morale** 0-100, starting 52-68. Personalities are worked out from the hero's id, name and stats rather than the shared dice, so no fight changed, and old saves get the same personality every time they load.
- **Morale is data.** Things that happen are boiled down to *facts* (gold share, kills, new floors, same old floor, new monsters, retreated, fallen comrades, everyone home, a rescue, came home hurt, sent down hurt, liked or hated gear, a quiet day, favourite built or missing, the Tavern, a wanted perk, a level-up). Rules in `content/morale.ts` (everyone) and each motivation turn facts into morale: `{ fact, amount, per, cap, below, reason }`. Losses are softened by WIL (3% per point above 10) and on a trip by the party's best CHA. Each hero keeps a short log of what moved their morale and why, shown in town.
- **Low morale** (below 30): the hero complains in town. A low-morale **Glory** hero may refuse to turn back when the orders say retreat (50%, once per floor); a low-morale **Gold** hero pockets junk the loot orders say to leave. **At 0** they quit, keeping what they wear and leaving their pack (decision 4).
- **Favourite buildings:** +1 morale each day in town while it stands (up to 80), −1 while it's missing or damaged, and a grumble in town. A quiet day also gives +1 to anyone below 50. New buildings so every favourite exists: **Library** (+10% / +20% trip XP), **Training Yard** (heroes in town earn 4 / 8 XP a day), **Vault** (raiders can't touch 50% / 100% of the gold). The **Tavern** now adds +1 / +2 morale a day.
- **XP and levels** (§9, rules in `content/levels.ts`). A trip gives 3 XP per point of monster power killed, shared by the survivors, plus 10 per floor reached each. Raids teach a quarter of that. Level L needs 100 × (L−1)^1.8 XP (100, 350, 720, 1210...), up to level 10 for now. Each level the class's `growth` applies at once (Fighter +1 STR/END, Scout DEX/PER, Mage INT/WIL); the player then picks **1 perk of 3** (class perks twice as likely as general ones; some need level 3), plus **a free stat point every 3rd level**. 35% of the time a hero wants one of the perks; granting it gives +8 morale. 16 perks in `content/perks/`.
- **Wipes** (§10). The dead lie where they fell with their gear. Everyone else rolls: 55% (+3% per END above 10) they're alive and **trapped**, with **5 days** from the news to be reached. A site (`LostSite`) holds the trapped, the bodies, the dead's gear and the haul. Each night monsters pick over it (8% per item); gear they take is **carried by monsters on that floor**: a fight there has a 35% chance one of them wields it (with its bonuses), and killing it gets it back ("Got Bram's sword back!"). A trapped hero nobody reaches dies, and the whole guild takes it hard. When a party loses someone but gets home, it brings their gear home.
- **Rescue runs** are an order on a normal trip (`orders.rescue`). The party goes down to the site's floor and, after as many rooms as the room they fell in, finds it: the trapped walk out with them at 25% HP (they don't fight; if the rescuers fall too, they're lost again), and the party picks up what it can carry, heroes' gear first. Heroes' own gear goes back to the store room instead of being sold.
- **Town:** each hero card shows morale (with "Why?"), XP, motivation, likes, favourite, perks and the level-up picker. New panels: *Around the guild* (news and grumbles) and *Lost in the dungeon* (sites, days left, what monsters carried off, "Send the next party to find them"). Trip results add XP, level-ups and each hero's morale change with reasons. Saves are version 4; older saves upgrade.

What the bot sees over 60 days (40 towns each; it spends level-ups, rescues the trapped, and with `--build` builds favourites once the walls are up):

| Plan | Average level at the end | Morale | Unhappy | Quit per town | Lost per town |
|---|---|---|---|---|---|
| Never go down | 2.0 (raids only) | 55 | 0% | 0 | 0 |
| Floor-1 trips, no building | 4.8 | 78 | 10% | 1.0 | 0 |
| Floor-1 trips, building | 5.8 | 87 | 2% | 0 | 0 |
| Floor-2 trips, building | 5.9 | 89 | 0% | 0 | 0.4 |
| Floor-3 trips, building | 6.1 | 93 | 0% | 0 | 3.5 (rescues rarely get through) |

Gold is plentiful in every plan (thousands by day 60), which keeps morale high once buildings go up. That's for the M6 balance pass.

### As built in M6 (part 1): the balance pass, monster stats and the Cleric

> Added 2026-11-20. All numbers are content (`content/town.ts`, `content/morale.ts`) and starting points for tuning.

**Where the gold goes.** M5 left every guild with thousands of gold by day 60 and nothing to spend it on, and morale sat at 85-95. Three changes:

- **Wages.** Every hero on the roster is paid at the end of each day: 2 gold plus 1 per level (`town.wages`). A roster of five level-5 heroes costs 35 gold a day, so wages grow with the guild. If the gold runs out, unpaid heroes lose 3 morale a day ("wasn't paid"), and Gold-motivated heroes another 4. A guild that never goes down now goes broke and its heroes walk out.
- **The Market's cut.** The Market pays 70% of the real value for loot in a trip's haul (`town.haulRate`); coins are always face value. Selling from the store room is unchanged (50%).
- **The books.** The town keeps 30 days of accounts (hauls, sales, purchases, hiring, wages, building, repairs, gold stolen by raiders). A new *The books* panel shows the last week, each hero's wage and how many days the gold would last. The town bar shows the daily wage bill. Saves are version 5; older saves start with empty books.

**Morale settles instead of climbing.**

- Above 70 morale, good news counts half (rounded down; `morale.contentAbove`).
- A day sitting in town above 70 costs 1 morale ("restless after days in town"): the shine of the last trip wears off. Rules can now say `above` as well as `below`.
- Favourite buildings and the Tavern now lift morale only up to 70 (was 80 and 75).

What the bot sees over 60 days (40 towns each). With `--build` it now builds and upgrades everything once the walls are up, cheapest first, keeping a few days' wages in hand: a guild that spends what it earns.

| Plan | Gold from trips | Gold in hand, day 60 | Buildings (of 20 levels) | Level | Morale | Unhappy | Quit per town |
|---|---|---|---|---|---|---|---|
| Never go down | 0 | 0 | 0 | 1.7 | 11 | 100% | 3.6 |
| Floor-1 trips, no building | 3,900 (was 5,100) | 2,600 (was 5,000) | 0 | 4.9 | 61 (was 78) | 7% | 0.9 |
| Floor-1 trips, building | 3,850 | 330 | 12.8 | 5.2 | 70 (was 87) | 1% | 0.5 |
| Floor-2 trips, building | 3,900 | 400 | 12.6 | 5.4 | 71 (was 89) | 1% | 0.1 |
| Floor-3 trips, building | 2,250 | 0 | 7.5 | 5.8 | 78 (was 93) | 0% | 0 |

A guild that builds now has about two-thirds of the town by day 60 instead of all of it with gold to spare. Floor-3 trips are still the most rewarding for morale but lose 3 heroes per town and leave the coffers empty from raids.

**Monster stats in the watch view.** Each monster in a fight gets a card like the heroes': HP, row, weapon and damage type, tags, the 7 stats and the six numbers that decide a fight (attack, accuracy, evasion, armour, resist, initiative). They're the monster's real numbers in that fight, so one carrying a lost hero's gear shows the bonus. The sandbox test fight has the same cards. Trips saved before M6 just show the HP bars.

**The Cleric** (§12's fourth class). WIL/CHA, front row, likes maces and holy things. Starts with a mace (+2 spell power), leather armour, a wooden shield and bandages. *Prayer of Mending* heals more than a mage's Mend; *Smite* is holy damage, and skeletons now take 50% extra from holy. A new `healer` AI heals anyone below 60% HP, saves its spells for the undead (or a full mana pool) and otherwise swings the mace. Three class perks: Devout (+3 spell power, +6 mana), Turn Undead (+40% vs undead, level 3+) and Rallying Voice (+2 CHA, which softens the party's morale losses on a trip). Clerics turn up among the recruits; the starting roster is unchanged. Balance (`npm run balance -- 300 fighter,cleric,scout`): fighter, cleric and scout return from floor 2 91% of the time (fighter, scout and mage: 85%). Without a scout to spot ambushes, fighter, cleric and mage do worse (79%).

### As built in M6 (part 2): restocking, fatigue and injuries

> Added 2026-11-20 after Mike played M5: "once you had a group, there wasn't really any need to change it." The goal for the rest of M6 is pressure that makes changing the party worthwhile. Rules in `content/wear.ts` and `content/injuries/`.

- **Restocking.** Potions and bandages a hero used on a trip have to be replaced. After each trip the town shows a *Restock* list: each used item, for whom, from the store room if there's a spare or bought at the Market. Untick anything you don't want, then okay it. Nothing is bought without the okay.
- **Fatigue** (0-100). A trip adds 8 per day and 5 per fight. A day in town takes off 15. At 35 a hero is **tired** (−2 accuracy and evasion, −3 initiative); at 70 **exhausted** (−5 accuracy and evasion, −6 initiative, −2 attack and spell power). Sent down tired: −3 morale. The same party sent to floor 1 every day is tired within a week; a floor-2 trip (about 3 days, 5 fights) tires a hero out in one go.
- **Injuries** are rare and serious (Mike: "injuries that prevent delving"). A hero knocked down in a fight has a 50% chance of coming home injured; one who dropped below a third of their HP, 30%. END lowers both, by 3% a point. Raid defenders can be injured too. **An injured hero can't go down the pit until it heals**, a day at a time in town: broken arm 12 days, cracked ribs 8, concussion 6, twisted ankle 5, deep gash 5. The injury's penalties still apply if they have to defend the town in a raid. Getting injured costs 2 morale.
- **In town:** each hero card has a fatigue bar and lists their injuries with the days left. Launch warnings name tired heroes; an injured hero in the party stops the launch. Trip results show each hero's fatigue and new injuries. Saves are version 6; older saves start everyone rested and whole.

The bot now restocks, keeps a hero on the bench and sends the freshest heroes (`--static` keeps the same party). Over 60 days (40 towns each, building):

| Plan | Trips | Gold from trips | Buildings (of 20) | Level |
|---|---|---|---|---|
| Floor 1, rotating | 58 | 3,900 | 12.4 | 5.0 |
| Floor 1, same party | 47 | 3,250 | 11.2 | 5.0 |
| Floor 2, rotating | 20 | 2,950 | 9.5 | 4.8 |
| Floor 2, same party | 16 | 2,400 | 7.8 | 4.2 |

Rotating gets about a quarter more trips and gold out of the same 60 days. Injuries are rare: about one per town over 60 days on floors 1 to 3.

**Floors that suit different parties.** Encounters can weigh more on particular floors (`weightOn`): spider nests are twice as likely in the Warrens (floor 2), and skeleton patrols dominate the Bone Halls (floor 3, half of all monster groups). Without a scout, floor-2 trips get home 73% of the time instead of 83%. Fighter, cleric and scout do best on floor 3.

**The scouting report.** Under the party, before launch: each monster on the target floor and what share of the monster groups there include it, its weaknesses, what it shrugs off, and whether it ambushes. Monsters nobody in the guild has met show as "???". It warns when this party is a bad fit, for example: "Cave Spiders lie in wait in 29% of the groups here, and nobody in this party scouts well (best 48)", or "Skeletons are in 50% of the groups here and nobody brings crushing or holy damage, which hurts them most". Worked out from content in `src/sim/report.ts`.

**Veterans ask for raises.** Every 3 levels since their last raise talk, a hero asks for 2 more gold a day (Gold heroes ask for 4; `town.raises`). Agree: their wage goes up for good, +5 morale. Refuse: −8 morale, and a Gold hero takes another −6. Ignore it for 3 days and it counts as a no. Strong veterans get expensive, so a cheaper, newer hero can be the better pick.

**The bench.** A Glory hero who was fit to go and was left at home while the party went down loses 3 morale ("left behind while others went down"). Rotating keeps them happy; benching them costs.

Saves stay at version 6 (this all landed before version 6 shipped): heroes get fatigue, injuries and a pay record.

### As built in M6 (part 3): picking classes, haggling, hidden caches and hunting

> Added 2026-11-21 from Mike's notes after M6 part 2: "the starting gear that heroes get feels like choice removal... you hire them and they have stats, but no gear or class. You have to pick. Tavern upgrades change this." Also: the best hero's Appraisal/CHA should cut the Market's take; scouting should find hidden treasure, enough to notice over time; and a "clear the level by %" order.

- **Untrained recruits.** Recruits turn up with stats and a personality, but no class and no gear. Raw stats are 10 ± 2 each, one of them +2, and the Tavern's picks favour recruits whose two best stats are high. On signing, the player picks the class (the card marks the best fit and previews the trained stats). Training adds the class's offset (its base stat − 10) to each raw stat, so a born fighter makes a better fighter than a born mage does. They join empty-handed.
- **A new game** starts with no heroes, 4 free recruits (`town.startingRecruits`) and a store room of basic kit: 2 swords, a short bow, a staff, a mace, chainmail, 2 leather armours, 2 wooden shields, 3 potions and 3 bandages. **Kit out** on a hero card fills in their class's usual kit from the store room first, then buys the rest. **Pick for me** signs all the free recruits as fighter, scout, mage and fighter (`town.startingRoster`), each class going to the recruit who suits it best, and kits them out from the store room.
- **The Tavern** at level 2 sends one recruit a day already trained and kitted, for the hire fee plus the value of their kit.
- **Haggling.** The guild's best haggler raises what the Market pays: +0.2% per point of Appraisal above 50, and +1% per point of CHA above 10, never above 90% (`town.haggle`). A typical starting guild gets 74% for loot instead of 70%; a CHA 16, Appraisal 70 haggler gets 80%. The Market panel says who haggles and the rates; trip results say who haggled.
- **Hidden caches** (`content/secrets/`, rules in `content/searching.ts`). After each room, there's a 15% chance it hides a cache: a miner's cache (floors 1-2), a false floor (1-3) or a sealed niche (2-3, rich loot). The party's best Scouting finds it with chance (Scouting − how well hidden) / 40, at most 90%. A starting scout (Scouting ~70) finds about 40% of floor-1 caches; a party with no scout, about 5%. Nothing is logged for a cache nobody noticed, but the guild's books keep a running tally: caches found, gold from them, and roughly how many were walked past. Over 60 days of floor-1 trips a guild with a scout finds about 30 caches, worth about 1,200 gold (a quarter of its trip income). Caches roll on their own random stream, so they never change the rest of a trip.
- **"Clear the floor" orders.** Standing orders gain *Hunting: thin floor N out by 25/50/75/100%*. After walking the target floor, the party keeps searching side tunnels for monsters until that share of the floor's population (as it was when they arrived) is dead, the floor is empty, or they've hunted 12 extra rooms. Every 4 extra rooms add a day to the trip (`dungeon.hunting`), and retreat orders still apply. It's a trade: a 50% hunt on floor 1 makes trips about 70% longer, earns less gold per day and tires heroes, but keeps the pit quiet. Ignored on rescue runs.

Saves are version 7. Older saves keep their heroes, with no free hires and an empty cache tally.

### Next: porters (Mike, 2026-11-21)

Non-combatants who go down with the party only to carry loot. They don't fight (monsters may still go for them) and they watch and learn: a way to train a class after the intro (§8, §9), for example a porter who has watched enough fights may train as a fighter. On a party wipe they run for it and try to get back to town on their own, a dangerous climb that a good END or DEX helps; the ones who make it bring back what they carry and news of where the party fell.

Still to come in M6+: freeform classes (§9), resurrection, burial and risen heroes (§10), alignment (§7), more buildings, the "holding the pit" opening (§8), more monsters and floors, the 2D watch view and multiple parties.

## 12. First playable slice

Small on purpose. Everything here is data, so adding more later means adding entries, not rewriting code.

**Classes (3)**

| Class | Main stats | Role | Likes |
|---|---|---|---|
| Fighter | STR, END | Front row, soaks hits | Swords, axes, shields |
| Scout | DEX, PER | Scouting + appraisal, ranged | Bows, daggers |
| Mage | INT, WIL | Back row, area damage, medicine | Staves; fire spells |

The Cleric (healer, WIL/CHA) is the obvious 4th class to add next. (Added in M6.)

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
| M3 | Town UI: roster, recruit, equip, formation, launch, watch the log, results screen (built, see §11 "As built in M3") | Actually play a loop in the browser |
| M4 | Time, town and saves: dungeon days, population push-up, pressure map, Guild Hall upgrades and first buildings (Tavern, Blacksmith), pit overflow, raids and the first defences (palisade, gate), save/load (built, see §11 "As built in M4") | Feel the dungeon getting worse over time |
| M5 | Heroes with personalities: morale, motivations, favourite buildings, level-up perks, wipes and recovery runs (built, see §11 "As built in M5") | Play the full design in miniature |
| M6 | Balance pass (wages, the Market's cut, morale that settles), monster stats in the watch view, the Cleric (built, see §11 "As built in M6") | Feel gold get tight and see what you're up against |
| M6+ | Grow content: freeform classes (§9), resurrection, burial and risen heroes (§10), alignment (§7), more buildings, the "holding the pit" opening (§8), more monsters/floors, 2D watch view, multiple parties | Keep growing |

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
| 16 | Classes and levels (later) | Freeform: hero level up to ~50; each level-up goes into a known class of your choice; class levels uncapped. Advanced and combo classes unlock at class-level and stat thresholds (optionally buildings, alignment). Depth rewarded through class-level scaling and milestone perks. Forward only, never swap. Class names are examples only |
| 17 | The fallen (later) | Bodies can be recovered. In town: resurrect (Temple; costs gold, materials and a level or a % of levels, regained as XP is re-earned) or bury (Graveyard). Left in the dungeon, a body rises as an undead version of the hero that later parties can meet |
