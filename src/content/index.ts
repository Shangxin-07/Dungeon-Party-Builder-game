/**
 * The content library. To add content, create a file in the matching folder
 * (classes/, items/, materials/, monsters/, rooms/, events/, loot/, floors/, buildings/, perks/, secrets/,
 * motivations/, ...) and add it to the
 * list below. No engine code changes are needed. The content tests check every id and reference.
 */
import type {
  LairDef,
  BarricadeDef,
  ShardSetDef,
  OfferDef,
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
  PostDef,
  RoomDef,
  EventDef,
  SecretDef,
  SkillDef,
  StatusDef,
  TransformDef,
  RecipeDef,
  TraitDef,
} from "./types";
import fighterClass from "./classes/fighter";
import holySymbolItem from "./items/holy-symbol";
import blessedBladeItem from "./items/blessed-blade";
import cursedBladeItem from "./items/cursed-blade";
import boneCharmItem from "./items/bone-charm";
import strangersPurseLoot from "./loot/strangers-purse";
import shrineOfferingsLoot from "./loot/shrine-offerings";
import shrineRelicLoot from "./loot/shrine-relic";
import altarGiftsLoot from "./loot/altar-gifts";
import strangeMeetingRoom from "./rooms/strange-meeting";
import woundedStrangerEvent from "./events/wounded-stranger";
import corneredGoblinEvent from "./events/cornered-goblin";
import minersShrineEvent from "./events/miners-shrine";
import darkAltarEvent from "./events/dark-altar";
import blackMarketBuilding from "./buildings/black-market";
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
import minerClass from "./classes/miner";
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
import tailSweepAbility from "./abilities/tail-sweep";
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
import leadershipSkill from "./skills/leadership";
import leadershipRules from "./leadership";
import researchRules from "./research";
import workshopRules from "./workshops";
import townsfolkRules from "./townsfolk";
import townMap from "./townmap";
import offerRules from "./offers";
import renownRules from "./renown";
import digRules from "./digging";
import theDayBook from "./story/the-day-book";
import firstShard from "./story/first-shard";
import diggingsSealed from "./story/diggings-sealed";
import warrensSealed from "./story/warrens-sealed";
import boneHallsSealed from "./story/bone-halls-sealed";
import floodedShaftsSealed from "./story/flooded-shafts-sealed";
import theHeart from "./story/the-heart";
import theHeartStilled from "./story/the-heart-stilled";
import forwardCamp from "./digsites/forward-camp";
import mineSite from "./digsites/mine";
import shrineSite from "./digsites/shrine";
import denSite from "./digsites/den";
import coastCaravanOffer from "./offers/coast-caravan";
import deepTradersOffer from "./offers/deep-traders";
import oreContractOffer from "./offers/ore-contract";
import silkContractOffer from "./offers/silk-contract";
import boneDustContractOffer from "./offers/bone-dust-contract";
import planksContractOffer from "./offers/planks-contract";
import digAWellOffer from "./offers/dig-a-well";
import harvestFeastOffer from "./offers/harvest-feast";
import seedCornOffer from "./offers/seed-corn";
import oldShaftOffer from "./offers/old-shaft";
import wanderingHeroOffer from "./offers/wandering-hero";
import cottagesBuilding from "./buildings/cottages";
import farmBuilding from "./buildings/farm";
import sawmillBuilding from "./buildings/sawmill";
import planksMaterial from "./materials/planks";
import ironBandsMaterial from "./materials/iron-bands";
import ironBandsRecipe from "./recipes/iron-bands";
import plankBarricade from "./barricades/plank-barricade";
import sealingRules from "./sealing";
import coreRules from "./core";
import { sealStones } from "./sealstones";
import diggingsShards from "./shards/diggings";
import warrensShards from "./shards/warrens";
import boneHallsShards from "./shards/bone-halls";
import floodedShaftsShards from "./shards/flooded-shafts";
import shardDiggingsMaterial from "./materials/shard-diggings";
import shardWarrensMaterial from "./materials/shard-warrens";
import shardBoneHallsMaterial from "./materials/shard-bone-halls";
import shardFloodedShaftsMaterial from "./materials/shard-flooded-shafts";
import skragShardcrownMonster from "./monsters/skrag-shardcrown";
import broodQueenMonster from "./monsters/brood-queen";
import ossuaryKnightMonster from "./monsters/ossuary-knight";
import oldDrownerMonster from "./monsters/old-drowner";
import hollowSaintMonster from "./monsters/hollow-saint";
import ironBoundGate from "./barricades/iron-bound-gate";
import planksRecipe from "./recipes/planks";
import woodenShieldRecipe from "./recipes/wooden-shield";
import staffRecipe from "./recipes/staff";
import shortBowRecipe from "./recipes/short-bow";
import ironSwordRecipe from "./recipes/iron-sword";
import ironShieldRecipe from "./recipes/iron-shield";
import chainmailRecipe from "./recipes/chainmail";
import scaleMailRecipe from "./recipes/scale-mail";
import silverSwordRecipe from "./recipes/silver-sword";
import healingPotionRecipe from "./recipes/healing-potion";
import bandagesRecipe from "./recipes/bandages";
import greaterHealingPotionRecipe from "./recipes/greater-healing-potion";
import loreSkill from "./skills/lore";
import blastingPowderAbility from "./abilities/blasting-powder";
import rustBiteAbility from "./abilities/rust-bite";
import goblinSapperMonster from "./monsters/goblin-sapper";
import rustBeetleMonster from "./monsters/rust-beetle";
import beetleShellSpecimen from "./specimens/beetle-shell";
import minersLampItem from "./items/miners-lamp";
import crossbowItem from "./items/crossbow";
import brassFittingsItem from "./items/brass-fittings";
import sapperLoot from "./loot/sapper-loot";
import beetleLoot from "./loot/beetle-loot";
import minersToolsLoot from "./loot/miners-tools";
import ponyTackLoot from "./loot/pony-tack";
import runawayCartRoom from "./rooms/runaway-cart";
import toolStoreRoom from "./rooms/tool-store";
import scavengerCrewEncounter from "./encounters/scavenger-crew";
import rustBeetlesEncounter from "./encounters/rust-beetles";
import pitPonyEvent from "./events/pit-pony";
import hobbledStatus from "./statuses/hobbled";
import venomWardStatus from "./statuses/venom-ward";
import hamstringAbility from "./abilities/hamstring";
import tunnelHoundMonster from "./monsters/tunnel-hound";
import webLurkerMonster from "./monsters/web-lurker";
import houndToothSpecimen from "./specimens/hound-tooth";
import silkCloakItem from "./items/silk-cloak";
import antivenomItem from "./items/antivenom";
import houndLoot from "./loot/hound-loot";
import cocoonLoot from "./loot/cocoon-loot";
import webCurtainRoom from "./rooms/web-curtain";
import cocoonedDelverRoom from "./rooms/cocooned-delver";
import houndPackEncounter from "./encounters/hound-pack";
import lurkerWebEncounter from "./encounters/lurker-web";
import webbedGoblinEvent from "./events/webbed-goblin";
import goblinEarSpecimen from "./specimens/goblin-ear";
import spiderFangSpecimen from "./specimens/spider-fang";
import etchedSkullSpecimen from "./specimens/etched-skull";
import trollToothSpecimen from "./specimens/troll-tooth";
import foremansTallySpecimen from "./specimens/foremans-tally";
import tinCharmItem from "./items/tin-charm";
import luckyCharmItem from "./items/lucky-charm";
import wardStoneItem from "./items/ward-stone";
import trinketIdentifiedLoot from "./loot/trinket-identified";
import hauntedTrait from "./traits/haunted";
import overcautiousTrait from "./traits/overcautious";
import hardenedTrait from "./traits/hardened";
import inspiringTrait from "./traits/inspiring";
import steadyTrait from "./traits/steady";
import trustedTrait from "./traits/trusted";
import doubtedTrait from "./traits/doubted";
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
import scoutRules from "./scouting";
import stealthRules from "./stealth";
import stealthSkill from "./skills/stealth";
import mireBehemothMonster from "./monsters/mire-behemoth";
import shedScaleSpecimen from "./specimens/shed-scale";
import scalePiercerItem from "./items/scale-piercer";
import wallowScalesLoot from "./loot/wallow-scales";
import behemothHoardLoot from "./loot/behemoth-hoard";
import mireWallowLair from "./lairs/mire-wallow";
import timeRules from "./time";
import minersCacheSecret from "./secrets/miners-cache";
import falseFloorSecret from "./secrets/false-floor";
import sealedNicheSecret from "./secrets/sealed-niche";
import hiddenCacheLoot from "./loot/hidden-cache";
import oreSeamLoot from "./loot/ore-seam";
import oreSeamRoom from "./rooms/ore-seam";
import ironOreMaterial from "./materials/iron-ore";
import spiderSilkMaterial from "./materials/spider-silk";
import boneDustMaterial from "./materials/bone-dust";
import timberMaterial from "./materials/timber";
import pickAxeItem from "./items/pick-axe";
import slingItem from "./items/sling";
import workLeathersItem from "./items/work-leathers";
import campSalvageLoot from "./loot/camp-salvage";
import seamWorkLoot from "./loot/seam-work";
import pitSpoilsLoot from "./loot/pit-spoils";
import barricadePost from "./posts/barricade";
import lookoutPost from "./posts/lookout";
import salvagePost from "./posts/salvage";
import seamPost from "./posts/seam";
import openingRules from "./opening";
import brokenArmInjury from "./injuries/broken-arm";
import crackedRibsInjury from "./injuries/cracked-ribs";
import twistedAnkleInjury from "./injuries/twisted-ankle";
import concussionInjury from "./injuries/concussion";
import deepGashInjury from "./injuries/deep-gash";
import floodedShaftsFloor from "./floors/flooded-shafts";
import oldDelveFloor from "./floors/old-delve";
import ghoulMonster from "./monsters/ghoul";
import ghastMonster from "./monsters/ghast";
import caveTrollMonster from "./monsters/cave-troll";
import hearthbornMonster from "./monsters/hearthborn";
import sporecallerMonster from "./monsters/sporecaller";
import lostDelverMonster from "./monsters/lost-delver";
import foremansShadeMonster from "./monsters/foremans-shade";
import ghoulPackEncounter from "./encounters/ghoul-pack";
import trollDenEncounter from "./encounters/troll-den";
import sporeBedEncounter from "./encounters/spore-bed";
import delverHauntEncounter from "./encounters/delver-haunt";
import ghoulClawAbility from "./abilities/ghoul-claw";
import rendAbility from "./abilities/rend";
import sporeBurstAbility from "./abilities/spore-burst";
import graveChillAbility from "./abilities/grave-chill";
import callTheCrewAbility from "./abilities/call-the-crew";
import numbedStatus from "./statuses/numbed";
import regeneratingStatus from "./statuses/regenerating";
import heartFedStatus from "./statuses/heart-fed";
import ghoulLoot from "./loot/ghoul-loot";
import trollLoot from "./loot/troll-loot";
import sporeLoot from "./loot/spore-loot";
import delverLoot from "./loot/delver-loot";
import silverVeinLoot from "./loot/silver-vein";
import delversStrongboxLoot from "./loot/delvers-strongbox";
import silverVeinRoom from "./rooms/silver-vein";
import floodedGalleryRoom from "./rooms/flooded-gallery";
import delversStrongboxSecret from "./secrets/delvers-strongbox";
import glowcapMaterial from "./materials/glowcap";
import deepSilverMaterial from "./materials/deep-silver";
import silverSwordItem from "./items/silver-sword";
import greaterHealingPotionItem from "./items/greater-healing-potion";
import apothecaryBuilding from "./buildings/apothecary";
import mineCageBuilding from "./buildings/mine-cage";
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
  // The opening's camp class (DESIGN.md §8): held until the camp is, then swapped.
  minerClass,
];
/** Building materials and rarer things: items the guild keeps rather than sells. */
export const materials: readonly ItemDef[] = [
  timberMaterial,
  // Sawn at the Sawmill (M7.14).
  planksMaterial,
  ironBandsMaterial,
  ironOreMaterial,
  spiderSilkMaterial,
  boneDustMaterial,
  // The deep floors (M6.21).
  glowcapMaterial,
  deepSilverMaterial,
  shardDiggingsMaterial,
  shardWarrensMaterial,
  shardBoneHallsMaterial,
  shardFloodedShaftsMaterial,
];

