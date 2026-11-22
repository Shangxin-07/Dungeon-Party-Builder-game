/**
 * Leaders and command (M7.05, DESIGN.md §17.5).
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import type { Library } from "../content/types";
import { runCombat } from "./combat";
import { rollEncounter } from "./encounter";
import { runExpedition } from "./expedition";
import { createHero, createStarterParty, type Hero } from "./hero";
import {
  afterLeading,
  commandCost,
  commandOf,
  leadershipOf,
  partyCommand,
  pickLeader,
} from "./leadership";
import { indexLibrary } from "./library";
import { createRng } from "./rng";
import {
  autoStart,
  launch,
  launchAndWait,
  newTown,
  nextCommand,
  pickParty,
  saveParty,
  setLeader,
  toggleParty,
  launchWarnings,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));

/** A hero with CHA + WIL set, so Leadership is (cha + wil) × 2.5. */
const hero = (id: string, over: Partial<Hero> & { cha?: number; wil?: number } = {}): Hero => {
  const { cha = 10, wil = 10, ...rest } = over;
  const h = createHero(ix, { id, name: id, classId: "fighter" }, createRng(1));
  return { ...h, alignment: "neutral", ...rest, stats: { ...h.stats, CHA: cha, WIL: wil } };
};

describe("command", () => {
  it("comes from Leadership (CHA + WIL), and grows with trips led", () => {
    const h = hero("a", { cha: 10, wil: 11 });
    expect(leadershipOf(ix, h)).toBe(53);
    expect(commandOf(ix, h)).toBe(4);
    const led = { ...h, lead: { trips: 5, points: 10, streak: 0, traits: [] } };
    expect(leadershipOf(ix, led)).toBe(63);
    expect(commandOf(ix, led)).toBe(5);
    expect(commandOf(ix, hero("b", { cha: 6, wil: 6 }))).toBe(3);
  });

  it("costs more for heroes further from the leader's alignment", () => {
    const lead = hero("lead", { alignment: "good" });
    expect(commandCost(ix, lead, lead)).toBe(0);
    expect(commandCost(ix, lead, hero("g", { alignment: "good" }))).toBe(1);
    expect(commandCost(ix, lead, hero("n", { alignment: "neutral" }))).toBe(1.5);
    expect(commandCost(ix, lead, hero("e", { alignment: "evil" }))).toBe(2);
    // Trusted: two steps away cost 1.5.
    const trusted = {
      ...lead,
      lead: { trips: 9, points: 0, streak: 0, traits: [{ id: "trusted", day: 1, party: "A" }] },
    };
    expect(commandCost(ix, trusted, hero("e", { alignment: "evil" }))).toBe(1.5);
  });

  it("leads with the player's pick, or else the best Leadership", () => {
    const party = [hero("a", { cha: 10 }), hero("b", { cha: 14 }), hero("c")];
    expect(pickLeader(ix, party)?.id).toBe("b");
    expect(pickLeader(ix, party, "c")?.id).toBe("c");
    expect(pickLeader(ix, party, "gone")?.id).toBe("b");
  });

  it("makes an overfilled party unruly, Evil and unhappy heroes most of all", () => {
    const lead = hero("lead", { alignment: "good", cha: 10, wil: 11 });
    const fine = partyCommand(ix, [lead, hero("a", { alignment: "good" })], "lead");
    expect(fine.over).toBe(0);
    expect(fine.disobey).toEqual({});
    const big = [
      lead,
      hero("g1", { alignment: "good", morale: 60 }),
      hero("n", { alignment: "neutral", morale: 60 }),
      hero("e", { alignment: "evil", morale: 60 }),
      hero("e2", { alignment: "evil", morale: 10 }),
    ];
    const c = partyCommand(ix, big, "lead");
    expect(c.used).toBe(1 + 1.5 + 2 + 2);
    expect(c.over).toBe(c.used - 4);
    expect(c.disobey.lead).toBeUndefined();
    expect(c.disobey.e!).toBeGreaterThan(c.disobey.g1!);
    expect(c.disobey.e2!).toBeGreaterThan(c.disobey.e!);
    expect(c.desert.e!).toBeGreaterThan(c.desert.n!);
    expect(c.desert.n!).toBeGreaterThan(c.desert.g1!);
  });
});

