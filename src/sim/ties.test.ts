import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { TieDef } from "../content/types";
import { runCombat } from "./combat";
import { createStarterParty, type Hero } from "./hero";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import { bondsFor, tieBetween, tiesAmong, tieText } from "./ties";
import { autoStart, findHero, launchAndWait, newTown, setOrders } from "./town";
import { DEFAULT_ORDERS } from "./expedition";

const ix = indexLibrary(library);
const sure: TieDef = {
  id: "test-tie",
  name: "test friend",
  text: "{a} and {b} are friends.",
  between: [["faith"], ["soldier"]],
  chance: 1,
  morale: { amount: 4, reason: "went down with {other}" },
  passives: [{ type: "modifyStat", stat: "attack", amount: 50 }],
};
const testIx = indexLibrary({ ...library, ties: [sure] });
const two = (): Hero[] => {
  const [a, b] = createStarterParty(ix, heroNames, createRng(1));
  return [
    { ...a!, backstory: "sellsword" },
    { ...b!, backstory: "pilgrim" },
  ];
};

describe("ties between heroes (M8.32)", () => {
  it("are the same both ways and every time, with the names in the tie's order", () => {
    const [x, y] = two();
    const t = tieBetween(testIx, x!, y!)!;
    expect(t.tie.id).toBe("test-tie");
    expect(t.a.id).toBe(y!.id); // the pilgrim fits "faith", the first list
    expect(tieBetween(testIx, y!, x!)).toEqual(t);
    expect(tieText(t)).toBe(`${y!.name} and ${x!.name} are friends.`);
    expect(tieBetween(testIx, { ...x!, backstory: "farmhand" }, y!)).toBeUndefined();
  });

  it("siblings need the same surname", () => {
    const sib = indexLibrary({ ...library, ties: [{ ...ix.lib.ties[0]!, chance: 1 }] });
    const [x, y] = two();
    expect(tieBetween(sib, { ...x!, surname: "Reed" }, { ...y!, surname: "Reed" })?.tie.id).toBe(
      "siblings",
    );
    expect(tieBetween(sib, { ...x!, surname: "Reed" }, { ...y!, surname: "Cobb" })).toBeUndefined();
  });

  it("come up often enough among real recruits, and not between everyone", () => {
    const party = (s: number) =>
      createStarterParty(ix, heroNames.slice(s % 30), createRng(s), ["fighter", "fighter", "scout", "mage"]);
    const n = Array.from({ length: 200 }, (_, s) => tiesAmong(ix, party(s)).length);
    const some = n.filter((x) => x > 0).length;
    expect(some).toBeGreaterThan(40);
    expect(some).toBeLessThan(180);
  });

  it("give their passives in fights the partner starts", () => {
    const party = two();
    const bonds = bondsFor(testIx, party);
    expect(Object.keys(bonds).sort()).toEqual(party.map((h) => h.id).sort());
    expect(bondsFor(testIx, party.slice(0, 1))).toEqual({});
    const fight = (b: boolean) =>
      runCombat(testIx, party, ["goblin", "goblin"], { seed: 3, ...(b ? { bonds } : {}) }).rounds;
    expect(fight(true)).toBeLessThanOrEqual(fight(false));
  });

  it("are felt at home after a trip together", () => {
    let t = autoStart(testIx, newTown(testIx, heroNames, 1));
    const went = [...t.party];
    t.roster.find((h) => h.id === went[0])!.backstory = "pilgrim";
    t.roster.find((h) => h.id === went[1])!.backstory = "sellsword";
    t = setOrders(testIx, t, { ...DEFAULT_ORDERS, targetFloor: 1 });
    t = launchAndWait(testIx, t, heroNames);
    const a = findHero(t, went[0]!);
    const b = findHero(t, went[1]!);
    expect(a && b).toBeTruthy();
    if (!a || !b) return;
    expect(a.moraleLog.some((n) => n.reason === `went down with ${b.name}`)).toBe(true);
    expect(b.moraleLog.some((n) => n.reason === `went down with ${a.name}`)).toBe(true);
  });
});
