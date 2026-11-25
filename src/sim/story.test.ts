/**
 * Story chapters (M8.21, DESIGN.md §20): the Foreman's pages, opened by what
 * the guild does.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { StoneSeal } from "./dungeon";
import { indexLibrary } from "./library";
import { importSave } from "./save";
import { autoStart, floorReveals, newTown, rest, storySoFar, type TownState } from "./town";

const ix = indexLibrary(library);
const fresh = () => autoStart(ix, newTown(ix, heroNames, 3));
const gate = (stone: string): StoneSeal => ({
  stone,
  day: 1,
  setting: "shut",
  strain: 0,
  level: 1,
  damaged: false,
});
const storyNews = (t: TownState) => t.news.filter((n) => n.tone === "story");

describe("the story", () => {
  it("opens with the guild's first day of delving", () => {
    const t = fresh();
    expect(Object.keys(t.story)).toEqual(["the-day-book"]);
    expect(storyNews(t)).toHaveLength(1);
  });

  it("waits at the mining camp until the camp is held", () => {
    const t = newTown(ix, heroNames, 3, { camp: true });
    expect(t.story).toEqual({});
    expect(storyNews(rest(ix, t, heroNames))).toHaveLength(0);
  });

  it("goes on when the first shard is found, once", () => {
    let t = fresh();
    t = { ...t, shards: { "diggings-bearer": { found: t.day } } };
    t = rest(ix, t, heroNames);
    expect(t.story["first-shard"]).toBe(t.day);
    t = rest(ix, t, heroNames);
    expect(storyNews(t)).toHaveLength(2);
  });

  it("opens a chapter for each floor sealed, with what it reveals of the floor below", () => {
    let t = fresh();
    expect(floorReveals(ix, t, 2)).toEqual([]);
    t = {
      ...t,
      dungeon: { ...t.dungeon, stones: { 1: gate("seal-stone-diggings-cleansed") } },
    };
    t = rest(ix, t, heroNames);
    expect(t.story["diggings-sealed"]).toBe(t.day);
    expect(floorReveals(ix, t, 2)[0]).toMatch(/Brood Queen/);
    expect(storySoFar(ix, t).map((s) => s.chapter.id)).toEqual(["the-day-book", "diggings-sealed"]);
  });

  it("has a chapter for sealing each floor that has shards", () => {
    const sealed = library.story.flatMap((c) => (c.when.kind === "sealed" ? [c.when.floor] : []));
    for (const set of library.shards) expect(sealed).toContain(set.floor);
  });

  it("opens what an old save had already earned, without the news", () => {
    const t = fresh();
    const old = structuredClone(t) as unknown as Record<string, unknown>;
    delete old.story;
    old.version = 23;
    old.news = [];
    old.dungeon = {
      ...(old.dungeon as object),
      stones: { 1: gate("seal-stone-diggings-cleansed") },
    };
    const back = importSave(
      ix,
      JSON.stringify({ game: "dungeon-party-builder", version: 23, savedAt: "", town: old }),
    );
    expect(Object.keys(back.story).sort()).toEqual(["diggings-sealed", "the-day-book"]);
    expect(back.news).toEqual([]);
  });
});
