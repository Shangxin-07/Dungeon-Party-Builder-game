/**
 * Content guard rails (DESIGN.md §12). Checks a library for broken ids and
 * references, so a growing content library can't quietly break the game.
 * Returns a list of problems; an empty list means the content is good.
 */
import {
  DAMAGE_TYPES,
  DERIVED,
  STATS,
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
    for (const a of c.abilities) if (!abilityIds.has(a)) err(`${w}: unknown ability "${a}"`);
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
  }

  for (const a of lib.abilities) {
    const w = `ability "${a.id}"`;
    if (RESERVED_ABILITY_IDS.includes(a.id))
      err(`${w}: "${a.id}" is reserved for the basic attack`);
    if (!a.effects.length) err(`${w}: needs at least one effect`);
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
  }

  for (const e of lib.encounters) {
    const w = `encounter "${e.id}"`;
    const [lo, hi] = e.floors;
    if (lo < 1 || hi < lo) err(`${w}: bad floor range [${lo}, ${hi}]`);
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
      for (const e of lvl.effects) {
        if (e.type === "sells") {
          for (const id of e.items) if (!itemIds.has(id)) err(`${w}: sells unknown item "${id}"`);
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

  const t = lib.town;
  for (const id of t.startingRoster) if (!classIds.has(id)) err(`town: unknown class "${id}"`);
  for (const id of t.startingStash) if (!itemIds.has(id)) err(`town: unknown item "${id}"`);
  if (t.sellRate < 0 || t.sellRate > 1) err("town: sellRate must be between 0 and 1");
  if (t.restPercent <= 0) err("town: restPercent must be above 0");
  if (t.hireCost < 0 || t.startingGold < 0) err("town: costs can't be negative");

  return errors;
}