/** Specimens (M7.07, DESIGN.md §17.7): bits of monsters that feed the Library's research on them. */
export const specimens: readonly ItemDef[] = [
  goblinEarSpecimen,
  houndToothSpecimen,
  beetleShellSpecimen,
  spiderFangSpecimen,
  etchedSkullSpecimen,
  trollToothSpecimen,
  foremansTallySpecimen,
  // The Mire Behemoth's (M7.08).
  shedScaleSpecimen,
];

/** Huge beasts' lairs (M7.08, DESIGN.md §17.8), off the main tunnels. */
export const lairs: readonly LairDef[] = [mireWallowLair];

/** Town news (M7.17, DESIGN.md §18.1c): offers that turn up in town and go away again. */
export const offers: readonly OfferDef[] = [
  coastCaravanOffer,
  deepTradersOffer,
  oreContractOffer,
  silkContractOffer,
  boneDustContractOffer,
  planksContractOffer,
  digAWellOffer,
  harvestFeastOffer,
  seedCornOffer,
  oldShaftOffer,
  wanderingHeroOffer,
];

/** Stairhead barricades (M7.16, DESIGN.md §18.3b): what a party can seal the stairs with. */
export const barricades: readonly BarricadeDef[] = [plankBarricade, ironBoundGate];

/**
 * The Hearthstone's shards (DESIGN.md §20): a set per floor, each listing
 * where its shards are. Sealing a floor takes all of its set.
 */
