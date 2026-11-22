/**
 * Alignment (DESIGN.md §7): two-thirds set the party's alignment, everyone
 * else should be within one step, and mismatches cost morale, never a ban.
 */
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { describeParty, partyAlignment, rollAlignment, steps } from "./alignment";
import { createHero, type Hero } from "./hero";
import { classOptions } from "./levels";
import { indexLibrary } from "./library";
import { moraleChanges } from "./morale";
import { createRng } from "./rng";
import { autoStart, cantLaunch, launchAndWait, launchWarnings, newTown } from "./town";

const ix = indexLibrary(library);
let n = 0;
const hero = (alignment: string, classId = "fighter"): Hero => {
  n++;
  return {
    ...createHero(ix, { id: `a${n}`, name: `Hero ${n}`, classId }, createRng(n)),
    alignment,
  };
};
const party = (...al: string[]) => al.map((a) => hero(a));
const names = (hs: Hero[]) => hs.map((h) => h.alignment);

describe("party alignment", () => {
  it("follows the design's table", () => {
    const gg_n = partyAlignment(ix, party("good", "good", "neutral"));
    expect(gg_n.alignment?.id).toBe("good");
    expect(gg_n.mismatched).toEqual([]);

    const gg_e = party("good", "good", "evil");
    const p2 = partyAlignment(ix, gg_e);
    expect(p2.alignment?.id).toBe("good");
    expect(names(p2.mismatched)).toEqual(["evil"]);
    // The Evil hero and both Good heroes they clash with.
    expect(p2.clashing).toHaveLength(3);

    const nn_g = partyAlignment(ix, party("neutral", "neutral", "good"));
    expect(nn_g.alignment?.id).toBe("neutral");
    expect(nn_g.mismatched).toEqual([]);
    expect(nn_g.friction).toBe(false);

    const six = partyAlignment(
      ix,
      party("neutral", "neutral", "neutral", "neutral", "good", "evil"),
    );
    expect(six.alignment?.id).toBe("neutral");
    expect(six.mismatched).toEqual([]);
    expect(six.clashing).toEqual([]);
    expect(six.friction).toBe(true);

    const gne = partyAlignment(ix, party("good", "neutral", "evil"));
    expect(gne.divided).toBe(true);
    expect(gne.alignment).toBeUndefined();
  });

  it("measures steps on the scale", () => {
    expect(steps(ix, "good", "neutral")).toBe(1);
    expect(steps(ix, "good", "evil")).toBe(2);
    expect(steps(ix, "evil", "evil")).toBe(0);
  });

  it("says what's wrong in a line for the party panel", () => {
    expect(describeParty(ix, party("good", "good", "neutral"))).toBe("Party alignment: Good.");
    expect(describeParty(ix, party("good", "good", "evil"))).toMatch(/clashes with a Good party/);
    expect(describeParty(ix, party("good", "neutral", "evil"))).toMatch(/^Divided/);
  });
});

describe("alignment and morale", () => {
  it("clashing costs morale per day; a Neutral majority only leaves a little unease", () => {
    const h = { ...hero("evil"), motivation: "knowledge", morale: 50 };
    const clash = moraleChanges(ix, h, { alignmentClash: 3 });
    expect(clash).toEqual([{ amount: expect.any(Number), reason: "clashed with the party" }]);
    expect(clash[0]!.amount).toBeLessThan(-3);
    const uneasy = moraleChanges(ix, h, { goodEvilFriction: 3 });
    expect(uneasy[0]!.amount).toBeGreaterThanOrEqual(-2);
  });

  it("acts like a second motivation", () => {
    const good = { ...hero("good"), motivation: "knowledge", morale: 50 };
    const evil = { ...hero("evil"), motivation: "knowledge", morale: 50 };
    const sum = (h: Hero) =>
      moraleChanges(ix, h, { goldShare: 90, kills: 6 }).reduce((s, c) => s + c.amount, 0);
    expect(sum(evil)).toBeGreaterThan(sum(good));
    const grief = (h: Hero) =>
      moraleChanges(ix, h, { fallenComrades: 1 }).reduce((s, c) => s + c.amount, 0);
    expect(grief(good)).toBeLessThan(grief(evil));
  });

  it("a mismatched party can still go down, with a warning, and comes back unhappier", () => {
    const t0 = structuredClone(autoStart(ix, newTown(ix, heroNames, 6)));
    const ids = t0.party;
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const make = (als: string[]) => {
      const t = structuredClone(t0);
      ids.forEach((id, i) => (t.roster.find((h) => h.id === id)!.alignment = als[i] ?? "good"));
      return t;
    };
    const bad = make(["good", "good", "evil"]);
    expect(cantLaunch(ix, bad)).toBeUndefined();
    expect(launchWarnings(ix, bad).join(" ")).toMatch(/clashes with a Good party/);
    const fine = make(["good", "good", "good"]);
    const after = (t: typeof bad) => launchAndWait(ix, t, heroNames);
    const reasons = (t: typeof bad) =>
      after(t).roster.flatMap((h) => h.moraleLog.map((m) => m.reason));
    expect(reasons(bad)).toContain("clashed with the party");
    expect(reasons(fine)).not.toContain("clashed with the party");
  });
});

describe("alignment on heroes", () => {
  it("is stable for a hero, and recruits come in every alignment", () => {
    expect(rollAlignment(ix, "h1", "Bram")).toBe(rollAlignment(ix, "h1", "Bram"));
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => rollAlignment(ix, `h${i}`, `Name ${i}`)),
    );
    expect([...seen].sort()).toEqual(["evil", "good", "neutral"]);
  });

  it("some classes need an alignment", () => {
    const h = hero("evil", "fighter");
    h.classes = { fighter: 5, cleric: 5 };
    h.stats = { ...h.stats, STR: 14, WIL: 14 };
    const paladin = () => classOptions(ix, h).find((o) => o.cls.id === "paladin")!;
    expect(paladin().missing).toEqual(["to be Good"]);
    h.alignment = "good";
    expect(paladin().ok).toBe(true);
  });
});
