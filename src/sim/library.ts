/**
 * Fast lookups into the content library. The sim never imports content files
 * directly: callers pass a Library in, so tests can run with made-up content.
 */
import type {
  AbilityDef,
  BuildingDef,
  ClassDef,
  EncounterDef,
  FloorDef,
  InjuryDef,
  ItemDef,
  Library,
  LootTableDef,
  MonsterDef,
  MotivationDef,
  PerkDef,
  RoomDef,
  SkillDef,
  StatusDef,
} from "../content/types";

export interface Index {
  readonly lib: Library;
  cls(id: string): ClassDef;
  item(id: string): ItemDef;
  ability(id: string): AbilityDef;
  status(id: string): StatusDef;
  monster(id: string): MonsterDef;
  skill(id: string): SkillDef;
  perk(id: string): PerkDef;
  encounter(id: string): EncounterDef;
  lootTable(id: string): LootTableDef;
  room(id: string): RoomDef;
  building(id: string): BuildingDef;
  motivation(id: string): MotivationDef;
  injury(id: string): InjuryDef;
  /** The floor at this depth. */
  floor(depth: number): FloorDef;
}

const cache = new WeakMap<Library, Index>();

function table<T extends { id: string }>(kind: string, defs: readonly T[]): (id: string) => T {
  const map = new Map(defs.map((d) => [d.id, d]));
  return (id) => {
    const def = map.get(id);
    if (!def) throw new Error(`Unknown ${kind} id "${id}"`);
    return def;
  };
}

/** Build (or reuse) the lookup tables for a library. */
export function indexLibrary(lib: Library): Index {
  let index = cache.get(lib);
  if (!index) {
    index = {
      lib,
      cls: table("class", lib.classes),
      item: table("item", lib.items),
      ability: table("ability", lib.abilities),
      status: table("status", lib.statuses),
      monster: table("monster", lib.monsters),
      skill: table("skill", lib.skills),
      perk: table("perk", lib.perks),
      encounter: table("encounter", lib.encounters),
      lootTable: table("loot table", lib.lootTables),
      room: table("room", lib.rooms),
      building: table("building", lib.buildings),
      motivation: table("motivation", lib.motivations),
      injury: table("injury", lib.injuries),
      floor: (depth) => {
        const f = lib.floors.find((x) => x.depth === depth);
        if (!f) throw new Error(`No floor defined at depth ${depth}`);
        return f;
      },
    };
    cache.set(lib, index);
  }
  return index;
}
