/**
 * The content library. To add content, create a file in the matching folder
 * (classes/, items/, monsters/, ...) and add it to the list below. No engine
 * code changes are needed. The content tests check every id and reference.
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
import shortBowItem from "./items/short-bow";
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
  shortBowItem,
  staffItem,
  swordItem,
  trinketItem,
  woodenShieldItem,
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

export const library: Library = {
  classes,
  items,
  abilities,
  statuses,
  monsters,
  skills,
  perks,
  encounters,
};

export { heroNames } from "./names";