export const shards: readonly ShardSetDef[] = [
  diggingsShards,
  warrensShards,
  boneHallsShards,
  floodedShaftsShards,
];

/** The Seal Stones (M8.17): one per floor and way, made from the shard sets. */
const stones = sealStones(shards, sealingRules);

/** Posts round the pit (DESIGN.md §8): duties for heroes at home. */
export const posts: readonly PostDef[] = [barricadePost, lookoutPost, salvagePost, seamPost];

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
  // The deep floors (M6.21): from the Blacksmith's forge and the Apothecary.
  silverSwordItem,
  // The Behemoth's bane (M7.08), sold once the Library has Studied it.
  scalePiercerItem,
  greaterHealingPotionItem,
  // Makeshift kit from the mining camp (the opening, DESIGN.md §8).
  pickAxeItem,
  slingItem,
  antivenomItem,
  silkCloakItem,
  brassFittingsItem,
  crossbowItem,
  minersLampItem,
  workLeathersItem,
  // Holy and unholy gear (DESIGN.md §7): the Temple, the Black Market and events.
  holySymbolItem,
  blessedBladeItem,
  cursedBladeItem,
  boneCharmItem,
  // What a strange trinket turns out to be (M7.07, research).
  tinCharmItem,
  luckyCharmItem,
  wardStoneItem,
  // Specimens (M7.07): for the Library, from monsters a party kills. See specimens/.
  ...specimens,
  // Materials (DESIGN.md §8): the guild keeps them to build with. See materials/.
  ...materials,
  // Seal Stones (M8.17), made from the shard sets: see sealstones.ts.
  ...stones.items,
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
  tailSweepAbility,
  aimedShotAbility,
  crushAbility,
  disarmAbility,
  backstabAbility,
  shieldBashAbility,
  gnawAbility,
  acidSpitAbility,
  hamstringAbility,
  rustBiteAbility,
  blastingPowderAbility,
  webAbility,
  warCryAbility,
  callTheBroodAbility,
  flameBladeAbility,
  arcaneWardAbility,
  holyStrikeAbility,
  layOnHandsAbility,
  blizzardAbility,
  shadowStrikeAbility,
  // Monsters of the deep floors (M6.21).
  ghoulClawAbility,
  rendAbility,
  sporeBurstAbility,
  graveChillAbility,
  callTheCrewAbility,
];
export const statuses: readonly StatusDef[] = [
  poisonedStatus,
  markedStatus,
  sunderedStatus,
  bleedingStatus,
  webbedStatus,
  venomWardStatus,
  hobbledStatus,
  emboldenedStatus,
  disarmedStatus,
  dazedStatus,
  chilledStatus,
  numbedStatus,
  regeneratingStatus,
  heartFedStatus,
];
export const monsters: readonly MonsterDef[] = [
  caveSpiderMonster,
  giantRatMonster,
  goblinMonster,
  goblinArcherMonster,
  webLurkerMonster,
  tunnelHoundMonster,
  rustBeetleMonster,
  goblinSapperMonster,
  littleSlimeMonster,
  skeletonMonster,
  slimeMonster,
  spiderlingMonster,
  spiderMatriarchMonster,
  goblinBossMonster,
  skeletonCaptainMonster,
  // Floors 4 and 5 (M6.21).
  ghoulMonster,
  ghastMonster,
  // Lives only in its wallow (M7.08, content/lairs/).
  mireBehemothMonster,
  caveTrollMonster,
  hearthbornMonster,
  sporecallerMonster,
  lostDelverMonster,
  foremansShadeMonster,
  skragShardcrownMonster,
  broodQueenMonster,
  ossuaryKnightMonster,
  oldDrownerMonster,
  hollowSaintMonster,
];
export const skills: readonly SkillDef[] = [
  appraisalSkill,
  medicineSkill,
  scoutingSkill,
  leadershipSkill,
  loreSkill,
  stealthSkill,
];

