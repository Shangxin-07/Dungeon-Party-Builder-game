/**
 * The content library. To add content, create a file in the matching folder
 * (classes/, items/, monsters/, rooms/, loot/, floors/, buildings/, ...) and add it to the
 * list below. No engine code changes are needed. The content tests check every id and reference.
 */
import type {
  AbilityDef,
  BuildingDef,
  ClassDef,
  EncounterDef,
  FloorDef,
  ItemDef,
  Library,
  LootTableDef,
  MonsterDef,
  PerkDef,
  RoomDef,
  SkillDef,
  StatusDef,
} from "./types";
import fighterClass from "./classes/fighter";
import scoutClass from "./classes/scout";
import mageClass from "./classes/mage";
import axeItem from "./items/axe";
import bandagesItem from "./items/bandages";
import chainmailItem from "./items/chainmail";
import coinsItem from "./items/coins";
import daggerItem from "./items/dagger";
import gemItem from "./items/gem";
import healingPotionItem from "./items/healing-potion";
import leatherArmorItem from "./items/leather-armor";
import rustyHelmetItem from "./items/rusty-helmet";
import shortBowItem from "./items/short-bow";
import silverRingItem from "./items/silver-ring";
import staffItem from "./items/staff";
import swordItem from "./items/sword";
import trinketItem from "./items/trinket";
import woodenShieldItem from "./items/wooden-shield";
import fireboltAbility from "./abilities/firebolt";
import flameWaveAbility from "./abilities/flame-wave";
import mendAbility from "./abilities/mend";
import venomBiteAbility from "./abilities/venom-bite";
import poisonedStatus from "./statuses/poisoned";
import caveSpiderMonster from "./monsters/cave-spider";
import giantRatMonster from "./monsters/giant-rat";
import goblinMonster from "./monsters/goblin";
import goblinArcherMonster from "./monsters/goblin-archer";
import littleSlimeMonster from "./monsters/little-slime";
import skeletonMonster from "./monsters/skeleton";
import slimeMonster from "./monsters/slime";
import appraisalSkill from "./skills/appraisal";
import medicineSkill from "./skills/medicine";
import scoutingSkill from "./skills/scouting";
import boneBreakerPerk from "./perks/bone-breaker";
import keenEyePerk from "./perks/keen-eye";
import toughPerk from "./perks/tough";
import goblinBandEncounter from "./encounters/goblin-band";
import ratSwarmEncounter from "./encounters/rat-swarm";
import skeletonPatrolEncounter from "./encounters/skeleton-patrol";
import slimesEncounter from "./encounters/slimes";
import spiderNestEncounter from "./encounters/spider-nest";
import goblinLoot from "./loot/goblin-loot";
import richChestLoot from "./loot/rich-chest";
import skeletonLoot from "./loot/skeleton-loot";
import slimeLoot from "./loot/slime-loot";
import smallChestLoot from "./loot/small-chest";
import spiderLoot from "./loot/spider-loot";
import dartTrapRoom from "./rooms/dart-trap";
import fallingRocksRoom from "./rooms/falling-rocks";
import monsterLairRoom from "./rooms/monster-lair";
import oldChestRoom from "./rooms/old-chest";
import quietPassageRoom from "./rooms/quiet-passage";
import restSpotRoom from "./rooms/rest-spot";
import spikedPitRoom from "./rooms/spiked-pit";
import treasureHoardRoom from "./rooms/treasure-hoard";
import diggingsFloor from "./floors/diggings";
import warrensFloor from "./floors/warrens";
import boneHallsFloor from "./floors/bone-halls";
import guildHallBuilding from "./buildings/guild-hall";
import marketBuilding from "./buildings/market";
import palisadeBuilding from "./buildings/palisade";
import gateBuilding from "./buildings/gate";
import watchtowerBuilding from "./buildings/watchtower";
import tavernBuilding from "./buildings/tavern";
import blacksmithBuilding from "./buildings/blacksmith";
import ironSwordItem from "./items/iron-sword";
import warAxeItem from "./items/war-axe";
import longbowItem from "./items/longbow";
import ironShieldItem from "./items/iron-shield";
import scaleMailItem from "./items/scale-mail";
import ironStaffItem from "./items/iron-staff";
import townRules from "./town";
import dungeonRules from "./dungeon";

export const classes: readonly ClassDef[] = [fighterClass, scoutClass, mageClass];
export const items: readonly ItemDef[] = [
  axeItem,
  bandagesItem,
  chainmailItem,
  coinsItem,
  daggerItem,
  gemItem,
  healingPotionItem,
  leatherArmorItem,
  rustyHelmetItem,
  shortBowItem,
  silverRingItem,
  staffItem,
  swordItem,
  trinketItem,
  woodenShieldItem,
  ironSwordItem,
  warAxeItem,
  longbowItem,
  ironShieldItem,
  scaleMailItem,
  ironStaffItem,
];
export const abilities: readonly AbilityDef[] = [
  fireboltAbility,
  flameWaveAbility,
  mendAbility,
  venomBiteAbility,
];
export const statuses: readonly StatusDef[] = [poisonedStatus];
export const monsters: readonly MonsterDef[] = [
  caveSpiderMonster,
  giantRatMonster,
  goblinMonster,
  goblinArcherMonster,
  littleSlimeMonster,
  skeletonMonster,
  slimeMonster,
];
export const skills: readonly SkillDef[] = [appraisalSkill, medicineSkill, scoutingSkill];
export const perks: readonly PerkDef[] = [boneBreakerPerk, keenEyePerk, toughPerk];
export const encounters: readonly EncounterDef[] = [
  goblinBandEncounter,
  ratSwarmEncounter,
  skeletonPatrolEncounter,
  slimesEncounter,
  spiderNestEncounter,
];
export const lootTables: readonly LootTableDef[] = [
  goblinLoot,
  richChestLoot,
  skeletonLoot,
  slimeLoot,
  smallChestLoot,
  spiderLoot,
];
export const rooms: readonly RoomDef[] = [
  dartTrapRoom,
  fallingRocksRoom,
  monsterLairRoom,
  oldChestRoom,
  quietPassageRoom,
  restSpotRoom,
  spikedPitRoom,
  treasureHoardRoom,
];
export const floors: readonly FloorDef[] = [diggingsFloor, warrensFloor, boneHallsFloor];
export const buildings: readonly BuildingDef[] = [
  guildHallBuilding,
  marketBuilding,
  tavernBuilding,
  blacksmithBuilding,
  palisadeBuilding,
  gateBuilding,
  watchtowerBuilding,
];

export const library: Library = {
  classes,
  items,
  abilities,
  statuses,
  monsters,
  skills,
  perks,
  encounters,
  lootTables,
  rooms,
  floors,
  buildings,
  town: townRules,
  dungeon: dungeonRules,
};

export { heroNames } from "./names";
