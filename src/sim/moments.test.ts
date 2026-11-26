import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { MomentDef } from "../content/types";
import { DEFAULT_ORDERS, runExpedition, type StandingOrders } from "./expedition";
import { createStarterParty } from "./hero";
import { indexLibrary } from "./library";
import { dueMoment, epithet, knownAs, momentFits } from "./moments";
import { createRng } from "./rng";
import { autoStart, findHero, launchAndWait, newTown, setOrders } from "./town";

const ix = indexLibrary(library);
const orders = (o: Partial<StandingOrders> = {}): StandingOrders => ({ ...DEFAULT_ORDERS, ...o });

/** A moment that always happens to pilgrims on arriving at floor 1. */
const sure: MomentDef = {
  id: "test-moment",
  name: "Test moment",
  tags: ["faith"],
  floors: [1, 1],
  on: { kind: "floor" },
  chance: 1,
  text: "{hero} feels something.",
  effects: [
    { type: "morale", amount: 5, reason: "felt something" },
    { type: "epithet", name: "the Tested" },
  ],
};
const testIx = indexLibrary({ ...library, moments: [sure] });
const pilgrims = (i: typeof ix) =>
  createStarterParty(i, heroNames, createRng(1)).map((h) => ({ ...h, backstory: "pilgrim" }));

describe("backstory moments (M8.31)", () => {
  it("fit only the right backstory, floor and trigger, once for a hero", () => {
    const [h] = pilgrims(testIx);
    expect(momentFits(testIx, sure, h!, 1, { kind: "floor" }, [])).toBe(true);
    expect(momentFits(testIx, sure, h!, 2, { kind: "floor" }, [])).toBe(false);
    expect(momentFits(testIx, sure, { ...h!, backstory: "smuggler" }, 1, { kind: "floor" }, [])).toBe(false);
    expect(momentFits(testIx, sure, { ...h!, moments: ["test-moment"] }, 1, { kind: "floor" }, [])).toBe(false);
    expect(momentFits(testIx, sure, h!, 1, { kind: "floor" }, ["test-moment"])).toBe(false);
    expect(dueMoment(testIx, h!, 1, { kind: "floor" }, [], createRng(1))?.id).toBe("test-moment");
  });

  it("match fights by monster id or tag", () => {
    const rites = ix.moment("old-rites");
    const [h] = pilgrims(ix);
    const fits = (monsters: string[]) =>
      momentFits(ix, rites, h!, 3, { kind: "fight", monsters }, []);
    expect(fits(["skeleton"])).toBe(true);
    expect(fits(["goblin"])).toBe(false);
  });

  it("happen on the trip, are logged, and come home", () => {
    const r = runExpedition(testIx, pilgrims(testIx), orders({ targetFloor: 1 }), 1);
    const party = pilgrims(testIx);
    expect(r.log.filter((e) => e.kind === "moment").length).toBeGreaterThanOrEqual(party.length);
    expect(r.moments?.map((m) => m.hero).sort()).toEqual(party.map((h) => h.id).sort());
  });

  it("are remembered at home, with morale and a new name", () => {
    let t = autoStart(testIx, newTown(testIx, heroNames, 1));
    for (const h of t.roster) h.backstory = "pilgrim";
    t = setOrders(testIx, t, orders({ targetFloor: 1 }));
    const went = [...t.party];
    t = launchAndWait(testIx, t, heroNames);
    const home = went.map((id) => findHero(t, id)).filter((h) => !!h);
    expect(home.length).toBeGreaterThan(0);
    for (const h of home) {
      expect(h.moments).toEqual(["test-moment"]);
      expect(epithet(testIx, h)).toBe("the Tested");
      expect(knownAs(testIx, h)).toBe(`${h.name} the Tested`);
      expect(h.moraleLog.some((n) => n.reason === "felt something")).toBe(true);
    }
    expect(t.news.some((n) => /new name/.test(n.text))).toBe(true);
  });
});
