/**
 * The town: buildings and house rules.
 */
import type { Stat } from "./core";
import type { PorterRules } from "./dungeon";

/** Materials by item id, e.g. { "iron-ore": 4 } (DESIGN.md §8, content/materials/). */
export type MaterialCost = Readonly<Record<string, number>>;

/** What a building level gives the town. Each level lists its full effects. */
export type BuildingEffect =
  /** Heroes that can go on one expedition. */
  | { type: "partySlots"; amount: number }
  /** Heroes the guild can keep on its books. */
  | { type: "rosterSize"; amount: number }
  /** Items for sale in town. */
  | { type: "sells"; items: readonly string[] }
  /** Holds back this much overflow strength climbing out of the pit (DESIGN.md §8). */
  | { type: "defence"; amount: number }
  /** See the next night's overflow this many days ahead. */
  | { type: "raidWarning"; days: number }
  /**
   * Watch the top floors from the pit's edge (M7.13): how full the top
   * `floors` floors are, roughly, and the number on the top `exact` floors.
   */
  | { type: "watch"; floors: number; exact: number }
  /** Extra recruits looking for work each day. */
  | { type: "recruitOffers"; amount: number }
  /** Each recruit is the best of this many extra candidates (by their two best stats). */
  | { type: "recruitPicks"; amount: number }
  /**
   * This many of each day's recruits come already trained: a class and its
   * starting kit, for the hire cost plus the kit's value (M6).
   */
  | { type: "trainedRecruits"; amount: number }
  /** Morale for each hero on every rest day in town. */
  | { type: "restMorale"; amount: number }
  /** XP for each hero on every rest day in town. */
  | { type: "trainingXp"; amount: number }
  /** Extra XP, as a percent, from every trip. */
  | { type: "xpPercent"; amount: number }
  /** Share of the guild's gold (percent) that raiders can't get at. */
  | { type: "vault"; amount: number }
  /**
   * Bring the dead back (DESIGN.md §10): gold plus goldPerLevel × the hero's
   * level, plus `materials`, and they lose max(levels, percent% of their
   * level) off the top.
   */
  | {
      type: "resurrect";
      gold: number;
      goldPerLevel: number;
      levels: number;
      percent: number;
      materials?: MaterialCost;
    }
  /** Lay the dead to rest, for this much gold (DESIGN.md §10). */
  | { type: "burial"; gold: number }
  /** Injuries mend this many extra days for every day in town (the Apothecary). */
  | { type: "healing"; amount: number }
  /**
   * A workshop (M7.14, DESIGN.md §18.1): this many heroes (or porters) can
   * work its benches at once, on the recipes in content/recipes/ for it.
   */
  | { type: "workshop"; benches: number }
  /** Room for this many townsfolk (M7.15, Cottages). */
  | { type: "housing"; amount: number }
  /** Food the town grows or hunts each day (M7.15, the Farm). */
  | { type: "food"; amount: number }
  /**
   * The parties ride a cage down past this many floors (the Mine Cage): a
   * trip skips their rooms and the days they take. Never the target floor,
   * nor a floor a rescue party has to search.
   */
  | { type: "lift"; floors: number }
  /**
   * Percentage points added to the share of value paid for a trip's haul
   * (the Black Market's fence, DESIGN.md §7). Still never above haggle.max.
   */
  | { type: "fence"; amount: number }
  /**
   * The share (percent) of an item's salvage list the Blacksmith gets out of
   * it (M7.03, DESIGN.md §17.4): rounded down, at least 1 of each.
   */
  | { type: "salvage"; amount: number }
  /** Research desks (M7.07, DESIGN.md §17.7): heroes who study here instead of delving. */
  | { type: "researchDesks"; amount: number }
  /** Percentage points on the chance a day that settlers arrive (M8.19, Renown). */
  | { type: "settlerChance"; amount: number }
  /** Percentage points on the chance a day that an offer turns up (M8.19, Renown). */
  | { type: "offerChance"; amount: number }
  /** Contracts pay this many percent more (M8.19, Renown). */
  | { type: "contractPay"; amount: number }
  /** The unburied dead lie still this many days longer before they rise (M8.19, blessings). */
  | { type: "riseDelay"; amount: number };

