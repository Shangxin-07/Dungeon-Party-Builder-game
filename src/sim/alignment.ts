/**
 * Alignment (DESIGN.md §7). Every hero is Good, Neutral or Evil (content in
 * content/alignments/). If two-thirds of a party share an alignment, that's
 * the party's alignment, and everyone else should be within one step of it.
 * Anything else costs morale on the trip; it's never a ban.
 */
import type { AlignmentDef } from "../content/types";
import type { Hero } from "./hero";
import type { Index } from "./library";
import { createRng } from "./rng";

/** A stable number from a string, so alignments don't use up the dice. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A hero's alignment, worked out from their id and name like their
 * personality, so old saves get the same one every time they load.
 */
export function rollAlignment(ix: Index, id: string, name: string): string {
  const rng = createRng(hash(`${id}|${name}|alignment`));
  const list = ix.lib.alignments;
  let roll = rng.next() * list.reduce((s, a) => s + a.weight, 0);
  return (list.find((a) => (roll -= a.weight) < 0) ?? list.at(-1)!).id;
}

/** Steps between two alignments: 0 the same, 1 next door, 2 Good and Evil. */
export const steps = (ix: Index, a: string, b: string): number =>
  Math.abs(ix.alignment(a).position - ix.alignment(b).position);

export interface PartyAlignment {
  /** The alignment two-thirds of the party share, or undefined if divided. */
  alignment?: AlignmentDef;
  divided: boolean;
  /** Heroes two or more steps from the party's alignment. */
  mismatched: Hero[];
  /** Heroes who clash: the mismatched, and party members two steps from one of them. */
  clashing: Hero[];
  /** Good and Evil in the same party, allowed or not. */
  friction: boolean;
}

/** Work out a party's alignment and who clashes (DESIGN.md §7). */
export function partyAlignment(ix: Index, party: readonly Hero[]): PartyAlignment {
  const counts = new Map<string, number>();
  for (const h of party) counts.set(h.alignment, (counts.get(h.alignment) ?? 0) + 1);
  let alignment: AlignmentDef | undefined;
  for (const [id, n] of counts)
    if (party.length && n * 3 >= party.length * 2) alignment = ix.alignment(id);
  const mismatched = alignment
    ? party.filter((h) => steps(ix, h.alignment, alignment!.id) >= 2)
    : [];
  const clashing = party.filter(
    (h) =>
      mismatched.includes(h) || mismatched.some((m) => steps(ix, m.alignment, h.alignment) >= 2),
  );
  const positions = party.map((h) => ix.alignment(h.alignment).position);
  const friction = party.length > 1 && Math.max(...positions) - Math.min(...positions) >= 2;
  return { alignment, divided: party.length > 1 && !alignment, mismatched, clashing, friction };
}

/** One line for the party panel: "Party alignment: Good" or what's wrong. */
export function describeParty(ix: Index, party: readonly Hero[]): string {
  if (!party.length) return "";
  const p = partyAlignment(ix, party);
  if (p.divided)
    return "Divided: no two-thirds share an alignment, so everyone loses a little morale each day down there.";
  const parts = [`Party alignment: ${p.alignment!.name}.`];
  for (const m of p.mismatched)
    parts.push(
      `${m.name} (${ix.alignment(m.alignment).name}) clashes with a ${p.alignment!.name} party: they and those they clash with lose morale each day.`,
    );
  if (!p.mismatched.length && p.friction)
    parts.push("Good and Evil together: allowed with a Neutral majority, but a little uneasy.");
  return parts.join(" ");
}
