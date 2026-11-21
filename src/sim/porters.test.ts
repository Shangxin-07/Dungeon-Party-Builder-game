/** Porters (M6): untrained hands who carry loot, watch, and run for it on a wipe. */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "./library";
import { fitDefenders } from "./raid";
import { migrateTown } from "./save";
import {
  autoStart,
  cantLaunch,
  fightsToTrain,
  haulPrice,
  haggler,
  hirePorter,
  launch,
  newTown,
  rest,
  setOrders,
  toggleParty,
  TOWN_VERSION,
  trainPorter,
  wage,
  type TownState,
} from "./town";

const ix = indexLibrary(library);
const rules = library.town.porters;
const fresh = (seed = 1) => autoStart(ix, newTown(ix, heroNames, seed));
/** A town on day 2 with a porter signed and going down with the party. */
const withPorter = (seed = 1): TownState => {
  const t = { ...rest(ix, fresh(seed), heroNames), gold: 1000 };
  return hirePorter(ix, t, t.recruits.find((r) => r.untrained)!.id);
};

describe("porters", () => {
  it("sign cheap, stay untrained, and go along without taking a party slot", () => {
    const t = withPorter();
    const p = t.roster.at(-1)!;
    expect(p.porter).toEqual({ watched: 0, xp: 0 });
    expect(p.untrained).toBe(true);
    expect(wage(ix, p)).toBe(rules.wage);
    expect(t.porters).toEqual([p.id]);
    expect(t.party).not.toContain(p.id);
    expect(cantLaunch(ix, t)).toBeUndefined();
    const off = toggleParty(ix, t, p.id);
    expect(off.porters).toEqual([]);
    expect(off.party).toEqual(t.party);
  });

  it("only so many go with one party, and trained heroes won't carry bags", () => {
    let t = withPorter();
    for (let i = 0; i < rules.slots; i++) {
      const r = t.recruits.find((x) => x.untrained);
      if (r && t.roster.length < 6) t = hirePorter(ix, t, r.id);
    }
    expect(t.porters.length).toBeLessThanOrEqual(rules.slots);
    const extra = t.roster.find((h) => h.porter && !t.porters.includes(h.id));
    if (extra) expect(() => toggleParty(ix, t, extra.id)).toThrow(/porters/);
    const trained = { ...t.recruits[0]!, untrained: undefined };
    expect(() =>
      hirePorter(ix, { ...t, recruits: [trained, ...t.recruits.slice(1)] }, trained.id),
    ).toThrow(/won't carry/);
  });

  it("never fight, but watch the fights and bank XP", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const t = withPorter(seed);
      const p = t.roster.at(-1)!;
      const after = launch(ix, t, heroNames);
      const r = after.lastTrip!.result;
      for (const e of r.log)
        if (e.combat) {
          expect(e.combat.actor).not.toBe(p.id);
          expect(e.combat.target).not.toBe(p.id);
        }
      if (r.outcome === "wiped") continue;
      const back = after.roster.find((h) => h.id === p.id)!;
      const fights = r.log.filter((e) => e.kind === "fight" && e.monsters).length;
      expect(back.porter!.watched).toBe(fights);
      if (fights) expect(back.porter!.xp).toBeGreaterThan(0);
      expect(back.level).toBe(p.level);
      expect(r.log[0]!.text).toContain(`with ${p.name} carrying`);
    }
  });

  it("run for it when the party falls: home with loot, or dead", () => {
    let home = 0;
    let lost = 0;
    for (let seed = 0; seed < 300 && (home < 1 || lost < 1); seed++) {
      let t = withPorter(seed);
      t = setOrders(ix, t, { ...t.orders, targetFloor: 3, retreat: { kind: "never" } });
      const after = launch(ix, t, heroNames);
      const r = after.lastTrip!.result;
      if (r.outcome !== "wiped") continue;
      const run = r.porters[0]!;
      if (run.home) {
        home++;
        expect(after.roster.some((h) => h.id === run.id)).toBe(true);
        for (const item of r.porterHaul) expect(r.leftBehind).not.toContain(item);
        const bonus = haggler(ix, {
          ...t,
          roster: t.roster.filter((h) => !t.party.includes(h.id)),
        }).bonus;
        expect(after.lastTrip!.goldEarned).toBe(
          r.porterHaul
            .filter((h) => !h.keep)
            .reduce((s, h) => s + haulPrice(ix, h.item, h.value, bonus), 0),
        );
        expect(after.news.some((n) => n.text.includes(run.name))).toBe(true);
      } else {
        lost++;
        expect(after.roster.some((h) => h.id === run.id)).toBe(false);
        expect(after.memorial.some((m) => m.name === run.name)).toBe(true);
      }
      expect(after.porters).not.toContain(run.home ? "" : run.id);
    }
    expect(home).toBeGreaterThan(0);
    expect(lost).toBeGreaterThan(0);
  });

  it("can be trained in a class once they've watched enough, keeping their banked XP", () => {
    const t = withPorter();
    const p = t.roster.at(-1)!;
    expect(fightsToTrain(ix, p)).toBe(rules.trainAfterFights);
    expect(() => trainPorter(ix, t, p.id, "fighter")).toThrow(/watch/);
    const ready = structuredClone(t);
    ready.roster.at(-1)!.porter = { watched: rules.trainAfterFights, xp: 500 };
    const after = trainPorter(ix, ready, p.id, "fighter");
    const h = after.roster.find((x) => x.id === p.id)!;
    expect(h.porter).toBeUndefined();
    expect(h.untrained).toBeUndefined();
    expect(h.classId).toBe("fighter");
    expect(h.xp).toBe(500);
    expect(h.level).toBeGreaterThan(1);
    expect(after.porters).not.toContain(p.id);
  });

  it("stay out of raids", () => {
    const t = withPorter();
    const p = t.roster.at(-1)!;
    expect(fitDefenders(ix, t.roster).map((h) => h.id)).not.toContain(p.id);
  });

  it("version 7 saves get an empty porter list", () => {
    const old = JSON.parse(JSON.stringify(fresh())) as Record<string, unknown>;
    old.version = 7;
    delete old.porters;
    const up = migrateTown(ix, old)!;
    expect(up.version).toBe(TOWN_VERSION);
    expect(up.porters).toEqual([]);
  });

  it("who quit come off the porter list, so the party can still leave", () => {
    const t = withPorter();
    const p = t.roster.at(-1)!;
    p.morale = 0;
    const after = rest(ix, t, heroNames);
    expect(after.roster.map((h) => h.id)).not.toContain(p.id);
    expect(after.porters).not.toContain(p.id);
    expect(cantLaunch(ix, after)).toBeUndefined();
  });

  it("left on the list by an older game are tidied away by a day's rest", () => {
    const t = withPorter();
    const gone = { ...t, porters: [...t.porters, "h999"] };
    expect(cantLaunch(ix, gone)).toMatch(/left the guild/);
    const after = rest(ix, gone, heroNames);
    expect(after.porters).not.toContain("h999");
    expect(cantLaunch(ix, after)).toBeUndefined();
  });
});
