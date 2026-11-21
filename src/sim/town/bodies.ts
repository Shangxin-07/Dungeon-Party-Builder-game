/**
 * The fallen in town (DESIGN.md §10): bodies, risen heroes, resurrection and burial.
 */
import { EQUIP_SLOTS, type Hero } from "../hero";
import {
  makeBody,
  resurrectTerms,
  risenName,
  type Body,
  type ResurrectTerms,
  type Risen,
} from "../fallen";
import { loseLevels } from "../levels";
import type { Index } from "../library";
import { applyMorale } from "../morale";
import { type LostSite, type TownState, TownError, newRecord } from "./state";
import { effects, rosterSize, maxHp, materialsShort, materialWords } from "./read";
import { news, book, edit, useMaterials } from "./internal";
import { guildFeels } from "./days";

/** A body taken from where it lies, for the town's lists. */
export function newBody(t: TownState, h: Hero, day: number, floor: number): Body {
  return makeBody(`b${t.nextThingId++}`, h, day, floor);
}

/**
 * A body left in the dungeon rises (DESIGN.md §10): it picks up whatever of
 * its own gear still lies there and joins the floor's monsters.
 */
export function rise(ix: Index, t: TownState, site: LostSite, b: Body): void {
  const equipment: Risen["equipment"] = {};
  for (const slot of EQUIP_SLOTS) {
    const id = b.gear[slot];
    const i = site.items.findIndex((it) => it.keep && it.owner === b.hero.name && it.item === id);
    if (!id || i < 0) continue;
    equipment[slot] = id;
    site.items.splice(i, 1);
  }
  const r: Risen = {
    id: `r${t.nextThingId++}`,
    body: b,
    equipment,
    floor: site.floor,
    rose: t.day,
  };
  t.risen = [...(t.risen ?? []), r];
  for (const m of t.memorial) if (m.heroId === b.hero.id) m.risen = true;
  news(
    t,
    `${b.hero.name}'s body was never brought home. Something wearing their face walks floor ${site.floor} now: ${risenName(ix, r)}.`,
    "bad",
  );
  guildFeels(ix, t, { comradeRose: 1 }, new Set());
}

/** Like any monster, the risen push up towards the pit (DESIGN.md §4). */
export function risenClimb(ix: Index, t: TownState): void {
  for (const r of t.risen ?? []) {
    const days = t.day - r.rose;
    if (r.floor <= 1 || days <= 0 || days % ix.lib.fallen.climbDays) continue;
    r.floor -= 1;
    news(t, `${risenName(ix, r)} has been seen on floor ${r.floor}, closer to the pit.`, "bad");
  }
}

/** What the Temple would ask to bring this body back, or why it can't. */
export function resurrectQuote(
  ix: Index,
  town: TownState,
  bodyId: string,
): { terms?: ResurrectTerms; why?: string } {
  const b = (town.bodies ?? []).find((x) => x.id === bodyId);
  if (!b) return { why: "That body isn't in town." };
  if (b.risen) return { why: `${b.hero.name} rose once already. All that's left is to bury them.` };
  const e = effects(ix, town).find((x) => x.type === "resurrect");
  if (!e) return { why: "You need a working Temple to bring anyone back." };
  const terms = resurrectTerms(e, b.hero);
  if (town.roster.length >= rosterSize(ix, town))
    return { terms, why: "The guild has no room on the roster." };
  if (town.gold < terms.gold) return { terms, why: `The priests want ${terms.gold} gold.` };
  const short = materialsShort(ix, town, terms.materials);
  if (short)
    return {
      terms,
      why: `The priests need ${materialWords(ix, terms.materials)} (short of ${short}).`,
    };
  return { terms };
}

/**
 * Bring a hero back from the dead at the Temple (DESIGN.md §10). They lose
 * their most recent levels (each comes back as it was when the XP is earned
 * again), come back weak and shaken, and rejoin the roster with no gear.
 */
export function resurrect(ix: Index, town: TownState, bodyId: string): TownState {
  const { terms, why } = resurrectQuote(ix, town, bodyId);
  if (why || !terms) throw new TownError(why ?? "The priests can't help.");
  const t = edit(town);
  const b = t.bodies.find((x) => x.id === bodyId)!;
  book(t, "temple", -terms.gold);
  useMaterials(t, terms.materials);
  const h = structuredClone(b.hero);
  const lost = loseLevels(ix, h, terms.levels);
  h.condition = "ok";
  h.mana = 0;
  h.injuries = [];
  h.fatigue = 0;
  h.raiseAsk = undefined;
  h.hp = Math.max(1, Math.round((maxHp(ix, h) * ix.lib.fallen.resurrectedHpPercent) / 100));
  applyMorale(ix, h, { resurrected: 1 }, t.day);
  t.roster.push(h);
  t.bodies = t.bodies.filter((x) => x !== b);
  t.memorial = t.memorial.filter((m) => m.heroId !== h.id);
  t.records[h.id] ??= newRecord(t.day);
  news(
    t,
    `${h.name} is back from the dead${lost ? `, ${lost} level${lost > 1 ? "s" : ""} poorer` : ""}.`,
    "good",
  );
  guildFeels(ix, t, { rescuedComrades: 1 }, new Set([h.id]));
  return t;
}

/** Gold to bury someone, or undefined without a working Graveyard. */
export function burialCost(ix: Index, town: TownState): number | undefined {
  const e = effects(ix, town).find((x) => x.type === "burial");
  return e?.gold;
}

/** Lay a body to rest in the Graveyard (DESIGN.md §10). The whole guild takes heart. */
export function bury(ix: Index, town: TownState, bodyId: string): TownState {
  const cost = burialCost(ix, town);
  if (cost === undefined) throw new TownError("You need a working Graveyard to bury anyone.");
  if (town.gold < cost) throw new TownError(`A burial costs ${cost} gold.`);
  const t = edit(town);
  const b = (t.bodies ?? []).find((x) => x.id === bodyId);
  if (!b) throw new TownError("That body isn't in town.");
  book(t, "burials", -cost);
  t.bodies = t.bodies.filter((x) => x !== b);
  for (const m of t.memorial) if (m.heroId === b.hero.id) m.buried = t.day;
  news(t, `${b.hero.name} was laid to rest in the Graveyard.`, "good");
  guildFeels(ix, t, { buriedComrade: 1 }, new Set());
  return t;
}
