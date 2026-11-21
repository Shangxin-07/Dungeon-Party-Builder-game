/**
 * The content library. To add content, create a file in the matching folder
 * (classes/, items/, materials/, monsters/, rooms/, loot/, floors/, buildings/, perks/, secrets/,
 * motivations/, ...) and add it to the
 * list below. No engine code changes are needed. The content tests check every id and reference.
 */
import type {
  AbilityDef,
  AlignmentDef,
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
  SecretDef,
  SkillDef,
  StatusDef,
  TransformDef,
} from "./types";
import fighterClass from "./classes/fighter";
import templeBuilding from "./buildings/temple";
import graveyardBuilding from "./buildings/graveyard";
import fallenRules from "./fallen";
import risenTransform from "./transforms/risen";
import scoutClass from "./classes/scout";
import mageClass from "./classes/mage";
import clericClass from "./classes/cleric";
import spellbladeClass from "./classes/spellblade";
import paladinClass from "./classes/paladin";
import frostMageClass from "./classes/frost-mage";
import assassinClass from "./classes/assassin";
import flameBladeAbility from "./abilities/flame-blade";
import arcaneWardAbility from "./abilities/arcane-ward";
import holyStrikeAbility from "./abilities/holy-strike";
import layOnHandsAbility from "./abilities/lay-on-hands";
import blizzardAbility from "./abilities/blizzard";
import shadowStrikeAbility from "./abilities/shadow-strike";
import fighterMilestones from "./perks/milestones/fighter";
import mageMilestones from "./perks/milestones/mage";
import scoutMilestones from "./perks/milestones/scout";
import clericMilestones from "./perks/milestones/cleric";
import advancedMilestones from "./perks/milestones/advanced";
import maceItem from "./items/mace";
import prayerAbility from "./abilities/prayer";
import smiteAbility from "./abilities/smite";
import devoutPerk from "./perks/devout";
import turnUndeadPerk from "./perks/turn-undead";
import rallyingVoicePerk from "./perks/rallying-voice";
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
import gnawAbility from "./abilities/gnaw";
import acidSpitAbility from "./abilities/acid-spit";
import webAbility from "./abilities/web";
import warCryAbility from "./abilities/war-cry";
import callTheBroodAbility from "./abilities/call-the-brood";
import bleedingStatus from "./statuses/bleeding";
import webbedStatus from "./statuses/webbed";
import emboldenedStatus from "./statuses/emboldened";
import spiderlingMonster from "./monsters/spiderling";
import spiderMatriarchMonster from "./monsters/spider-matriarch";
import goblinBossMonster from "./monsters/goblin-boss";
import skeletonCaptainMonster from "./monsters/skeleton-captain";
import powerStrikeAbility from "./abilities/power-strike";
import secondWindAbility from "./abilities/second-wind";
import whirlwindAbility from "./abilities/whirlwind";
import markPreyAbility from "./abilities/mark-prey";
import flurryAbility from "./abilities/flurry";
import frostLanceAbility from "./abilities/frost-lance";
import fireballAbility from "./abilities/fireball";
import circleOfHealingAbility from "./abilities/circle-of-healing";
import cleaveAbility from "./abilities/cleave";
import aimedShotAbility from "./abilities/aimed-shot";
import crushAbility from "./abilities/crush";
import disarmAbility from "./abilities/disarm";
import backstabAbility from "./abilities/backstab";
import shieldBashAbility from "./abilities/shield-bash";
import markedStatus from "./statuses/marked";
import sunderedStatus from "./statuses/sundered";
import disarmedStatus from "./statuses/disarmed";
import dazedStatus from "./statuses/dazed";
import chilledStatus from "./statuses/chilled";
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
import libraryBuilding from "./buildings/library";
import trainingYardBuilding from "./buildings/training-yard";
import vaultBuilding from "./buildings/vault";
import heavyHitterPerk from "./perks/heavy-hitter";
import shieldWallPerk from "./perks/shield-wall";
import thickSkinnedPerk from "./perks/thick-skinned";
import steadyAimPerk from "./perks/steady-aim";
import lightFeetPerk from "./perks/light-feet";
import trapSensePerk from "./perks/trap-sense";
import spellFocusPerk from "./perks/spell-focus";
import deepWellPerk from "./perks/deep-well";
import flameWardPerk from "./perks/flame-ward";
import fieldMedicPerk from "./perks/field-medic";
import packMulePerk from "./perks/pack-mule";
import sharpEyedPerk from "./perks/sharp-eyed";
import quickReflexesPerk from "./perks/quick-reflexes";
import goldMotivation from "./motivations/gold";
import gloryMotivation from "./motivations/glory";
import knowledgeMotivation from "./motivations/knowledge";
import comradesMotivation from "./motivations/comrades";
import goodAlignment from "./alignments/good";
import neutralAlignment from "./alignments/neutral";
import evilAlignment from "./alignments/evil";
import moraleRules from "./morale";
import levelRules from "./levels";
import rescueRules from "./rescue";
import wearRules from "./wear";
import searchRules from "./searching";
import minersCacheSecret from "./secrets/miners-cache";
import falseFloorSecret from "./secrets/false-floor";
import sealedNicheSecret from "./secrets/sealed-niche";
import hiddenCacheLoot from "./loot/hidden-cache";
import oreSeamLoot from "./loot/ore-seam";
import oreSeamRoom from "./rooms/ore-seam";
import ironOreMaterial from "./materials/iron-ore";
import spiderSilkMaterial from "./materials/spider-silk";
import boneDustMaterial from "./materials/bone-dust";
import brokenArmInjury from "./injuries/broken-arm";
import crackedRibsInjury from "./injuries/cracked-ribs";
import twistedAnkleInjury from "./injuries/twisted-ankle";
import concussionInjury from "./injuries/concussion";
import deepGashInjury from "./injuries/deep-gash";
import townRules from "./town";
import dungeonRules from "./dungeon";

