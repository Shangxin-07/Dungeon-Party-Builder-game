/**
 * Town actions never change the town they're given (copy-on-write). edit()
 * shares trip reports and the hidden results of parties still out between the
 * old town and the new one rather than copying them each action, so a change
 * made in place to one of those would leak into the old town. Freezing every
 * town before it's passed on turns any such change into an error here.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { StandingOrders } from "./expedition";
import { indexLibrary } from "./library";
import { autoStart, cantLaunch, launch, newTown, rest, setOrders, type TownState } from "./town";

const ix = indexLibrary(library);

function deepFreeze<T>(x: T): T {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) deepFreeze(v);
  }
  return x;
}

const orders = (o: Partial<StandingOrders>): StandingOrders => ({
  targetFloor: 1,
  retreat: { kind: "hero-hp-below", percent: 30 },
  loot: "everything",
  ...o,
});

/** Send the party and pass the days until it's home, or lost and given up. */
function trip(t: TownState, o: Partial<StandingOrders>): { t: TownState; outcome: string } {
  for (let day = 0; day < 10 && cantLaunch(ix, t); day++) t = deepFreeze(rest(ix, t, heroNames));
  t = deepFreeze(launch(ix, deepFreeze(setOrders(ix, t, orders(o))), heroNames));
  const out = t.outings.at(-1)!;
  for (let day = 0; day < 20 && t.outings.some((x) => x.id === out.id); day++)
    t = deepFreeze(rest(ix, t, heroNames));
  return { t, outcome: out.result.outcome };
}

describe("town actions", () => {
  it("leave the town they were given untouched, trips and parties out included", () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 40 && !outcomes.has("wiped"); seed++) {
      let t: TownState = deepFreeze(autoStart(ix, newTown(ix, heroNames, seed)));
      const first = trip(t, { targetFloor: 1 });
      outcomes.add(first.outcome);
      t = first.t;
      if (cantLaunch(ix, t)) continue;
      outcomes.add(trip(t, { targetFloor: 3, retreat: { kind: "never" } }).outcome);
    }
    expect(outcomes).toContain("returned");
    expect(outcomes).toContain("wiped");
  });
});