export interface BuildingLevel {
  /** Gold to build or upgrade to this level. */
  cost: number;
  /** Materials it also needs, used up when the work starts. */
  materials?: MaterialCost;
  /**
   * Days the builders need. The building keeps working at its old level until
   * the work is done (0 = ready at once).
   */
  days: number;
  /** One line shown in town, e.g. "4 heroes per party, 8 on the roster". */
  summary: string;
  effects: readonly BuildingEffect[];
  /** Renown the town needs before it can build this level (M8.19, DESIGN.md §20). */
  renown?: number;
}

/** A town building (DESIGN.md §8). Level 0 means not built yet. */
export interface BuildingDef {
  id: string;
  name: string;
  blurb: string;
  /** Level the town starts with (0 = not built). */
  startLevel: number;
  /** Raids never damage it (the heroes live here; it's always defended). */
  raidProof?: boolean;
  /** levels[0] is level 1, levels[1] is level 2, and so on. */
  levels: readonly BuildingLevel[];
  /**
   * Only deals with heroes of these alignments (DESIGN.md §7: the Black
   * Market and Evil heroes). Its effects only work while the guild has one
   * on its books.
   */
  dealsWith?: readonly string[];
  /** How it looks on the town map (M8, DESIGN.md §19). Missing: a plain house on no plot. */
  art?: BuildingArt;
}

/**
 * The drawn looks the town map knows (src/ui/town/map/). Most grow with level;
 * the wall, gate, watchtowers and headframe are drawn round the pit, not on a plot.
 */
export const BUILDING_SHAPES = [
  "hall",
  "house",
  "tower",
  "temple",
  "stalls",
  "yard",
  "field",
  "graves",
  "cottages",
  "block",
  "wall",
  "gate",
  "watchtowers",
  "headframe",
] as const;
export type BuildingShape = (typeof BUILDING_SHAPES)[number];

/** Sign glyphs the town map can draw over a door. */
export const SIGN_GLYPHS = [
  "shield",
  "mug",
  "coin",
  "anvil",
  "flask",
  "sword",
  "book",
  "sun",
  "eye",
  "saw",
  "key",
] as const;
export type SignGlyph = (typeof SIGN_GLYPHS)[number];

/** A building's look on the town map (M8, DESIGN.md §19). */
export interface BuildingArt {
  /** Its plot (content/townmap.ts). Not needed for the wall, gate, watchtowers and headframe. */
  plot?: string;
  shape: BuildingShape;
  /** Roof colour, a CSS hex colour. */
  roof?: string;
  sign?: SignGlyph;
  /** Smoke from the chimney (forges and the like). */
  smoke?: boolean;
  /**
   * Picture art that replaces the drawn shape: a sprite sheet registered in
   * src/ui/town/map/sprites.ts (frames side by side). `frames[level - 1]` is
   * the frame for that level; levels past the list use the last one.
   */
  sprite?: { sheet: string; frames: readonly number[] };
  /**
   * Picture art for the building's card only, when the map draws it another
   * way (the palisade's ring). Same shape as `sprite`.
   */
  card?: { sheet: string; frames: readonly number[] };
}

/** Where things stand on the town map (M8, DESIGN.md §19). Coordinates are map units. */
export interface TownMapDef {
  width: number;
  height: number;
  /** The pit, dead centre. */
  pit: { x: number; y: number; rx: number; ry: number };
  /** The palisade's ring round the pit; the gate and watchtowers stand on it. */
  wall: { rx: number; ry: number };
  /** The trodden ground of the town round the pit, where the buildings stand. */
  town: { rx: number; ry: number };
  /** Plots by id. Each building with a plot stands with its door (bottom centre) here. */
  plots: Record<string, { x: number; y: number }>;
}

