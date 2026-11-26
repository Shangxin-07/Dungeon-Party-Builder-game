import { describe, expect, it } from "vitest";
import { library } from "../content";
import { backstoryText, rollBackstory } from "./backstory";
import { createRng } from "./rng";
import { rollRecruit } from "./hero";
import { indexLibrary } from "./library";

const ix = indexLibrary(library);

describe("backstories and surnames (M8.29)", () => {
  it("are the same every time for the same hero", () => {
    expect(rollBackstory(ix, "h1", "Bram", "good")).toEqual(
      rollBackstory(ix, "h1", "Bram", "good"),
    );
  });

  it("come in some variety, leaning by alignment", () => {
    const roll = (a: string) =>
      Array.from({ length: 400 }, (_, i) => rollBackstory(ix, `h${i}`, `N${i}`, a));
    const good = roll("good");
    const evil = roll("evil");
    expect(new Set(good.map((b) => b.backstory)).size).toBeGreaterThan(6);
    expect(new Set(good.map((b) => b.surname)).size).toBeGreaterThan(20);
    const count = (list: { backstory: string }[], id: string) =>
      list.filter((b) => b.backstory === id).length;
    expect(count(evil, "deserter")).toBeGreaterThan(count(good, "deserter"));
  });

  it("are given to recruits, and their text names them", () => {
    const h = rollRecruit(ix, { id: "r1", name: "Wren" }, createRng(1));
    expect(ix.backstory(h.backstory)).toBeDefined();
    expect(ix.lib.surnames).toContain(h.surname);
    expect(backstoryText(ix, h)).toContain("Wren");
    expect(backstoryText(ix, h)).not.toContain("{name}");
  });
});