describe("leader traits", () => {
  const sure: Library = {
    ...library,
    leadership: {
      ...library.leadership,
      traitChance: { lostSomeone: 1, bigWin: 1, longStreak: 1, deserted: 1 },
    },
  };
  const six = indexLibrary(sure);

  it("leading adds Leadership, more slowly past 70", () => {
    const h = hero("a");
    afterLeading(
      ix,
      h,
      { lostSomeone: false, bigWin: false, deserted: false },
      1,
      "A",
      createRng(1),
    );
    expect(h.lead).toMatchObject({ trips: 1, points: 2, streak: 1 });
    const great = hero("b", { cha: 15, wil: 15 });
    afterLeading(
      ix,
      great,
      { lostSomeone: false, bigWin: false, deserted: false },
      1,
      "A",
      createRng(1),
    );
    expect(great.lead!.points).toBe(1);
  });

  it("losing someone can leave a leader Haunted; only Good leaders turn Overcautious", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 60; seed++) {
      const h = hero("evil", { alignment: "evil" });
      afterLeading(
        six,
        h,
        { lostSomeone: true, bigWin: false, deserted: false },
        1,
        "A",
        createRng(seed),
      );
      for (const t of h.lead!.traits) seen.add(t.id);
    }
    expect(seen.has("overcautious")).toBe(false);
    expect(seen.has("haunted")).toBe(true);
    const good = new Set<string>();
    for (let seed = 1; seed < 60; seed++) {
      const h = hero("good", { alignment: "good" });
      afterLeading(
        six,
        h,
        { lostSomeone: true, bigWin: false, deserted: false },
        1,
        "A",
        createRng(seed),
      );
      for (const t of h.lead!.traits) good.add(t.id);
    }
    expect(good.has("overcautious")).toBe(true);
  });

  it("traits change command, and fading ones wear off", () => {
    const h = hero("a", { cha: 10, wil: 11 });
    afterLeading(
      six,
      h,
      { lostSomeone: false, bigWin: false, deserted: true },
      1,
      "A",
      createRng(1),
    );
    expect(h.lead!.traits.map((t) => t.id)).toEqual(["doubted"]);
    const party = [h, hero("b")];
    expect(partyCommand(six, party, "a").over).toBe(0.5);
    for (let i = 0; i < 3; i++)
      afterLeading(
        six,
        h,
        { lostSomeone: false, bigWin: false, deserted: false },
        2,
        "A",
        createRng(1),
      );
    expect(h.lead!.traits.some((t) => t.id === "doubted")).toBe(false);
    const big = hero("c", { cha: 10, wil: 11 });
    let seed = 1;
    while (!big.lead?.traits.some((t) => t.id === "inspiring"))
      afterLeading(
        six,
        big,
        { lostSomeone: false, bigWin: true, deserted: false },
        1,
        "A",
        createRng(seed++),
      );
    expect(commandOf(six, big)).toBe(
      commandOf(six, { ...big, lead: { ...big.lead!, traits: [] } }) + 1,
    );
  });
});

describe("in the dungeon", () => {
  it("bigger parties meet bigger groups", () => {
    const power = (scale: number) => {
      let total = 0;
      for (let seed = 1; seed <= 200; seed++)
        for (const id of rollEncounter(ix, 2, createRng(seed), { scale }))
          total += ix.monster(id).power;
      return total;
    };
    expect(power(1.72)).toBeGreaterThan(power(1) * 1.4);
  });

  it("cunning monsters go for the leader first", () => {
    const party = createStarterParty(ix, heroNames, createRng(4));
    const leader = party.find((h) => h.row === "front")!;
    let atLeader = 0;
    let atOthers = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = runCombat(ix, party, ["goblin-archer", "goblin-archer"], {
        seed,
        leader: leader.id,
      });
      const foes = new Set(r.fighters.filter((f) => f.side === "monsters").map((f) => f.uid));
      for (const e of r.log) {
        if ((e.kind !== "hit" && e.kind !== "miss") || !foes.has(e.actor ?? "")) continue;
        if (e.target === leader.id) atLeader++;
        else if (party.some((h) => h.id === e.target)) atOthers++;
      }
    }
    expect(atLeader).toBeGreaterThan(atOthers * 3);
  });

  it("unruly heroes ignore the leader's orders, and may desert before a bad fight", () => {
    let disobeyed = 0;
    let deserted = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const party = createStarterParty(ix, heroNames, createRng(seed));
      const [lead, ...rest] = party;
      const r = runExpedition(
        ix,
        party,
        { targetFloor: 3, retreat: { kind: "hero-hp-below", percent: 60 }, loot: "everything" },
        seed,
        undefined,
        {
          leader: {
            id: lead!.id,
            disobey: Object.fromEntries(rest.map((h) => [h.id, 0.5])),
            desert: Object.fromEntries(rest.map((h) => [h.id, 0.5])),
          },
        },
      );
      disobeyed += r.log.filter((e) => /won't take orders from/.test(e.text)).length;
      for (const d of r.deserters ?? []) {
        deserted++;
        expect(r.party.some((h) => h.id === d.id)).toBe(false);
        expect(d.id).not.toBe(lead!.id);
        expect(r.log[d.saw - 1]!.kind).toBe("desert");
      }
    }
    expect(disobeyed).toBeGreaterThan(0);
    expect(deserted).toBeGreaterThan(0);
  });
});