/** How a new town starts and the house rules of the guild. */
export interface TownRules {
  startingGold: number;
  /**
   * How many untrained recruits are waiting on day 1, free to sign: the player
   * picks each one's class and kits them out from the store room (M6).
   */
  startingRecruits: number;
  /**
   * Classes `autoStart` gives the starting recruits, in order ("pick for me",
   * the bot and tests). The player is free to choose others.
   */
  startingRoster: readonly string[];
  /** Item ids in the guild's store room at the start. */
  startingStash: readonly string[];
  /** Fresh faces looking for work each day. */
  recruitsOnOffer: number;
  /** Gold to sign an untrained recruit (no class, no gear). */
  hireCost: number;
  /**
   * Training (M9.10): points a recruit, porter or miner places on their own
   * stats when they take their first class, at most `maxPerStat` on one stat.
   * The class's gates are checked after.
   */
  training: { points: number; maxPerStat: number };
  /**
   * The Market pays more for a haul, and for anything sold, the better the
   * guild's best haggler: (Appraisal − 50) × perAppraisal + (CHA − 10) × perCha
   * on top of the usual rate, never above `max` (M6).
   */
  haggle: { perAppraisal: number; perCha: number; max: number };
  porters: PorterRules;
  /** Share of an item's value the Market pays when you sell it. */
  sellRate: number;
  /**
   * Share of the real value the Market pays for a trip's haul. Items tagged
   * "coins" are always worth their face value.
   */
  haulRate: number;
  /**
   * Salvage (M7.03, DESIGN.md §17.4): scrap for items with no salvage list of
   * their own, by tag (the first tag that matches), as material id -> amount.
   */
  salvage: { byTag: Readonly<Record<string, Readonly<Record<string, number>>>> };
  /** Share of max HP a hero gets back for each day spent in town. */
  restPercent: number;
  /** Repairing a raid-damaged building costs this share of what it cost to build. */
  repairRate: number;
  /**
   * Pay (M7.12, DESIGN.md §18.2). A hero at home draws a daily retainer:
   * `base` gold plus 1 for every `levelsPerGold` levels. Heroes away on a trip
   * draw nothing; they're paid by their share. Anyone who can't be paid loses
   * morale ("unpaid").
   */
  retainer: { base: number; levelsPerGold: number };
  /**
   * A party takes `percent` of what its haul is worth at the Market when it
   * comes home, split between the heroes who went (one share each, more after
   * a raise) and porters (`porter` shares each). What the purse can't cover
   * is owed and paid first thing each day.
   */
  shares: { percent: number; porter: number };
  /**
   * Veterans ask for raises (M6): every `everyLevels` levels since their last
   * raise talk, a hero asks for `amount` more gold a day on their retainer.
   * Gold-motivated heroes ask for a bigger cut instead: `share` more shares of
   * every haul. Unanswered after `patienceDays`, it counts as a no.
   */
  raises: { everyLevels: number; amount: number; share: number; patienceDays: number };
  /**
   * Heroes resting in town lend the builders a hand (M6). Each fit hero at
   * home (not away, not injured) adds `perHero` days of work a day, more or
   * less by (STR − 10) × `perStr` of that. All of them together add at most
   * `maxPerDay` days of work a day, to the oldest job first.
   */
  helpers: { perHero: number; perStr: number; maxPerDay: number };
  /**
   * Loot table rolled once for every raider killed at the pit (DESIGN.md §8:
   * fallen raiders drop materials). Materials go to the store, coins to the
   * guild's gold, anything else to the store room.
   */
  raidSpoils?: string;
}

/**
 * What a hero on a post does (DESIGN.md §8). Each hero on the post adds it,
 * on every day they're at home and fit to work.
 */