/** Leader traits (M7.05, DESIGN.md §17.5), earned on a leader's watch. */
export const traits: readonly TraitDef[] = [
  hauntedTrait,
  overcautiousTrait,
  hardenedTrait,
  inspiringTrait,
  steadyTrait,
  trustedTrait,
  doubtedTrait,
];
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
  lurkerWebEncounter,
  houndPackEncounter,
  rustBeetlesEncounter,
  scavengerCrewEncounter,
  skeletonPatrolEncounter,
  slimesEncounter,
  spiderNestEncounter,
  ghoulPackEncounter,
  trollDenEncounter,
  sporeBedEncounter,
  delverHauntEncounter,
];
export const lootTables: readonly LootTableDef[] = [
  // The Mire Behemoth's wallow (M7.08).
  wallowScalesLoot,
  behemothHoardLoot,
  trinketIdentifiedLoot,
  goblinLoot,
  cocoonLoot,
  houndLoot,
  ponyTackLoot,
  minersToolsLoot,
  beetleLoot,
  sapperLoot,
  // Events (DESIGN.md §7).
  strangersPurseLoot,
  shrineOfferingsLoot,
  shrineRelicLoot,
  altarGiftsLoot,
  richChestLoot,
  skeletonLoot,
  slimeLoot,
  smallChestLoot,
  spiderLoot,
  hiddenCacheLoot,
  oreSeamLoot,
  campSalvageLoot,
  seamWorkLoot,
  pitSpoilsLoot,
  ghoulLoot,
  trollLoot,
  sporeLoot,
  delverLoot,
  silverVeinLoot,
  delversStrongboxLoot,
];
export const rooms: readonly RoomDef[] = [
  dartTrapRoom,
  fallingRocksRoom,
  monsterLairRoom,
  oldChestRoom,
  cocoonedDelverRoom,
  webCurtainRoom,
  toolStoreRoom,
  runawayCartRoom,
  quietPassageRoom,
  restSpotRoom,
  spikedPitRoom,
  treasureHoardRoom,
  oreSeamRoom,
  silverVeinRoom,
  floodedGalleryRoom,
  // Events played out by party alignment (DESIGN.md §7, events/).
  strangeMeetingRoom,
];
export const floors: readonly FloorDef[] = [
  diggingsFloor,
  warrensFloor,
  boneHallsFloor,
  floodedShaftsFloor,
  oldDelveFloor,
];
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
  apothecaryBuilding,
  // Workshops (M7.14): the Blacksmith and Apothecary have benches too.
  sawmillBuilding,
  // Townsfolk (M7.15): housing and food.
  cottagesBuilding,
  farmBuilding,
  mineCageBuilding,
  // Only deals with Evil heroes (DESIGN.md §7).
  blackMarketBuilding,
];

