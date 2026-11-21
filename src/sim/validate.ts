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
    stats(w, c.baseStats, 20);
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
    for (const a of m.abilities ?? []) if (!abilityIds.has(a)) err(`${w}: unknown ability "${a}"`);
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
    for (const id of f.fixedRooms ?? []) if (!roomIds.has(id)) err(`${w}: unknown room "${id}"`);
    if (!lib.rooms.some((r) => f.depth >= r.floors[0] && f.depth <= r.floors[1]))
      err(`${w}: no rooms can appear at depth ${f.depth}`);
    if (!lib.encounters.some((e) => f.depth >= e.floors[0] && f.depth <= e.floors[1]))
      err(`${w}: no encounters for depth ${f.depth}`);
  }
  for (let d = 1; d <= depths.size; d++) if (!depths.has(d)) err(`floors: depth ${d} is missing`);

  ids("building", lib.buildings);
  for (const b of lib.buildings) {
    const w = `building "${b.id}"`;
    if (!b.levels.length) err(`${w}: needs at least one level`);
    if (b.startLevel < 0 || b.startLevel > b.levels.length) err(`${w}: bad start level`);
    b.levels.forEach((lvl, i) => {
      if (lvl.cost < 0) err(`${w} level ${i + 1}: negative cost`);
      if (!(lvl.days >= 0)) err(`${w} level ${i + 1}: days must be 0 or more`);
      for (const e of lvl.effects) {
        if (e.type === "sells") {
          for (const id of e.items) if (!itemIds.has(id)) err(`${w}: sells unknown item "${id}"`);
        } else if (e.type === "raidWarning") {
          if (e.days < 1) err(`${w} level ${i + 1}: raidWarning needs at least 1 day`);
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

  const t = lib.town;
  for (const id of t.startingRoster) if (!classIds.has(id)) err(`town: unknown class "${id}"`);
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
