/**
 * The story (M8.21, DESIGN.md §20): chapters (content/story/) open as the
 * guild earns them. Each brings news, a page of the Foreman's day-book for
 * the Foreman's pages panel, and maybe a reveal about a floor, shown with
 * that floor's shards.
 *
 * A chapter opens on the day its trigger is met: the guild starts delving,
 * enough shards are found, or a Seal Stone is set. Each opens once, ever.
 */
import type { ChapterDef, StoryTrigger } from "../../content/types";
import type { Index } from "../library";
import type { TownState } from "./state";
import { news } from "./internal";

/** Has the guild done what this trigger asks? */
export function storyDue(town: TownState, when: StoryTrigger): boolean {
  switch (when.kind) {
    case "start":
      return !town.camp;
    case "shards":
      return Object.values(town.shards).filter((s) => s.found !== undefined).length >= when.count;
    case "sealed":
      return !!town.dungeon.stones[when.floor];
  }
}

/** Open every chapter now due, in order, with its news (changes `t`). */
export function storyDay(ix: Index, t: TownState): void {
  for (const c of chapters(ix)) {
    if (t.story[c.id] !== undefined || !storyDue(t, c.when)) continue;
    t.story = { ...t.story, [c.id]: t.day };
    news(t, c.news, "story");
  }
}

/** Every chapter, in order. */
export const chapters = (ix: Index): ChapterDef[] =>
  [...ix.lib.story].sort((a, b) => a.order - b.order);

/** The chapters the guild has opened, in order, with the day each opened. */
export const storySoFar = (ix: Index, town: TownState) =>
  chapters(ix).flatMap((c) =>
    town.story[c.id] !== undefined ? [{ chapter: c, day: town.story[c.id]! }] : [],
  );

/** What the opened chapters reveal about this floor. */
export const floorReveals = (ix: Index, town: TownState, floor: number): string[] =>
  storySoFar(ix, town)
    .filter((s) => s.chapter.reveal?.floor === floor)
    .map((s) => s.chapter.reveal!.text);