export const classes: readonly ClassDef[] = [
  fighterClass,
  scoutClass,
  mageClass,
  clericClass,
  // Advanced and combo classes (DESIGN.md §9): learned at a level-up, never recruited.
  spellbladeClass,
  paladinClass,
  frostMageClass,
  assassinClass,
];
/** Building materials and rarer things: items the guild keeps rather than sells. */
export const materials: readonly ItemDef[] = [
  ironOreMaterial,
  spiderSilkMaterial,
  boneDustMaterial,
];

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
  maceItem,
  // Materials (DESIGN.md §8): the guild keeps them to build with. See materials/.
  ...materials,
];
export const abilities: readonly AbilityDef[] = [
  fireboltAbility,
  flameWaveAbility,
  mendAbility,
  venomBiteAbility,
  prayerAbility,
  smiteAbility,
  powerStrikeAbility,
  secondWindAbility,
  whirlwindAbility,
  markPreyAbility,
  flurryAbility,
  frostLanceAbility,
  fireballAbility,
  circleOfHealingAbility,
  cleaveAbility,
  aimedShotAbility,
  crushAbility,
  disarmAbility,
  backstabAbility,
  shieldBashAbility,
  gnawAbility,
  acidSpitAbility,
  webAbility,
  warCryAbility,
  callTheBroodAbility,
  flameBladeAbility,
  arcaneWardAbility,
  holyStrikeAbility,
  layOnHandsAbility,
  blizzardAbility,
  shadowStrikeAbility,
];
export const statuses: readonly StatusDef[] = [
  poisonedStatus,
  markedStatus,
  sunderedStatus,
  bleedingStatus,
  webbedStatus,
  emboldenedStatus,
  disarmedStatus,
  dazedStatus,
  chilledStatus,
];
export const monsters: readonly MonsterDef[] = [
  caveSpiderMonster,
  giantRatMonster,
  goblinMonster,
  goblinArcherMonster,
  littleSlimeMonster,
  skeletonMonster,
  slimeMonster,
  spiderlingMonster,
  spiderMatriarchMonster,
  goblinBossMonster,
  skeletonCaptainMonster,
];
export const skills: readonly SkillDef[] = [appraisalSkill, medicineSkill, scoutingSkill];
export const perks: readonly PerkDef[] = [
  boneBreakerPerk,
  heavyHitterPerk,
  shieldWallPerk,
  thickSkinnedPerk,
  keenEyePerk,
  steadyAimPerk,
  lightFeetPerk,
  trapSensePerk,
  spellFocusPerk,
  deepWellPerk,
  flameWardPerk,
  toughPerk,
  fieldMedicPerk,
  packMulePerk,
  sharpEyedPerk,
  quickReflexesPerk,
  devoutPerk,
  turnUndeadPerk,
  rallyingVoicePerk,
  // Milestone perks (DESIGN.md §9), one file per class.
  ...fighterMilestones,
  ...mageMilestones,
  ...scoutMilestones,
  ...clericMilestones,
  ...advancedMilestones,
];
export const alignments: readonly AlignmentDef[] = [goodAlignment, neutralAlignment, evilAlignment];
export const motivations: readonly MotivationDef[] = [
  goldMotivation,
  gloryMotivation,
  knowledgeMotivation,
  comradesMotivation,
];
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
  hiddenCacheLoot,
  oreSeamLoot,
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
  oreSeamRoom,
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
  libraryBuilding,
  trainingYardBuilding,
  vaultBuilding,
  templeBuilding,
  graveyardBuilding,
];

export const transforms: readonly TransformDef[] = [risenTransform];

export const injuries: readonly InjuryDef[] = [
  brokenArmInjury,
  crackedRibsInjury,
  twistedAnkleInjury,
  concussionInjury,
  deepGashInjury,
];

export const secrets: readonly SecretDef[] = [
  minersCacheSecret,
  falseFloorSecret,
  sealedNicheSecret,
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
  motivations,
  alignments,
  town: townRules,
  dungeon: dungeonRules,
  morale: moraleRules,
  levels: levelRules,
  rescue: rescueRules,
  wear: wearRules,
  injuries,
  secrets,
  searching: searchRules,
  fallen: fallenRules,
  transforms,
};

export { heroNames } from "./names";
