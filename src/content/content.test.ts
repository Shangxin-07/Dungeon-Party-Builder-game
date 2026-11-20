import { describe, expect, it } from "vitest";
import { classes } from "./index";
import { STATS } from "./types";

// Content guard rails (docs/DESIGN.md §11). These grow as content types are added.
describe("content library", () => {
  const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  it("has unique, kebab-case class ids", () => {
    const ids = classes.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID);
  });

  it("gives every class at least one valid main stat", () => {
    for (const c of classes) {
      expect(c.mainStats.length).toBeGreaterThan(0);
      for (const s of c.mainStats) expect(STATS).toContain(s);
    }
  });
});
