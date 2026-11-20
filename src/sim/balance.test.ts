import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { balanceReport, expeditionReport } from "./balance";
import type { RetreatRule } from "./expedition";

// Wide balance bands, not exact numbers (DESIGN.md §3, §12). These catch a
// content change that makes the game wildly easier or harder. Run
// `npm run balance` for the full table when tuning.
describe("balance guard rails", () => {
  const runs = 150;
  const trip = [1, 2, 3].map((floor) => balanceReport(library, heroNames, floor, runs, 3));
  const single = [1, 2, 3].map((floor) => balanceReport(library, heroNames, floor, runs, 1));

  it("floor 1 is comfortable for a fresh party", () => {
    expect(single[0]!.survived).toBeGreaterThanOrEqual(0.95);
    expect(trip[0]!.survived).toBeGreaterThanOrEqual(0.85);
  });

  it("deeper floors are harder", () => {
    expect(trip[1]!.survived).toBeLessThan(trip[0]!.survived);
    expect(trip[2]!.survived).toBeLessThan(trip[1]!.survived);
    expect(trip[2]!.hpLeft).toBeLessThan(trip[0]!.hpLeft);
  });

  it("floor 3 is dangerous but a single fight is winnable", () => {
    expect(trip[2]!.survived).toBeLessThanOrEqual(0.6);
    expect(single[2]!.survived).toBeGreaterThanOrEqual(0.5);
  });
});

// Full trips (DESIGN.md §3): floor 1 comfortable, floor 2 some risk, floor 3
// badly hurt. Standing orders should matter: careful orders trade reaching the
// target for fewer wipes.
describe("expedition balance", () => {
  const runs = 150;
  const trip = (targetFloor: number, retreat: RetreatRule) =>
    expeditionReport(library, heroNames, { targetFloor, retreat, loot: "everything" }, runs);
  const careful: RetreatRule = { kind: "hero-hp-below", percent: 30 };
  const reckless: RetreatRule = { kind: "never" };
  const f1 = trip(1, careful);
  const f2 = trip(2, careful);
  const f3 = trip(3, careful);
  const f3Reckless = trip(3, reckless);

  it("floor 1 is comfortable", () => {
    expect(f1.returned).toBeGreaterThanOrEqual(0.95);
    expect(f1.wiped).toBeLessThanOrEqual(0.02);
  });

  it("floor 2 has some risk", () => {
    expect(f2.returned).toBeGreaterThanOrEqual(0.7);
    expect(f2.wiped).toBeLessThanOrEqual(0.1);
  });

  it("floor 3 hurts", () => {
    expect(f3.returned).toBeLessThanOrEqual(0.6);
    expect(f3.wiped).toBeGreaterThanOrEqual(0.05);
  });

  it("careful orders wipe less than reckless ones", () => {
    expect(f3.wiped).toBeLessThan(f3Reckless.wiped);
    expect(f3Reckless.returned).toBeGreaterThan(f3.returned);
  });

  it("deeper trips bring back more loot", () => {
    expect(f2.haul).toBeGreaterThan(f1.haul);
  });
});
