/**
 * Ties between heroes (M8.32, DESIGN.md §21, content/ties/): siblings, old
 * comrades, bad blood. A pair's tie comes from their backstories (and
 * surnames) and a roll from their two ids, so it's the same every time and
 * needs no saving. Ties matter when both go down together: a little morale
 * after the trip, and a small edge (or a snag) in every fight the other starts.
 */
import type { PassiveEffect, TieDef } from "../content/types";
import type { Hero } from "./hero";
import type { Index } from "./library";
import { createRng } from "./rng";

type Who = Pick<Hero, "id" | "name" | "backstory" | "surname">;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const fits = (ix: Index, h: Who, tags: readonly string[]) =>
  !tags.length || ix.backstory(h.backstory).tags.some((t) => tags.includes(t));

/**
 * The tie between two heroes, if any, with them in the order the tie names
 * them ({a} fits the first list, {b} the second).
 */
export function tieBetween<H extends Who>(
  ix: Index,
  x: H,
  y: H,
): { tie: TieDef; a: H; b: H } | undefined {
  if (x.id === y.id) return undefined;
  const [p, q] = x.id < y.id ? [x, y] : [y, x];
  const rng = createRng(hash(`${p.id}|${q.id}|tie`));
  for (const tie of ix.lib.ties) {
    // Every tie rolls, fitting or not, so adding one doesn't reshuffle the others.
    const roll = rng.next();
    if (tie.sameSurname && p.surname !== q.surname) continue;
    const [first, second] = tie.between;
    const order: [H, H] | undefined =
      fits(ix, p, first) && fits(ix, q, second)
        ? [p, q]
        : fits(ix, q, first) && fits(ix, p, second)
          ? [q, p]
          : undefined;
    if (order && roll < tie.chance) return { tie, a: order[0], b: order[1] };
  }
  return undefined;
}

/** Every tie among a group of heroes. */
export function tiesAmong<H extends Who>(ix: Index, heroes: readonly H[]) {
  const out: { tie: TieDef; a: H; b: H }[] = [];
  for (let i = 0; i < heroes.length; i++)
    for (let j = i + 1; j < heroes.length; j++) {
      const t = tieBetween(ix, heroes[i]!, heroes[j]!);
      if (t) out.push(t);
    }
  return out;
}

/** A tie's line, with the names in. */
export const tieText = (t: { tie: TieDef; a: Who; b: Who }) =>
  t.tie.text.replaceAll("{a}", t.a.name).replaceAll("{b}", t.b.name);

/** Fight passives from ties, by hero id, for heroes whose partner is on their feet. */
export function bondsFor(
  ix: Index,
  standing: readonly Hero[],
): Record<string, readonly PassiveEffect[]> {
  const out: Record<string, PassiveEffect[]> = {};
  for (const { tie, a, b } of tiesAmong(ix, standing)) {
    if (!tie.passives?.length) continue;
    for (const h of [a, b]) (out[h.id] ??= []).push(...tie.passives);
  }
  return out;
}