export type PostEffect =
  /** Holds back this much overflow strength at night, per hero. */
  | { type: "defence"; amount: number }
  /** See the overflow coming this many nights ahead (one hero is enough). */
  | { type: "raidWarning"; days: number }
  /** Watch the top floors (M7.13), as the building effect. */
  | { type: "watch"; floors: number; exact: number }
  /** Roll this loot table `rolls` times a day per hero: materials to the store, coins to gold. */
  | { type: "gather"; loot: string; rolls: number };

/**
 * A post round the pit (DESIGN.md §8, content/posts/): heroes at home can be
 * put on one. Posts start as makeshift camp duties in the opening and stay
 * useful for heroes who aren't delving.
 */
export interface PostDef {
  id: string;
  name: string;
  blurb: string;
  /** Heroes it has room for. */
  slots: number;
  effects: readonly PostEffect[];
  /** Porters can work it (they never fight, so not the barricade). */
  porters?: boolean;
  /**
   * Townsfolk can work it too (M7.15). They share its slots with heroes and
   * never add defence, so the barricade is the heroes' job.
   */
  settlers?: boolean;
  /** Only at the mining camp (DESIGN.md §8): gone once the opening is over. */
  campOnly?: boolean;
}

/**
 * The opening (DESIGN.md §8): a new game can start at the undefended mining
 * camp. No delving until the `unlock` buildings are up.
 */
export interface OpeningRules {
  /** Replaces the town's startingGold in a camp game. */
  startingGold: number;
  /** Replaces the town's startingStash: makeshift kit from the camp. */
  startingStash: readonly string[];
  /** Buildings that start at level 0 at the camp, whatever their startLevel. */
  unbuilt: readonly string[];
  /** Roster size before the Guild Hall is built. */
  campRoster: number;
  /**
   * The class everyone at the camp holds (a "camp" kind class): the starting
   * heroes begin in it, and anyone signed there joins in it. Once the camp is
   * held, each picks a base class.
   */
  campClass: string;
  /** Building id -> level needed before parties can go down. */
  unlock: Readonly<Record<string, number>>;
  /** Items that arrive in the store room when the camp is held (the guild's proper kit). */
  heldStash: readonly string[];
  /**
   * Swaps the miners will make at the camp, so a run of bad luck in what the
   * posts bring in can't stall the build, e.g. 2 iron ore for 1 timber.
   */
  trades: readonly { give: MaterialCost; get: MaterialCost }[];
}

/**
 * Research at the Library (M7.07, DESIGN.md §17.7, content/research.ts).
 * Heroes at its desks add points every day; kills and specimens add more.
 */
export interface ResearchRules {
  /** Points per day: (INT − intBase), at least 0 ... */
  intBase: number;
  /** ... plus this share of the hero's Lore skill ... */
  loreShare: number;
  /** ... times (1 + this percent / 100) for a Knowledge-motivated hero. */
  knowledgeBonus: number;
  /** XP a hero earns for each day at a desk. */
  xpPerDay: number;
  /** Points a monster's research gets for each one a party kills. */
  killPoints: number;
  /** Points to reach Studied and Mastered, per point of monster power, when a monster doesn't say. */
  perPower: readonly [number, number];
  /** Extra damage the guild deals to a monster it has Studied, then Mastered, in percent. */
  damage: readonly [number, number];
  /** Once Mastered, this percent of the monster's resistances still works (immunities stay). */
  masteredResist: number;
}

/**
 * A recipe (M7.14, DESIGN.md §18.1, content/recipes/): something a workshop
 * makes. The materials and gold are paid when the job is queued (and given
 * back if it's called off); then the workers at the benches put in the work
 * a day at a time.
 */
export interface RecipeDef {
  id: string;
  /** The workshop building it's made in, and the level that needs (default 1). */
  workshop: string;
  level?: number;
  /** Item id made, and how many (default 1). Materials go to the store, the rest to the store room. */
  makes: string;
  count?: number;
  /** What the job is called, if the item's name won't do ("4 rolls of bandages"). */
  name?: string;
  materials: MaterialCost;
  gold?: number;
  /** Work it takes, in days of one average worker. */
  work: number;
  /** The stat that speeds it up (STR at the forge, INT at the still). */
  stat: Stat;
}