export const transforms: readonly TransformDef[] = [risenTransform];

/** What the workshops make (M7.14, DESIGN.md §18.1). */
export const recipes: readonly RecipeDef[] = [
  // Seal Stones (M8.17): forged at the Temple or the Black Market, see sealstones.ts.
  ...stones.recipes,
  planksRecipe,
  ironBandsRecipe,
  woodenShieldRecipe,
  staffRecipe,
  shortBowRecipe,
  ironSwordRecipe,
  ironShieldRecipe,
  chainmailRecipe,
  scaleMailRecipe,
  silverSwordRecipe,
  healingPotionRecipe,
  bandagesRecipe,
  greaterHealingPotionRecipe,
];

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
  delversStrongboxSecret,
];

/** Room events, played out by the party's alignment (DESIGN.md §7). */
export const events: readonly EventDef[] = [
  woundedStrangerEvent,
  corneredGoblinEvent,
  webbedGoblinEvent,
  pitPonyEvent,
  minersShrineEvent,
  darkAltarEvent,
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
  events,
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
  scouting: scoutRules,
  stealth: stealthRules,
  lairs,
  barricades,
  shards,
  sealing: sealingRules,
  core: coreRules,
  time: timeRules,
  fallen: fallenRules,
  transforms,
  posts,
  opening: openingRules,
  leadership: leadershipRules,
  traits,
  research: researchRules,
  recipes,
  workshops: workshopRules,
  townsfolk: townsfolkRules,
  townMap,
  offers,
  offerRules,
  renown: renownRules,
  digSites: [forwardCamp, mineSite, shrineSite, denSite],
  digging: digRules,
  story: [
    theDayBook,
    firstShard,
    diggingsSealed,
    warrensSealed,
    boneHallsSealed,
    floodedShaftsSealed,
    theHeart,
    theHeartStilled,
  ],
};

export { heroNames } from "./names";
