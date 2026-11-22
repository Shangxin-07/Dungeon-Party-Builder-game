/**
 * The town (DESIGN.md §2, §8): everything the player does between trips.
 * Recruit and dismiss heroes, buy and sell at the Market, kit heroes out, pick
 * a party and its formation, set standing orders, upgrade buildings, launch.
 *
 * Every action is a pure function: it takes a TownState and returns a new one,
 * so the UI can keep it in a reducer and a save is just JSON. Randomness comes
 * from the state's own seed, so a town is as deterministic as an expedition.
 * Buildings and house rules are content (content/buildings/, content/town.ts).
 *
 * Actions return a new state, or throw a TownError saying why not. One file
 * per topic: state.ts (the TownState shape), read.ts (reading the town, no
 * changes), start.ts, roster.ts, gear.ts, market.ts, parties.ts, buildings.ts,
 * wounds.ts, days.ts (a day passing), bodies.ts (the fallen), posts.ts (posts
 * round the pit and the opening), launch.ts, haul.ts and debrief.ts (what
 * comes home, M7.03), research.ts (the Library, M7.07).
 * internal.ts holds shared helpers and isn't re-exported here.
 */
export { TOWN_VERSION, LEDGER_DAYS, TRIP_HISTORY, TownError, newRecord } from "./state";
export type {
  HeroRecord,
  Trapped,
  LostSite,
  ScavengedGear,
  Departure,
  Memorial,
  PitNight,
  TripReport,
  Outing,
  TownState,
  SavedParty,
  LedgerKind,
  LedgerLine,
  News,
  Construction,
  HeldItem,
  HaulRule,
  HaulChoice,
  ResearchState,
  ShelfItem,
  Desk,
  TownIntel,
} from "./state";
export {
  buildingEffects,
  partySlots,
  nextCommand,
  fmtCommand,
  rosterSize,
  defence,
  warningDays,
  restMorale,
  trainingXp,
  xpBonus,
  healingBonus,
  liftFloors,
  vaultShare,
  wage,
  wageBill,
  standing,
  built,
  forecast,
  repairCost,
  shopStock,
  buyPrice,
  haggler,
  marketRate,
  haulPrice,
  fence,
  willDeal,
  materialWords,
  postWorkers,
  openPosts,
  postEffects,
  fitForPost,
  campNeeds,
  materialsShort,
  sellPrice,
  findHero,
  maxHp,
  launchWarnings,
  rescueSite,
  rescueTarget,
  searchFloor,
  outingOf,
  outingStatus,
  awaySet,
  usualHours,
  usualDays,
  grumbles,
  cantLaunch,
} from "./read";
export { newTown, tidyFreeHires } from "./start";
export {
  hirePrice,
  hire,
  hirePorter,
  fightsToTrain,
  trainPorter,
  trainMiner,
  trainMiners,
  autoStart,
  dismiss,
  porterPrice,
  chooseLevelClass,
  chooseLevelUp,
} from "./roster";
export { buy, sell, restockPlan, restock } from "./market";
export type { RestockLine } from "./market";
export { kitOut, equip, unequip, packItem, unpackItem, setRow } from "./gear";
export {
  toggleParty,
  setLeader,
  setOrders,
  savedParty,
  partyLetter,
  saveParty,
  renameParty,
  partyOnFile,
  pickParty,
  sameOrders,
  planRescue,
  cancelRescue,
} from "./parties";
export { nextLevel, underConstruction, upgrade, builderHands, repair } from "./buildings";
export { answerRaise, rest, waitUntilBack, launchAndWait } from "./days";
export { resurrectQuote, resurrect, burialCost, bury } from "./bodies";
export { launch, giveUp, outingView } from "./launch";
export { assignPost, postOf, trade } from "./posts";
export {
  HAUL_RULES,
  salvageYield,
  salvageList,
  salvageOf,
  homeHaggler,
  haulSale,
  ruleChoice,
  haulPlan,
  setHaulRule,
  settleHaul,
  settleByRule,
  salvageStash,
  researchPlan,
} from "./haul";
export {
  TIER_NAMES,
  researchDesks,
  monsterNeeds,
  monsterTier,
  researchTiers,
  studyRate,
  researchTopics,
  canStudy,
  assignDesk,
  deskOf,
  deskTopic,
  researchable,
} from "./research";
export type { Topic } from "./research";
export { tripTally } from "./debrief";
export type { Tally, FloorTally, SlainLine } from "./debrief";
