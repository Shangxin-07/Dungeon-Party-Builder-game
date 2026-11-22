/**
 * Content guard rails (DESIGN.md §12). Checks a library for broken ids and
 * references, so a growing content library can't quietly break the game.
 * Returns a list of problems; an empty list means the content is good.
 */
import {
  DAMAGE_TYPES,
  DERIVED,
  MORALE_FACTS,
  STATS,
  type MoraleRule,
  type ActiveEffect,
  type Library,
  type PassiveEffect,
  type StatBlock,
} from "../content/types";
import { hasAi } from "./ai";
import { EQUIP_SLOTS } from "./hero";
import { hasRoom } from "./rooms";
import { hasEventEffect } from "./events";
import { hasReaction } from "./reactions";

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_ABILITY_IDS = ["attack"];

export function validateLibrary(lib: Library): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const ids = (kind: string, defs: readonly { id: string }[]) => {
    const seen = new Set<string>();
    for (const d of defs) {
      if (!ID.test(d.id)) err(`${kind} "${d.id}": id must be kebab-case`);
      if (seen.has(d.id)) err(`${kind} "${d.id}": duplicate id`);
      seen.add(d.id);
    }
    return seen;
  };
  const classIds = ids("class", lib.classes);
  const itemIds = ids("item", lib.items);
  const abilityIds = ids("ability", lib.abilities);
  const statusIds = ids("status", lib.statuses);
  const monsterIds = ids("monster", lib.monsters);
  const skillIds = ids("skill", lib.skills);
  ids("perk", lib.perks);
  ids("encounter", lib.encounters);
  const lootIds = ids("loot table", lib.lootTables);
  const roomIds = ids("room", lib.rooms);
  ids("floor", lib.floors);

  const stats = (where: string, block: StatBlock, max: number) => {
    for (const s of STATS) {
      const v = block[s];
      if (!Number.isInteger(v) || v < 1 || v > max)
        err(`${where}: ${s} must be a whole number 1-${max}, got ${v}`);
    }
  };
  const passives = (where: string, list: readonly PassiveEffect[] = []) => {
    for (const p of list) {
      if (p.type === "modifyStat" && ![...STATS, ...DERIVED].includes(p.stat as never))
        err(`${where}: unknown stat "${p.stat}"`);
      if (p.type === "modifySkill" && !skillIds.has(p.skill))
        err(`${where}: unknown skill "${p.skill}"`);
      if (p.type === "resist" && !DAMAGE_TYPES.includes(p.damageType))
        err(`${where}: unknown damage type "${p.damageType}"`);
    }
  };
  const actives = (where: string, list: readonly ActiveEffect[] = []) => {
    for (const e of list) {
      if (e.type === "applyStatus" && !statusIds.has(e.status))
        err(`${where}: unknown status "${e.status}"`);
      if (e.type === "summon" && !monsterIds.has(e.monster))
        err(`${where}: unknown monster "${e.monster}"`);
      if (e.type === "dealDamage" && !DAMAGE_TYPES.includes(e.damageType))
        err(`${where}: unknown damage type "${e.damageType}"`);
    }
  };

  for (const c of lib.classes) {
    const w = `class "${c.id}"`;
    const kind = c.kind ?? "base";
    if (!["base", "advanced", "combo", "camp"].includes(kind)) err(`${w}: unknown kind "${kind}"`);
    if (kind === "base" || kind === "camp") {
      if (c.baseStats) stats(w, c.baseStats, 20);
      else err(`${w}: base and camp classes need baseStats`);
    } else {
      if (c.baseStats) err(`${w}: only base classes have baseStats`);
      const need = Object.keys(c.requires?.classLevels ?? {}).length;
      if (kind === "advanced" && need !== 1)
        err(`${w}: an advanced class grows out of exactly one class (requires.classLevels)`);
      if (kind === "combo" && need < 2)
        err(`${w}: a combo class needs two or more classes in requires.classLevels`);
    }
    for (const [id, level] of Object.entries(c.requires?.classLevels ?? {})) {
      if (!classIds.has(id)) err(`${w}: requires unknown class "${id}"`);
      if (id === c.id) err(`${w}: can't require itself`);
      if (!Number.isInteger(level) || level < 1)
        err(`${w}: required class levels must be 1 or more`);
    }
    for (const [s, v] of Object.entries(c.requires?.stats ?? {})) {
      if (!STATS.includes(s as never)) err(`${w}: requires unknown stat "${s}"`);
      if (!Number.isInteger(v) || v! < 1 || v! > 30) err(`${w}: required ${s} must be 1-30`);
    }
    for (const a of c.requires?.alignments ?? [])
      if (!lib.alignments.some((x) => x.id === a)) err(`${w}: requires unknown alignment "${a}"`);
    if (c.requires?.building && !lib.buildings.some((b) => b.id === c.requires!.building))
      err(`${w}: requires unknown building "${c.requires.building}"`);
    passives(`${w} perLevel`, c.perLevel);
    for (const [lvl, list] of Object.entries(c.milestones ?? {})) {
      if (!Number.isInteger(Number(lvl)) || Number(lvl) < 2)
        err(`${w}: milestone levels must be whole numbers, 2 or more`);
      if (!list.length) err(`${w}: milestone ${lvl} offers no perks`);
      for (const p of list) {
        const perk = lib.perks.find((x) => x.id === p);
        if (!perk) err(`${w}: unknown milestone perk "${p}"`);
        else if (perk.classes.length && !perk.classes.includes(c.id))
          err(`${w}: milestone perk "${p}" is for another class`);
      }
    }
    if (!c.mainStats.length) err(`${w}: needs at least one main stat`);
    for (const s of c.mainStats) if (!STATS.includes(s)) err(`${w}: unknown main stat "${s}"`);
    if (!hasAi(c.ai)) err(`${w}: unknown AI "${c.ai}"`);
    for (const [a, level] of Object.entries(c.abilities)) {
      if (!abilityIds.has(a)) err(`${w}: unknown ability "${a}"`);
      if (!Number.isInteger(level) || level < 1)
        err(`${w}: ability "${a}" needs a level of 1 or more`);
    }
    for (const [s, v] of Object.entries(c.growth)) {
      if (!STATS.includes(s as never)) err(`${w}: growth in unknown stat "${s}"`);
      if (!Number.isInteger(v) || v < 0) err(`${w}: growth must be whole numbers, 0 or more`);
    }
    if (!lib.perks.some((p) => !p.classes.length || p.classes.includes(c.id)))
      err(`${w}: no perks can ever be offered to it`);
    const slots = new Set<string>();
    for (const i of c.startingKit) {
      const item = lib.items.find((x) => x.id === i);
      if (!item) {
        err(`${w}: unknown starting item "${i}"`);
        continue;
      }
      if ((EQUIP_SLOTS as readonly string[]).includes(item.slot)) {
        if (slots.has(item.slot)) err(`${w}: two starting items for the ${item.slot} slot`);
        slots.add(item.slot);
      }
    }
  }

  for (const i of lib.items) {
    const w = `item "${i.id}"`;
    if (i.slot === "weapon" && !i.damageType) err(`${w}: weapons need a damageType`);
    if (i.slot === "consumable" && !i.use?.length) err(`${w}: consumables need a "use"`);
    if (i.slot === "material" && (i.passives?.length || i.use?.length || i.valueRange))
      err(`${w}: materials have a fixed value and nothing to equip or use`);
    if (i.value < 0) err(`${w}: value can't be negative`);
    if (i.valueRange && (i.valueRange[0] < 0 || i.valueRange[1] < i.valueRange[0]))
      err(`${w}: bad valueRange`);
    if (i.size !== undefined && (!Number.isInteger(i.size) || i.size < 1))
      err(`${w}: size must be a whole number of at least 1`);
    passives(w, i.passives);
    actives(w, i.use);
    if (i.abilities?.length && i.slot !== "weapon" && i.slot !== "offhand")
      err(`${w}: only weapons and offhands can grant abilities`);
    for (const a of i.abilities ?? []) if (!abilityIds.has(a)) err(`${w}: unknown ability "${a}"`);
  }

  for (const a of lib.abilities) {
    const w = `ability "${a.id}"`;
    if (RESERVED_ABILITY_IDS.includes(a.id))
      err(`${w}: "${a.id}" is reserved for the basic attack`);
    if (!a.effects.length) err(`${w}: needs at least one effect`);
    for (const k of ["cooldown", "perFight"] as const) {
      const v = a[k];
      if (v !== undefined && (!Number.isInteger(v) || v < 1))
        err(`${w}: ${k} must be a whole number of at least 1`);
    }
    actives(w, a.effects);
  }

  for (const s of lib.statuses) {
    passives(`status "${s.id}"`, s.passives);
    actives(`status "${s.id}"`, s.perTurn);
  }

  for (const m of lib.monsters) {
    const w = `monster "${m.id}"`;
    stats(w, m.stats, 30);
    if (m.power <= 0) err(`${w}: power must be positive`);
    if (!hasAi(m.ai)) err(`${w}: unknown AI "${m.ai}"`);
    for (const [a, level] of Object.entries(m.abilities ?? {})) {
      if (!abilityIds.has(a)) err(`${w}: unknown ability "${a}"`);
      if (!(level >= 1)) err(`${w}: ability "${a}" needs a level of 1 or more`);
    }
    if (m.variant) {
      const base = lib.monsters.find((x) => x.id === m.variant!.of);
      if (!base) err(`${w}: variant of unknown monster "${m.variant.of}"`);
      else if (base.variant) err(`${w}: can't be a variant of a variant`);
      if (!(m.variant.chance > 0 && m.variant.chance <= 1))
        err(`${w}: variant chance must be above 0 and at most 1`);
    }
    passives(w, m.passives);
    for (const t of m.triggers ?? []) actives(w, t.effects);
    if (m.loot && !lootIds.has(m.loot)) err(`${w}: unknown loot table "${m.loot}"`);
  }

  for (const p of lib.perks) {
    for (const c of p.classes) if (!classIds.has(c)) err(`perk "${p.id}": unknown class "${c}"`);
    passives(`perk "${p.id}"`, p.passives);
    for (const a of p.abilities ?? [])
      if (!abilityIds.has(a)) err(`perk "${p.id}": unknown ability "${a}"`);
    if (!p.passives.length && !p.abilities?.length)
      err(`perk "${p.id}": needs at least one passive or ability`);
  }

  ids("injury", lib.injuries);
  for (const i of lib.injuries) {
    passives(`injury "${i.id}"`, i.passives);
    if (i.days < 1) err(`injury "${i.id}": days must be at least 1`);
    if (i.weight <= 0) err(`injury "${i.id}": weight must be positive`);
  }
  const wear = lib.wear;
  if (wear.fatiguePerTripDay < 0 || wear.fatiguePerFight < 0 || wear.restPerDay <= 0)
    err("wear: fatigue rates can't be negative, and rest must take some away");
  wear.tiers.forEach((tier, n) => {
    passives(`wear tier "${tier.name}"`, tier.passives);
    if (n && tier.at <= wear.tiers[n - 1]!.at) err("wear: tiers must go up in order");
  });
  for (const k of ["injuryChance", "woundedInjuryChance"] as const)
    if (wear[k] < 0 || wear[k] > 1) err(`wear: ${k} must be 0-1`);

  const porters = lib.town.porters;
  if (porters.hireCost < 0 || porters.wage < 0 || porters.slots < 0)
    err("town: porter costs and slots can't be negative");
  if (porters.xpShare < 0 || porters.xpShare > 1) err("town: porters.xpShare must be 0-1");
  const hunting = lib.dungeon.hunting;
  if (hunting.maxRooms < 0) err("dungeon: hunting maxRooms can't be negative");
  const time = lib.time;
  for (const k of ["stairs", "cagePerFloor", "room", "cache", "hunt", "climbPerFloor"] as const)
    if (!(time[k] >= 0)) err(`time: ${k} can't be negative`);
  if (time.startHour < 0 || time.startHour >= 24) err("time: startHour must be 0-23");
  if (!(time.awakeHours > 0) || !(time.campHours > 0))
    err("time: awakeHours and campHours must be positive");
  if (time.fight.hours < 0 || time.fight.freeRounds < 0 || time.fight.perRound < 0)
    err("time: fight hours can't be negative");
  for (const [id, h] of Object.entries(time.behaviours))
    if (!(h >= 0)) err(`time: behaviour "${id}" can't take negative hours`);
  for (const r of lib.rooms)
    if (r.hours !== undefined && !(r.hours >= 0)) err(`room "${r.id}": hours can't be negative`);
  ids("secret", lib.secrets);
  for (const x of lib.secrets) {
    const w = `secret "${x.id}"`;
    if (x.floors[0] < 1 || x.floors[1] < x.floors[0]) err(`${w}: bad floor range`);
    if (x.weight <= 0) err(`${w}: weight must be positive`);
    if (!lootIds.has(x.loot)) err(`${w}: unknown loot table "${x.loot}"`);
  }
  const search = lib.searching;
  if (search.chancePerRoom < 0 || search.chancePerRoom > 1)
    err("searching: chancePerRoom must be 0-1");
  if (search.spread <= 0) err("searching: spread must be positive");
  if (search.maxChance < 0 || search.maxChance > 1) err("searching: maxChance must be 0-1");

  for (const e of lib.encounters) {
    const w = `encounter "${e.id}"`;
    const [lo, hi] = e.floors;
    if (lo < 1 || hi < lo) err(`${w}: bad floor range [${lo}, ${hi}]`);
    for (const v of Object.values(e.weightOn ?? {}))
      if (v <= 0) err(`${w}: weightOn weights must be positive`);
    if (e.weight <= 0) err(`${w}: weight must be positive`);
    if (!e.groups.length) err(`${w}: needs at least one group`);
    for (const g of e.groups) {
      if (!monsterIds.has(g.monster)) err(`${w}: unknown monster "${g.monster}"`);
      else if (lib.monsters.find((m) => m.id === g.monster)?.summonOnly)
        err(`${w}: "${g.monster}" is summon-only`);
      else if (lib.monsters.find((m) => m.id === g.monster)?.variant)
        err(`${w}: "${g.monster}" is a variant; it turns up in place of the monster it's based on`);
      if (g.count[0] < 1 || g.count[1] < g.count[0]) err(`${w}: bad count for "${g.monster}"`);
    }
  }

  for (const t of lib.lootTables) {
    const w = `loot table "${t.id}"`;
    if (t.rolls[0] < 0 || t.rolls[1] < t.rolls[0]) err(`${w}: bad rolls`);
    if (!t.entries.length) err(`${w}: needs at least one entry`);
    for (const e of t.entries) {
      if (e.item !== null && !itemIds.has(e.item)) err(`${w}: unknown item "${e.item}"`);
      if (e.weight <= 0) err(`${w}: weights must be positive`);
    }
  }

  for (const r of lib.rooms) {
    const w = `room "${r.id}"`;
    if (!hasRoom(r.behaviour)) err(`${w}: unknown behaviour "${r.behaviour}"`);
    if (r.floors[0] < 1 || r.floors[1] < r.floors[0]) err(`${w}: bad floor range`);
    if (r.weight <= 0) err(`${w}: weight must be positive`);
    if (!r.descriptions.length) err(`${w}: needs at least one description`);
    if (r.behaviour === "trap" && !r.trap) err(`${w}: trap rooms need a trap`);
    if (r.behaviour === "rest" && !r.rest) err(`${w}: rest rooms need rest settings`);
    if (r.behaviour === "treasure" && !r.loot) err(`${w}: treasure rooms need a loot table`);
    if (r.loot && !lootIds.has(r.loot)) err(`${w}: unknown loot table "${r.loot}"`);
    if (r.trap && (r.trap.damage[0] < 0 || r.trap.damage[1] < r.trap.damage[0]))
      err(`${w}: bad trap damage`);
    if (r.trap && !DAMAGE_TYPES.includes(r.trap.damageType))
      err(`${w}: unknown damage type "${r.trap.damageType}"`);
  }

  const depths = new Set<number>();
  for (const f of lib.floors) {
    const w = `floor "${f.id}"`;
    if (depths.has(f.depth)) err(`${w}: two floors at depth ${f.depth}`);
    depths.add(f.depth);
    if (f.rooms[0] < 1 || f.rooms[1] < f.rooms[0]) err(`${w}: bad room count`);
    if (f.capacity < 1) err(`${w}: capacity must be at least 1`);
    if (f.startPopulation < 0 || f.startPopulation > f.capacity)
      err(`${w}: startPopulation must be between 0 and capacity`);
    if (f.evictedLevelDrop !== undefined && !(f.evictedLevelDrop >= 0))
      err(`${w}: evictedLevelDrop must be 0 or more`);
    for (const id of f.fixedRooms ?? []) if (!roomIds.has(id)) err(`${w}: unknown room "${id}"`);
    if (!lib.rooms.some((r) => f.depth >= r.floors[0] && f.depth <= r.floors[1]))
      err(`${w}: no rooms can appear at depth ${f.depth}`);
    if (!lib.encounters.some((e) => f.depth >= e.floors[0] && f.depth <= e.floors[1]))
      err(`${w}: no encounters for depth ${f.depth}`);
  }
  for (let d = 1; d <= depths.size; d++) if (!depths.has(d)) err(`floors: depth ${d} is missing`);

  // Material costs (DESIGN.md §8) name materials, in whole amounts.
  const materialIds = new Set(lib.items.filter((i) => i.slot === "material").map((i) => i.id));
  const materialCost = (w: string, cost: Readonly<Record<string, number>> | undefined) => {
    for (const [id, n] of Object.entries(cost ?? {})) {
      if (!materialIds.has(id)) err(`${w}: "${id}" isn't a material`);
      if (!Number.isInteger(n) || n < 1) err(`${w}: needs a whole number of "${id}", 1 or more`);
    }
  };

  // Posts and the opening (DESIGN.md §8).
  ids("post", lib.posts ?? []);
  for (const p of lib.posts ?? []) {
    const w = `post "${p.id}"`;
    if (!Number.isInteger(p.slots) || p.slots < 1)
      err(`${w}: slots must be a whole number, 1 or more`);
    if (!p.effects.length) err(`${w}: needs at least one effect`);
    for (const e of p.effects) {
      if (e.type === "gather") {
        if (!lootIds.has(e.loot)) err(`${w}: unknown loot table "${e.loot}"`);
        if (!Number.isInteger(e.rolls) || e.rolls < 1) err(`${w}: gather rolls must be 1 or more`);
      } else if (e.type === "raidWarning" ? e.days < 1 : e.amount < 0) err(`${w}: bad ${e.type}`);
    }
  }
  if (lib.town.raidSpoils && !lootIds.has(lib.town.raidSpoils))
    err(`town: unknown raidSpoils loot table "${lib.town.raidSpoils}"`);
  const op = lib.opening;
  if (op) {
    for (const id of [...op.startingStash, ...op.heldStash])
      if (!lib.items.some((i) => i.id === id)) err(`opening: unknown starting item "${id}"`);
    for (const id of [...op.unbuilt, ...Object.keys(op.unlock)])
      if (!lib.buildings.some((b) => b.id === id)) err(`opening: unknown building "${id}"`);
    for (const [id, level] of Object.entries(op.unlock)) {
      const b = lib.buildings.find((x) => x.id === id);
      if (b && (level < 1 || level > b.levels.length))
        err(`opening: "${id}" has no level ${level}`);
    }
    if (op.campRoster < 1) err("opening: campRoster must be 1 or more");
    const camp = lib.classes.find((c) => c.id === op.campClass);
    if (camp?.kind !== "camp") err(`opening: campClass "${op.campClass}" must be a camp class`);
    op.trades.forEach((d, i) => {
      materialCost(`opening trade ${i + 1} give`, d.give);
      materialCost(`opening trade ${i + 1} get`, d.get);
    });
  }

  ids("building", lib.buildings);
  for (const b of lib.buildings) {
    const w = `building "${b.id}"`;
    if (!b.levels.length) err(`${w}: needs at least one level`);
    if (b.startLevel < 0 || b.startLevel > b.levels.length) err(`${w}: bad start level`);
    b.levels.forEach((lvl, i) => {
      if (lvl.cost < 0) err(`${w} level ${i + 1}: negative cost`);
      if (!(lvl.days >= 0)) err(`${w} level ${i + 1}: days must be 0 or more`);
      materialCost(`${w} level ${i + 1}`, lvl.materials);
      for (const e of lvl.effects) {
        if (e.type === "sells") {
          for (const id of e.items) if (!itemIds.has(id)) err(`${w}: sells unknown item "${id}"`);
        } else if (e.type === "raidWarning") {
          if (e.days < 1) err(`${w} level ${i + 1}: raidWarning needs at least 1 day`);
        } else if (e.type === "resurrect") {
          if (e.gold < 0 || e.goldPerLevel < 0 || e.levels < 0 || e.percent < 0)
            err(`${w} level ${i + 1}: resurrect costs can't be negative`);
          if (e.percent > 100) err(`${w} level ${i + 1}: resurrect percent must be 0-100`);
          materialCost(`${w} level ${i + 1} resurrect`, e.materials);
        } else if (e.type === "burial") {
          if (e.gold < 0) err(`${w} level ${i + 1}: burial can't cost negative gold`);
        } else if (e.type === "lift") {
          if (!(e.floors >= 1)) err(`${w} level ${i + 1}: lift needs at least 1 floor`);
        } else if (e.amount < 0) err(`${w} level ${i + 1}: negative ${e.type}`);
      }
    });
  }
  for (const want of ["partySlots", "rosterSize"] as const) {
    const has = lib.buildings.some((b) =>
      b.levels[b.startLevel - 1]?.effects.some((e) => e.type === want && e.amount > 0),
    );
    if (!has) err(`buildings: the starting town has no ${want}`);
  }

  // Morale and motivations (DESIGN.md §6).
  ids("motivation", lib.motivations);
  const buildingIds = new Set(lib.buildings.map((b) => b.id));
  const facts = new Set<string>(MORALE_FACTS);
  const rules = (where: string, list: readonly MoraleRule[]) => {
    for (const r of list) {
      if (!facts.has(r.fact)) err(`${where}: unknown morale fact "${r.fact}"`);
      if (r.per !== undefined && r.per <= 0) err(`${where}: "per" must be above 0`);
      if (r.cap !== undefined && r.cap <= 0) err(`${where}: "cap" must be above 0`);
      if (r.below !== undefined && r.above !== undefined && r.above >= r.below)
        err(`${where}: a rule with "above" and "below" can never apply`);
      if (!r.reason) err(`${where}: every morale rule needs a reason`);
    }
  };
  if (!lib.motivations.length) err("motivations: need at least one");
  ids("alignment", lib.alignments);
  if (!lib.alignments.length) err("needs at least one alignment");
  const positions = new Set<number>();
  for (const a of lib.alignments) {
    const w = `alignment "${a.id}"`;
    if (!Number.isInteger(a.position)) err(`${w}: position must be a whole number of steps`);
    if (positions.has(a.position)) err(`${w}: another alignment has the same position`);
    positions.add(a.position);
    if (a.weight <= 0) err(`${w}: weight must be positive`);
    rules(w, a.rules);
  }

  // Alignment in the dungeon and in town (DESIGN.md §7).
  const alignIds = new Set(lib.alignments.map((a) => a.id));
  const partyAligns = new Set([...alignIds, "divided"]);
  for (const m of lib.monsters) {
    const w = `monster "${m.id}"`;
    for (const r of m.reactions ?? []) {
      if (!hasReaction(r.reaction)) err(`${w}: unknown reaction "${r.reaction}"`);
      if (!(r.chance > 0 && r.chance <= 1)) err(`${w}: reaction chance must be above 0, at most 1`);
      if (!r.to.length) err(`${w}: reaction "${r.reaction}" applies to no alignment`);
      for (const a of r.to) if (!partyAligns.has(a)) err(`${w}: reaction to unknown "${a}"`);
    }
    for (const t of m.hunts ?? [])
      if (t.startsWith("align:") && !alignIds.has(t.slice(6)))
        err(`${w}: hunts unknown alignment "${t.slice(6)}"`);
  }
  for (const b of lib.buildings)
    for (const a of b.dealsWith ?? [])
      if (!alignIds.has(a)) err(`building "${b.id}": deals with unknown alignment "${a}"`);
  ids("event", lib.events ?? []);
  for (const e of lib.events ?? []) {
    const w = `event "${e.id}"`;
    if (e.floors[0] < 1 || e.floors[1] < e.floors[0]) err(`${w}: bad floor range`);
    if (e.weight <= 0) err(`${w}: weight must be positive`);
    if (!e.intro) err(`${w}: needs an intro`);
    for (const a of alignIds) if (!e.outcomes[a]) err(`${w}: no outcome for a ${a} party`);
    for (const [key, o] of Object.entries(e.outcomes)) {
      if (!partyAligns.has(key)) err(`${w}: outcome for unknown alignment "${key}"`);
      if (!o.text) err(`${w}: the ${key} outcome needs text`);
      for (const x of o.effects) {
        if (!hasEventEffect(x.type)) err(`${w}: unknown effect "${x.type}"`);
        if (x.chance !== undefined && !(x.chance > 0 && x.chance <= 1))
          err(`${w}: effect chance must be above 0, at most 1`);
        if (x.type === "loot" && !lootIds.has(x.table))
          err(`${w}: unknown loot table "${x.table}"`);
        if (x.type === "hurt") {
          if (x.damage[0] < 0 || x.damage[1] < x.damage[0]) err(`${w}: bad hurt damage`);
          if (!DAMAGE_TYPES.includes(x.damageType))
            err(`${w}: unknown damage type "${x.damageType}"`);
        }
        if (x.type === "gift" && (x.gold[0] < 0 || x.gold[1] < x.gold[0]))
          err(`${w}: bad gift gold`);
        if (x.type === "healParty" && !(x.percent > 0)) err(`${w}: healParty needs a percent`);
      }
    }
  }
  for (const r of lib.rooms)
    if (r.behaviour === "event") {
      const any = (lib.events ?? []).some(
        (e) => e.floors[0] <= r.floors[1] && r.floors[0] <= e.floors[1],
      );
      if (!any) err(`room "${r.id}": no events can happen on its floors`);
    }

  for (const m of lib.motivations) {
    const w = `motivation "${m.id}"`;
    if (m.weight <= 0) err(`${w}: weight must be positive`);
    rules(w, m.rules);
    if (!m.favourites.length) err(`${w}: needs at least one favourite building`);
    for (const f of m.favourites) {
      if (!buildingIds.has(f.building)) err(`${w}: unknown building "${f.building}"`);
      if (f.weight <= 0) err(`${w}: favourite weights must be positive`);
    }
    const chance = m.lowMorale?.refuseRetreat;
    if (chance !== undefined && (chance < 0 || chance > 1))
      err(`${w}: refuseRetreat must be between 0 and 1`);
  }
  const mo = lib.morale;
  rules("morale", mo.rules);
  if (mo.start[0] < 1 || mo.start[1] > 100 || mo.start[1] < mo.start[0])
    err("morale: start must be a range within 1-100");
  if (mo.low < 0 || mo.low > 100) err("morale: low must be 0-100");
  if (mo.dislikeChance < 0 || mo.dislikeChance > 1) err("morale: dislikeChance must be 0-1");
  if (mo.contentAbove.gainShare < 0 || mo.contentAbove.gainShare > 1)
    err("morale: contentAbove.gainShare must be 0-1");

  const lv = lib.levels;
  if (lv.maxLevel < 1) err("levels: maxLevel must be at least 1");
  if (lv.xpBase <= 0 || lv.xpGrowth <= 0) err("levels: the XP curve must go up");
  if (lv.raidXpShare < 0) err("levels: raidXpShare can't be negative");
  if (lv.perkOffers < 1) err("levels: perkOffers must be at least 1");
  if (lv.freeStatEvery < 1) err("levels: freeStatEvery must be at least 1");
  if (lv.wantChance < 0 || lv.wantChance > 1) err("levels: wantChance must be 0-1");

  const rs = lib.rescue;
  for (const k of ["survival", "scavengeChance", "carryChance"] as const)
    if (rs[k] < 0 || rs[k] > 1) err(`rescue: ${k} must be 0-1`);
  if (rs.windowDays < 1) err("rescue: windowDays must be at least 1");
  if (rs.rescuedHpPercent <= 0 || rs.rescuedHpPercent > 100)
    err("rescue: rescuedHpPercent must be 1-100");
  if (!(rs.overdueDays >= 1 && rs.lostDays >= rs.overdueDays && rs.giveUpDays > rs.lostDays))
    err("rescue: needs 1 <= overdueDays <= lostDays < giveUpDays");
  const hu = rs.holeUp;
  if (hu.baseDays < 1 || hu.maxDays < hu.baseDays) err("rescue: holeUp days must be 1 or more");
  for (const k of ["foundChance", "slipMax"] as const) {
    const v = k === "foundChance" ? hu.foundChance : rs.slipMax;
    if (v < 0 || v > 1) err(`rescue: ${k} must be 0-1`);
  }
  if (rs.rescuePace <= 0 || rs.rescuePace > 1) err("rescue: rescuePace must be above 0, at most 1");

  // The fallen (DESIGN.md §10).
  ids("transform", lib.transforms);
  const fa = lib.fallen;
  if (!lib.transforms.some((x) => x.id === fa.transform))
    err(`fallen: unknown transform "${fa.transform}"`);
  for (const k of ["meetChance", "recogniseBase"] as const)
    if (fa[k] < 0 || fa[k] > 1) err(`fallen: ${k} must be 0-1`);
  if (fa.riseDays < 1) err("fallen: riseDays must be at least 1");
  if (fa.climbDays < 1) err("fallen: climbDays must be at least 1");
  if (fa.resurrectedHpPercent <= 0 || fa.resurrectedHpPercent > 100)
    err("fallen: resurrectedHpPercent must be 1-100");
  for (const x of lib.transforms) {
    const w = `transform "${x.id}"`;
    if (x.hpPercent <= 0) err(`${w}: hpPercent must be above 0`);
    if (!x.suffix) err(`${w}: needs a suffix for the name`);
    if (x.ai && !hasAi(x.ai)) err(`${w}: unknown AI "${x.ai}"`);
  }

  const t = lib.town;
  for (const id of t.startingRoster) {
    const c = lib.classes.find((x) => x.id === id);
    if (!c) err(`town: unknown class "${id}"`);
    else if ((c.kind ?? "base") !== "base") err(`town: starting class "${id}" isn't a base class`);
  }
  if (t.startingRecruits < 1) err("town: startingRecruits must be at least 1");
  if (t.haggle.perAppraisal < 0 || t.haggle.perCha < 0) err("town: haggle rates can't be negative");
  if (t.haggle.max < 0 || t.haggle.max > 1) err("town: haggle.max must be 0-1");
  for (const id of t.startingStash) if (!itemIds.has(id)) err(`town: unknown item "${id}"`);
  if (t.sellRate < 0 || t.sellRate > 1) err("town: sellRate must be between 0 and 1");
  if (t.haulRate < 0 || t.haulRate > 1) err("town: haulRate must be between 0 and 1");
  if (t.wages.base < 0 || t.wages.perLevel < 0) err("town: wages can't be negative");
  if (t.restPercent <= 0) err("town: restPercent must be above 0");
  if (t.hireCost < 0 || t.startingGold < 0) err("town: costs can't be negative");
  if (t.repairRate < 0) err("town: repairRate can't be negative");

  const d = lib.dungeon;
  if (d.spawnPerDay < 0 || d.spawnGrowthPerDay < 0) err("dungeon: spawn rates can't be negative");
  if (d.evictedLevelDrop < 0 || d.settlePerDay < 0) err("dungeon: level drift can't be negative");
  const r = d.raids;
  if (r.powerPerStrength <= 0) err("dungeon: raids.powerPerStrength must be above 0");
  if (r.strengthPerDamage <= 0) err("dungeon: raids.strengthPerDamage must be above 0");
  if (r.maxDefenders < 1) err("dungeon: raids.maxDefenders must be at least 1");

  return errors;
}
