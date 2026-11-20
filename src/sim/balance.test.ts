import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { balanceReport } from "./balance";

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