/**
 * How work at the benches goes (M7.14). A worker puts in `perDay` work a day,
 * plus `perStat` for every point of the recipe's stat over 10 (never below
 * `minDay`); porters work at `porter` of that. A day at the benches isn't a
 * day off: workers rest at `rest` of the usual rate. Each workshop holds at
 * most `queue` jobs waiting.
 */
export interface WorkshopRules {
  perDay: number;
  perStat: number;
  minDay: number;
  porter: number;
  rest: number;
  queue: number;
  /** Work a townsperson at a bench puts in a day (M7.15): no stats, steady. */
  settler: number;
}

/**
 * Townsfolk (M7.15, DESIGN.md §18.1b/2b): settlers come when the pit is held
 * and there's housing and food, pay a little tax, and can work posts and
 * benches. Raids that get through scare them off.
 */
export interface TownsfolkRules {
  /** Days since a raid last got through before anyone will settle. */
  safeDays: number;
  /** Chance a day that settlers turn up when there's room, food and safety, and at most how many. */
  arrivalChance: number;
  arrivalMax: number;
  /** Food each settler eats a day, and the most the stores hold. */
  eats: number;
  foodStore: number;
  /** Gold each settler pays a day; and every `marketEvery` days with a Market, `marketDay` more each. */
  tax: number;
  marketEvery: number;
  marketDay: number;
  /** A raid that gets through: this share of the settlers leave (rounded up). */
  fleeOnRaid: number;
}

/**
 * Town news (M7.17, DESIGN.md §18.1c): offers that turn up in town, want an
 * answer, and go away again (content/offers/).
 */
interface OfferCommon {
  id: string;
  /** The headline: "A caravan from the coast". */
  name: string;
  /** What it says when it turns up, for the news and the panel. */
  text: string;
  /** Relative chance of being the one that turns up. */
  weight: number;
  /** Days it waits for an answer before it goes. */
  days: number;
  /** Not before this town day. */
  minDay?: number;
  /** Only with this building standing. */
  needs?: string;
}

/** A caravan: buys materials, sells a few things the Market doesn't. */
export interface CaravanOffer extends OfferCommon {
  kind: "caravan";
  /** Gold it pays for each of these materials, as many as you have. */
  buys: Readonly<Record<string, number>>;
  /** What it sells, one of each, at these prices. */
  sells: readonly { item: string; price: number }[];
}

/** A contract: deliver materials by a day for gold. */
export interface ContractOffer extends OfferCommon {
  kind: "contract";
  wants: MaterialCost;
  reward: number;
  /** Days from taking it on to deliver. */
  deadline: number;
}

/** What granting a petition does. */
export type PetitionEffect =
  /** Settlers move in, if there's room in the Cottages. */
  | { type: "folk"; count: number }
  /** Food into the town's store. */
  | { type: "food"; amount: number }
  /** Morale for every hero at home. */
  | { type: "morale"; amount: number }
  /** Materials into the store. */
  | { type: "materials"; materials: MaterialCost };

/** A petition from the townsfolk: costs gold (and materials), does some good. */
export interface PetitionOffer extends OfferCommon {
  kind: "petition";
  gold: number;
  materials?: MaterialCost;
  effect: PetitionEffect;
  /** Only once there are this many settlers. */
  minFolk?: number;
}

/**
 * A visitor: a well-known hero passing through who'll join, free and kitted,
 * if their favourite building is standing (and there's room on the roster).
 */
export interface VisitorOffer extends OfferCommon {
  kind: "visitor";
  /** Base classes they might be; picked at random. */
  classes?: readonly string[];
  /** The best of this many rolls of their class's main stats. */
  picks: number;
}

export type OfferDef = CaravanOffer | ContractOffer | PetitionOffer | VisitorOffer;

