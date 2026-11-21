/**
 * Hiring, training porters, dismissing, and choosing level-ups.
 */
import type { Stat } from "../../content/types";
import { baseClasses, EQUIP_SLOTS, heroSheet, trainRecruit, classFit, type Hero } from "../hero";
import { chooseClass, gainXp, spendLevelUp } from "../levels";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import { type TownState, TownError, newRecord } from "./state";
import { partySlots, rosterSize, built } from "./read";
import { news, book, roll, edit, hero } from "./internal";
import { kitOut, keepHpInBounds } from "./gear";

/** Gold to sign a recruit as a porter: free too while the starting heroes are signing up. */
export function porterPrice(ix: Index, town: TownState): number {
  return (town.freeHires ?? 0) > 0 ? 0 : ix.lib.town.porters.hireCost;
}

/** Gold to sign this recruit: free while the starting heroes are signing up. */
export function hirePrice(ix: Index, town: TownState, recruit: Hero): number {
  if ((town.freeHires ?? 0) > 0) return 0;
  const kit = recruit.untrained
    ? 0
    : [...EQUIP_SLOTS.map((s) => recruit.equipment[s]), ...recruit.pack]
        .filter((id): id is string => !!id)
        .reduce((s, id) => s + ix.item(id).value, 0);
  return ix.lib.town.hireCost + kit;
}

/**
 * Sign a recruit. An untrained one (M6) is trained in `classId` (default: the
 * class their stats suit best) and joins with no gear; kit them out from the
 * store room or the Market. A trained one (the Tavern) comes with their kit.
 */
export function hire(ix: Index, town: TownState, recruitId: string, classId?: string): TownState {
  const t = edit(town);
  const i = t.recruits.findIndex((r) => r.id === recruitId);
  if (i < 0) throw new TownError("That recruit has moved on.");
  if (t.roster.length >= rosterSize(ix, t))
    throw new TownError("The roster is full. Upgrade the Guild Hall or dismiss someone.");
  const price = hirePrice(ix, t, t.recruits[i]!);
  if (t.gold < price) throw new TownError("Not enough gold.");
  if (classId && !baseClasses(ix).some((c) => c.id === classId))
    throw new TownError("Recruits can only start in a base class.");
  const [recruit] = t.recruits.splice(i, 1);
  const h = recruit!.untrained ? trainRecruit(ix, recruit!, classId ?? recruit!.classId) : recruit!;
  if ((t.freeHires ?? 0) > 0) t.freeHires -= 1;
  else book(t, "hired", -price);
  t.roster.push(h);
  t.records[h.id] = newRecord(t.day);
  if (t.party.length < partySlots(ix, t)) t.party.push(h.id);
  return t;
}

/**
 * Sign an untrained recruit as a porter (M6): cheap, carries loot, never
 * fights. They watch, and after enough fights can be trained (trainPorter).
 */
export function hirePorter(ix: Index, town: TownState, recruitId: string): TownState {
  const t = edit(town);
  const rules = ix.lib.town.porters;
  const i = t.recruits.findIndex((r) => r.id === recruitId);
  if (i < 0) throw new TownError("That recruit has moved on.");
  if (!t.recruits[i]!.untrained) throw new TownError("A trained hero won't carry bags.");
  if (t.roster.length >= rosterSize(ix, t))
    throw new TownError("The roster is full. Upgrade the Guild Hall or dismiss someone.");
  const price = porterPrice(ix, t);
  if (t.gold < price) throw new TownError("Not enough gold.");
  const [p] = t.recruits.splice(i, 1);
  p!.porter = { watched: 0, xp: 0 };
  p!.hp = heroSheet(ix, p!).derived.maxHp;
  // A starting recruit signed as a porter uses up one of the free hires, or the
  // guild would wait for them forever and no new recruits would come.
  if ((t.freeHires ?? 0) > 0) t.freeHires -= 1;
  else book(t, "hired", -price);
  t.roster.push(p!);
  t.records[p!.id] = newRecord(t.day);
  t.porters ??= [];
  if (t.porters.length < rules.slots) t.porters.push(p!.id);
  return t;
}

/** Fights a porter still has to watch before they can be trained (0: ready). */
export const fightsToTrain = (ix: Index, h: Hero) =>
  h.porter ? Math.max(0, ix.lib.town.porters.trainAfterFights - h.porter.watched) : 0;

