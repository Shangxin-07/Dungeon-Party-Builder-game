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
  LeadershipRules,
  TraitDef,
} from "./heroes";
import type {
  EventDef,
  EncounterDef,
  LootTableDef,
  RoomDef,
  SecretDef,
  SearchRules,
  ScoutRules,
  StealthRules,
  LairDef,
  BarricadeDef,
  ShardSetDef,
  SealingRules,
  TimeRules,
  FloorDef,
  DungeonRules,
} from "./dungeon";
import type {
  BuildingDef,
  OpeningRules,
  PostDef,
  RecipeDef,
  ResearchRules,
  TownRules,
  TownsfolkRules,
  TownMapDef,
  WorkshopRules,
  OfferDef,
  OfferRules,
  RenownRules,
} from "./town";

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
  /** Room events played out by party alignment (DESIGN.md §7). */
  events: readonly EventDef[];
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
  /** Scout missions and floor intel (M7.08). */
  scouting: ScoutRules;
  /** Sneak missions and lairs (M7.08). */
  stealth: StealthRules;
  lairs: readonly LairDef[];
  /** Stairhead barricades (M7.16). */
  barricades: readonly BarricadeDef[];
  /** The Hearthstone's shards, a set per floor (DESIGN.md §20). */
  shards: readonly ShardSetDef[];
  /** Forging Seal Stones (M8.17): cleansed or bound. */
  sealing: SealingRules;
  /** The trip clock (M7.01): hours below. */
  time: TimeRules;
  fallen: FallenRules;
  transforms: readonly TransformDef[];
  posts: readonly PostDef[];
  opening: OpeningRules;
  /** Leaders and command (M7.05). */
  leadership: LeadershipRules;
  /** Leader traits (M7.05, content/traits/). */
  traits: readonly TraitDef[];
  /** Research at the Library (M7.07). */
  research: ResearchRules;
  /** Workshops and what they make (M7.14). */
  recipes: readonly RecipeDef[];
  workshops: WorkshopRules;
  /** Settlers (M7.15). */
  townsfolk: TownsfolkRules;
  /** The town map's layout (M8, DESIGN.md §19). */
  townMap: TownMapDef;
  /** Town news (M7.17). */
  offers: readonly OfferDef[];
  offerRules: OfferRules;
  /** Renown and its ranks (M8.19). */
  renown: RenownRules;
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

export const defineEvent = (def: EventDef): EventDef => def;

export const defineFloor = (def: FloorDef): FloorDef => def;

export const defineBuilding = (def: BuildingDef): BuildingDef => def;

export const defineTownRules = (def: TownRules): TownRules => def;

export const definePost = (def: PostDef): PostDef => def;

export const defineRecipe = (def: RecipeDef): RecipeDef => def;

export const defineOffer = <T extends OfferDef>(def: T): T => def;
export const defineOfferRules = (def: OfferRules): OfferRules => def;
export const defineRenownRules = (def: RenownRules): RenownRules => def;
export const defineWorkshopRules = (def: WorkshopRules): WorkshopRules => def;

export const defineTownsfolkRules = (def: TownsfolkRules): TownsfolkRules => def;

export const defineResearchRules = (def: ResearchRules): ResearchRules => def;

export const defineOpening = (def: OpeningRules): OpeningRules => def;
export const defineTownMap = (def: TownMapDef): TownMapDef => def;

export const defineDungeonRules = (def: DungeonRules): DungeonRules => def;

export const defineMotivation = (def: MotivationDef): MotivationDef => def;

export const defineAlignment = (def: AlignmentDef): AlignmentDef => def;

export const defineMoraleRules = (def: MoraleRulesDef): MoraleRulesDef => def;

export const defineLevelRules = (def: LevelRules): LevelRules => def;

export const defineWearRules = (def: WearRules): WearRules => def;

export const defineSecret = (def: SecretDef): SecretDef => def;

export const defineSearchRules = (def: SearchRules): SearchRules => def;
export const defineScoutRules = (def: ScoutRules): ScoutRules => def;
export const defineStealthRules = (def: StealthRules): StealthRules => def;
export const defineLair = (def: LairDef): LairDef => def;
export const defineBarricade = (def: BarricadeDef): BarricadeDef => def;
export const defineShardSet = (def: ShardSetDef): ShardSetDef => def;
export const defineSealingRules = (def: SealingRules): SealingRules => def;
/** A Seal Stone's item id (M8.17): one per shard set and way to forge it. */
export const sealStoneId = (set: ShardSetDef, way: string) => `seal-stone-${set.id}-${way}`;

export const defineTimeRules = (def: TimeRules): TimeRules => def;

export const defineInjury = (def: InjuryDef): InjuryDef => def;

export const defineRescueRules = (def: RescueRules): RescueRules => def;

export const defineFallenRules = (def: FallenRules): FallenRules => def;

export const defineTransform = (def: TransformDef): TransformDef => def;

export const defineLeadershipRules = (def: LeadershipRules): LeadershipRules => def;

export const defineTrait = (def: TraitDef): TraitDef => def;