/**
 * Renown (M8.19, DESIGN.md §20): how far the guild's name has gone. Deeds
 * add to it (a breach takes some away); each rank it reaches works like a
 * building, with effects of its own.
 */
export interface RenownRules {
  deeds: Record<RenownDeed, number>;
  /** From lowest; the first is where every town starts (`at` 0). */
  ranks: readonly RenownRank[];
}

export type RenownDeed = "shard" | "stone" | "lair" | "contract" | "petition" | "breach" | "core";

export interface RenownRank {
  at: number;
  name: string;
  /** What the town gets at this rank, shown in town. */
  summary: string;
  /** Everything from this rank and below adds up. */
  effects: readonly BuildingEffect[];
}

/**
 * A dig site (M8.20, DESIGN.md §20): a building slot on a held floor (one
 * whose stairs below are held by a Seal Stone's gateway). Built and raised
 * like a building, one of each per floor; it works while the gateway holds
 * and the floor is quiet enough for the diggers.
 */
export interface DigSiteDef {
  id: string;
  name: string;
  blurb: string;
  /** Only on a floor sealed this way ("cleansed" or "bound"): the shrine and the den. */
  way?: string;
  levels: readonly DigSiteLevel[];
  /** Its icon on the panel. Missing: none. */
  icon?: string;
}

export interface DigSiteLevel {
  cost: number;
  materials?: MaterialCost;
  /** Days the diggers need. */
  days: number;
  summary: string;
  /** Town-wide effects while it works (the shrine, the den). */
  effects?: readonly BuildingEffect[];
  /** Materials it sends up each day while it works (the mine); fractions add up. */
  yields?: Record<string, number>;
  /** More it sends up from this floor down (deep-silver lies deep). */
  deepYields?: { from: number; materials: Record<string, number> };
  /**
   * A forward camp: parties going this deep or deeper walk the guild's own
   * paths down to it (`path` hours a floor, there and back) instead of the
   * floors' rooms, and the party sleeps there on the way down, healing
   * `rest` percent of their HP and mana.
   */
  camp?: { path: number; rest: number };
}

/** Dig sites (M8.20): how many a held floor takes, and how quiet it must be. */
export interface DigRules {
  /** Sites a held floor has room for: `base` plus `perFloor` for each floor deep. */
  slots: { base: number; perFloor: number };
  /** Sites only work while the floor holds at most this share of its capacity. */
  quiet: number;
}

/**
 * A story chapter (M8.21, DESIGN.md §20): opened by something the guild
 * does, it brings news to town, a page of the Foreman's to read, and maybe
 * a reveal about a floor. Chapters are content (content/story/): add beats
 * without touching code.
 */
export interface ChapterDef {
  id: string;
  /** Where it sits among the pages, lowest first. */
  order: number;
  title: string;
  when: StoryTrigger;
  /** What the town hears when it opens. */
  news: string;
  /** The Foreman's page: paragraphs split by blank lines. */
  page: string;
  /** What it tells the guild about a floor, shown with that floor's shards. */
  reveal?: { floor: number; text: string };
}

/** What opens a chapter. */
export type StoryTrigger =
  /** The guild starts delving: a new game, or the mining camp held. */
  | { kind: "start" }
  /** This many shards of the Hearthstone found, in all. */
  | { kind: "shards"; count: number }
  /** A Seal Stone set on the stairs below this floor. */
  | { kind: "sealed"; floor: number }
  /**
   * A party reached a heart (M8.22): `shut`, and shut it off. `heart` names
   * it (content/hearts/); left out, the first, the Hearthstone's.
   */
  | { kind: "core"; shut: boolean; heart?: string }
  /** The guild chose this way for a heart's stone (M8.41): mended or bound. */
  | { kind: "way"; heart: string; way: string };

/** How often offers turn up (M7.17, content/offers.ts). */
export interface OfferRules {
  /** Chance a day that something turns up, while fewer than `max` are waiting. */
  chancePerDay: number;
  max: number;
}
