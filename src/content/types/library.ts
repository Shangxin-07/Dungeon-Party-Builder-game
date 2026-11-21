/**
 * The whole library of content, and identity helpers for defining it.
 */
import type {
  ClassDef,
  ItemDef,
  AbilityDef,
  StatusDef,
  MonsterDef,
  SkillDef,
  PerkDef,
} from "./defs";
import type { AlignmentDef, MotivationDef, MoraleRulesDef } from "./morale";
import type {
  LevelRules,
  RescueRules,
  FallenRules,
  TransformDef,
  InjuryDef,
  WearRules,
} from "./heroes";
import type {
  EncounterDef,
  LootTableDef,
  RoomDef,
  SecretDef,
  SearchRules,
  FloorDef,
  DungeonRules,
} from "./dungeon";
import type { BuildingDef, OpeningRules, PostDef, TownRules } from "./town";

/** Everything the simulation needs, indexed by kind. */
export interface Library {
  classes: readonly ClassDef[];
  items: readonly ItemDef[];
  abilities: readonly AbilityDef[];
  statuses: readonly StatusDef[];
  monsters: readonly MonsterDef[];
  skills: readonly SkillDef[];
  perks: readonly PerkDef[];
  encounters: readonly EncounterDef[];
  lootTables: readonly LootTableDef[];
  rooms: readonly RoomDef[];
  floors: readonly FloorDef[];
  buildings: readonly BuildingDef[];
  motivations: readonly MotivationDef[];
  alignments: readonly AlignmentDef[];
  town: TownRules;
  dungeon: DungeonRules;
  morale: MoraleRulesDef;
  levels: LevelRules;
  rescue: RescueRules;
  wear: WearRules;
  injuries: readonly InjuryDef[];
  secrets: readonly SecretDef[];
  searching: SearchRules;
  fallen: FallenRules;
  transforms: readonly TransformDef[];
  posts: readonly PostDef[];
  opening: OpeningRules;
}

/** Identity helpers so definitions get full type checking and editor hints. */
export const defineClass = (def: ClassDef): ClassDef => def;

export const defineItem = (def: ItemDef): ItemDef => def;

/**
 * A material (DESIGN.md §8): an item in the "material" slot. Parties carry it
 * home like loot (it takes carry slots, and `value` is what it's worth to them
 * when packs are full); the guild keeps it to build with.
 */
export const defineMaterial = (
  def: Omit<ItemDef, "slot" | "tags"> & { tags?: readonly string[]; blurb: string },
): ItemDef => ({ ...def, slot: "material", tags: ["material", ...(def.tags ?? [])] });

export const defineAbility = (def: AbilityDef): AbilityDef => def;

export const defineStatus = (def: StatusDef): StatusDef => def;

export const defineMonster = (def: MonsterDef): MonsterDef => def;

export const defineSkill = (def: SkillDef): SkillDef => def;

export const definePerk = (def: PerkDef): PerkDef => def;

export const defineEncounter = (def: EncounterDef): EncounterDef => def;

export const defineLootTable = (def: LootTableDef): LootTableDef => def;

export const defineRoom = (def: RoomDef): RoomDef => def;

export const defineFloor = (def: FloorDef): FloorDef => def;

export const defineBuilding = (def: BuildingDef): BuildingDef => def;

export const defineTownRules = (def: TownRules): TownRules => def;

export const definePost = (def: PostDef): PostDef => def;

export const defineOpening = (def: OpeningRules): OpeningRules => def;

export const defineDungeonRules = (def: DungeonRules): DungeonRules => def;

export const defineMotivation = (def: MotivationDef): MotivationDef => def;

export const defineAlignment = (def: AlignmentDef): AlignmentDef => def;

export const defineMoraleRules = (def: MoraleRulesDef): MoraleRulesDef => def;

export const defineLevelRules = (def: LevelRules): LevelRules => def;

export const defineWearRules = (def: WearRules): WearRules => def;

export const defineSecret = (def: SecretDef): SecretDef => def;

export const defineSearchRules = (def: SearchRules): SearchRules => def;

export const defineInjury = (def: InjuryDef): InjuryDef => def;

export const defineRescueRules = (def: RescueRules): RescueRules => def;

export const defineFallenRules = (def: FallenRules): FallenRules => def;

export const defineTransform = (def: TransformDef): TransformDef => def;
