/**
 * Fast lookups into the content library. The sim never imports content files
 * directly: callers pass a Library in, so tests can run with made-up content.
 */
import type {
  AbilityDef,
  ClassDef,
  EncounterDef,
  ItemDef,
  Library,
  MonsterDef,
  PerkDef,
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
    };
    cache.set(lib, index);
  }
  return index;
}