/**
 * Train a porter who has watched enough fights in a class (M6). They keep
 * their name, mood and record, and the XP they banked watching is paid out.
 */
export function trainPorter(
  ix: Index,
  town: TownState,
  heroId: string,
  classId: string,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  if (!h.porter) throw new TownError(`${h.name} isn't a porter.`);
  const left = fightsToTrain(ix, h);
  if (left)
    throw new TownError(
      `${h.name} needs to watch ${left} more ${left === 1 ? "fight" : "fights"}.`,
    );
  if (!baseClasses(ix).some((c) => c.id === classId))
    throw new TownError("Porters can only train in a base class.");
  const banked = h.porter.xp;
  const trained = trainRecruit(ix, h, classId);
  delete trained.porter;
  roll(t, (rng) => gainXp(ix, trained, banked, rng, built(t)));
  t.roster[t.roster.findIndex((x) => x.id === heroId)] = trained;
  t.porters = (t.porters ?? []).filter((id) => id !== heroId);
  if (t.party.length < partySlots(ix, t)) t.party.push(heroId);
  return t;
}

/**
 * Sign up all the starting recruits and kit them out from the store room, as
 * a player who wants to get going might ("pick for me"). Classes come from
 * `classIds`, less any already signed, each going to the recruit whose stats
 * suit it best; anyone left over takes the class that suits them.
 */
export function autoStart(
  ix: Index,
  town: TownState,
  classIds: readonly string[] = ix.lib.town.startingRoster,
): TownState {
  const wanted = [...classIds];
  for (const h of town.roster) {
    const i = wanted.indexOf(h.classId);
    if (i >= 0) wanted.splice(i, 1);
  }
  let t = town;
  const sign = (id: string, classId?: string) => {
    t = hire(ix, t, id, classId);
    t = kitOut(ix, t, t.roster.at(-1)!.id, false);
  };
  for (const classId of wanted) {
    const open = t.recruits.filter((r) => r.untrained);
    if (!(t.freeHires > 0) || !open.length) break;
    const best = open.reduce((a, b) =>
      classFit(ix, b.stats, classId) > classFit(ix, a.stats, classId) ? b : a,
    );
    sign(best.id, classId);
  }
  while (t.freeHires > 0 && t.recruits.length) sign(t.recruits[0]!.id);
  return t;
}

/** Let a hero go. The guild keeps the gear it gave them. */
export function dismiss(_ix: Index, town: TownState, heroId: string): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  for (const slot of EQUIP_SLOTS) if (h.equipment[slot]) t.stash.push(h.equipment[slot]!);
  t.stash.push(...h.pack);
  t.roster = t.roster.filter((x) => x.id !== heroId);
  t.party = t.party.filter((id) => id !== heroId);
  t.porters = (t.porters ?? []).filter((id) => id !== heroId);
  return t;
}

/**
 * Put a hero's oldest level-up into a class (DESIGN.md §9): one they have, or
 * a new one they meet the requirements for. Its stat gains come in now and
 * the perk offers are rolled. There's no taking it back.
 */
export function chooseLevelClass(
  ix: Index,
  town: TownState,
  heroId: string,
  classId: string,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  const isNew = !(h.classes ?? {})[classId];
  try {
    roll(t, (rng) => chooseClass(ix, h, classId, rng, built(t)));
  } catch (e) {
    throw new TownError((e as Error).message);
  }
  if (isNew) news(t, `${h.name} has started training as a ${ix.cls(classId).name}.`, "good");
  return keepHpInBounds(ix, t, h);
}

/**
 * Spend a hero's oldest level-up (DESIGN.md §9): learn one of the perks on
 * offer and, every few levels, add a free stat point. Granting the perk they
 * wanted cheers them up.
 */
export function chooseLevelUp(
  ix: Index,
  town: TownState,
  heroId: string,
  perk: string | undefined,
  stat?: Stat,
): TownState {
  const t = edit(town);
  const h = hero(t, heroId);
  let wanted = false;
  try {
    wanted = roll(t, (rng) => spendLevelUp(ix, h, perk, stat, rng, built(t))).wanted;
  } catch (e) {
    throw new TownError((e as Error).message);
  }
  if (wanted) applyMorale(ix, h, { wantedPerk: 1 }, t.day);
  return keepHpInBounds(ix, t, h);
}
