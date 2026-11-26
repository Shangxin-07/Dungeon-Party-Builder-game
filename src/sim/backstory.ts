/**
 * Backstories and surnames (M8.29, DESIGN.md §21): where a hero came from
 * before the pit (content/backstories/). Worked out from the hero's id and
 * name like their alignment, so they don't use up the dice and old saves get
 * the same ones every time they load.
 */
import type { BackstoryDef } from "../content/types";
import type { Index } from "./library";
import { createRng } from "./rng";

/** A stable number from a string. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A hero's backstory and surname, weighted by how well each fits their alignment. */
export function rollBackstory(
  ix: Index,
  id: string,
  name: string,
  alignment: string,
): { backstory: string; surname: string } {
  const rng = createRng(hash(`${id}|${name}|backstory`));
  const list = ix.lib.backstories;
  const weight = (b: BackstoryDef) => b.weight * (b.alignments?.[alignment] ?? 1);
  let roll = rng.next() * list.reduce((s, b) => s + weight(b), 0);
  const backstory = (list.find((b) => (roll -= weight(b)) < 0) ?? list.at(-1)!).id;
  return { backstory, surname: rng.pick(ix.lib.surnames) };
}

/** A hero's backstory as a sentence about them. */
export const backstoryText = (ix: Index, h: { name: string; backstory: string }) =>
  ix.backstory(h.backstory).text.replaceAll("{name}", h.name);
