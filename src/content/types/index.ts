/**
 * Content definition types. Game content (classes, monsters, items, ...) is
 * plain data checked against these types. The engine reads definitions by id
 * and never special-cases a particular class or monster. See docs/DESIGN.md §12.
 *
 * One file per area: core.ts (stats, effects), defs.ts (classes, items,
 * abilities, monsters, perks...), morale.ts, heroes.ts (levels, injuries, the
 * fallen), dungeon.ts (rooms, floors, raids), town.ts (buildings), library.ts
 * (the whole Library and the define* helpers).
 */
export { STATS, DERIVED, DAMAGE_TYPES } from "./core";
export type {
  Stat,
  StatBlock,
  Derived,
  DamageType,
  Row,
  PassiveEffect,
  ActiveEffect,
  Effect,
  Trigger,
} from "./core";
export type {
  ClassRequirements,
  ClassKind,
  ClassDef,
  ItemSlot,
  ItemDef,
  AbilityDef,
  StatusDef,
  MonsterDef,
  SkillDef,
  PerkDef,
} from "./defs";
export { MORALE_FACTS } from "./morale";
export type { MoraleFact, MoraleRule, AlignmentDef, MotivationDef, MoraleRulesDef } from "./morale";
export type {
  LevelRules,
  RescueRules,
  FallenRules,
  TransformDef,
  InjuryDef,
  FatigueTier,
  WearRules,
} from "./heroes";
export type {
  EncounterDef,
  LootTableDef,
  TrapSpec,
  RestSpec,
  RoomDef,
  SecretDef,
  PorterRules,
  SearchRules,
  FloorDef,
  DungeonRules,
  HuntRules,
  RaidRules,
} from "./dungeon";
export type { BuildingEffect, BuildingLevel, BuildingDef, TownRules } from "./town";
export {
  defineClass,
  defineItem,
  defineAbility,
  defineStatus,
  defineMonster,
  defineSkill,
  definePerk,
  defineEncounter,
  defineLootTable,
  defineRoom,
  defineFloor,
  defineBuilding,
  defineTownRules,
  defineDungeonRules,
  defineMotivation,
  defineAlignment,
  defineMoraleRules,
  defineLevelRules,
  defineWearRules,
  defineSecret,
  defineSearchRules,
  defineInjury,
  defineRescueRules,
  defineFallenRules,
  defineTransform,
} from "./library";
export type { Library } from "./library";