describe("in town", () => {
  it("the player picks the leader, and parties on file remember them", () => {
    let t = fresh();
    const pick = t.party[2]!;
    expect(() => setLeader(ix, t, "nobody")).toThrow(/party/);
    t = setLeader(ix, t, pick);
    expect(nextCommand(ix, t).leader?.id).toBe(pick);
    t = saveParty(ix, t, 0);
    t = toggleParty(ix, t, pick);
    expect(t.leader).toBeUndefined();
    t = pickParty(ix, t, 0);
    expect(t.leader).toBe(pick);
  });

  it("a leader comes home better at it, and the party they led is ready to go again", () => {
    let t = fresh();
    const pick = t.party[1]!;
    t = setLeader(ix, t, pick);
    const out = launch(ix, t, heroNames);
    expect(out.outings[0]!.leader).toBe(pick);
    expect(out.leader).toBeUndefined();
    for (let seed = 1; seed < 20; seed++) {
      const back = launchAndWait(ix, { ...t, seed }, heroNames);
      if (back.lastTrip?.result.party.find((h) => h.id === pick)?.condition !== "ok") continue;
      const h = back.roster.find((x) => x.id === pick)!;
      expect(h.lead).toMatchObject({ trips: 1, points: 2 });
      expect(back.lastTrip!.leader).toBe(h.name);
      expect(back.leader).toBe(pick);
      return;
    }
    throw new Error("the leader never came home");
  });

  it("warns when the party is over its leader's command", () => {
    let t = fresh();
    t = { ...t, roster: t.roster.map((h) => ({ ...h, stats: { ...h.stats, CHA: 6, WIL: 6 } })) };
    expect(nextCommand(ix, t).command).toBe(3);
    expect(launchWarnings(ix, t).some((w) => /unruly/.test(w))).toBe(true);
  });

  it("a deserter comes home alone with their own account, and the party holds a grudge", () => {
    // Every fight looks bad and anyone can run.
    const lib: Library = {
      ...library,
      leadership: {
        ...library.leadership,
        command: [{ from: 0, command: 1 }],
        desert: { ...library.leadership.desert, perOver: 1, maxChance: 1, badFight: 0 },
      },
    };
    const dix = indexLibrary(lib);
    for (let seed = 1; seed < 40; seed++) {
      const t0: TownState = { ...autoStart(dix, newTown(dix, heroNames, seed)) };
      const out = launch(dix, t0, heroNames).outings[0]!;
      const d = out.result.deserters?.find((x) => x.home);
      if (!d || out.result.outcome !== "returned") continue;
      const t = launchAndWait(dix, t0, heroNames);
      const back = t.roster.find((h) => h.id === d.id)!;
      expect(back).toBeDefined();
      expect(back.moraleLog.some((n) => /ran out on the party/.test(n.reason))).toBe(true);
      const account = t.trips.find((x) => x.account?.by === d.name);
      expect(account?.account?.by).toBe(d.name);
      expect(account!.result.log.length).toBe(d.saw);
      expect(t.news.some((n) => n.text.includes(`${d.name} came back alone`))).toBe(true);
      // The party made it home without them.
      const party = out.result.party.filter((h) => h.condition !== "dead");
      for (const h of party) {
        const now = t.roster.find((x) => x.id === h.id);
        if (now) expect(now.grudges).toContain(d.id);
      }
      expect(t.lastTrip!.deserters?.map((x) => x.name)).toContain(d.name);
      return;
    }
    throw new Error("nobody deserted and made it home");
  });
});
