import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "../sim/library";
import { autoStart, newTown } from "../sim/town";
import { FightTokens } from "./FightTokens";
import type { CombatEvent } from "../sim/combat";
import type { ExpeditionEvent } from "../sim/expedition";
import { type Bar, stateAt } from "./Watch";

const ix = indexLibrary(library);

describe("fight tokens (M8.05)", () => {
  it("a big fight wraps into more columns instead of growing tall (M8.12)", () => {
    const viewBox = (party: number, foes: number) => {
      const bars = (n: number, p: string): Bar[] =>
        Array.from({ length: n }, (_, i) => ({
          uid: `${p}${i}`,
          name: `Rat ${i}`,
          hp: 5,
          max: 5,
          state: "up",
        }));
      const html = renderToStaticMarkup(
        createElement(FightTokens, {
          heroes: [],
          party: bars(party, "h"),
          monsters: bars(foes, "m"),
        }),
      );
      const [, , w, h] = /viewBox="([^"]+)"/.exec(html)![1]!.split(" ").map(Number);
      return { w: w!, h: h!, tokens: html.split('<g class="token').length - 1 };
    };
    const small = viewBox(3, 3);
    expect(small).toEqual({ w: 520, h: 222, tokens: 6 });
    const big = viewBox(8, 12);
    expect(big.tokens).toBe(20);
    // Three to a column, every other column half a step lower: never taller than that.
    expect(big.h).toBe(small.h + 32);
    expect(big.w).toBeGreaterThan(small.w);
  });

  it("draws both sides, marks the dead and draws the latest blow", () => {
    const heroes = autoStart(ix, newTown(ix, heroNames, 2)).roster;
    const party: Bar[] = heroes.map((h) => ({
      uid: h.id,
      name: h.name,
      hp: 10,
      max: 20,
      state: "up",
    }));
    const monsters: Bar[] = [
      { uid: "m1", name: "Goblin", hp: 0, max: 8, state: "dead" },
      { uid: "m2", name: "Goblin Archer", hp: 6, max: 6, state: "up" },
    ];
    const html = renderToStaticMarkup(
      createElement(FightTokens, {
        heroes,
        party,
        monsters,
        blows: [{ kind: "hit", round: 2, text: "hits", actor: heroes[0]!.id, target: "m2" }],
      }),
    );
    for (const h of heroes) expect(html).toContain(h.name.split(" ")[0]!);
    expect(html).toContain("Goblin ✕");
    expect(html).toContain("tokens-blow");
    expect(html).not.toContain("token-struck");
  });

  it("a move on a whole group draws a line and a ring for each one struck", () => {
    const heroes = autoStart(ix, newTown(ix, heroNames, 3)).roster.slice(0, 1);
    const party: Bar[] = [
      { uid: heroes[0]!.id, name: heroes[0]!.name, hp: 10, max: 20, state: "up" },
    ];
    const monsters: Bar[] = ["m1", "m2", "m3"].map((uid) => ({
      uid,
      name: "Giant Rat",
      hp: 3,
      max: 8,
      state: "up" as const,
    }));
    const hit = (target: string) => ({
      kind: "hit" as const,
      round: 4,
      text: "burns",
      actor: heroes[0]!.id,
      target,
      tone: "good" as const,
    });
    const html = renderToStaticMarkup(
      createElement(FightTokens, { heroes, party, monsters, blows: ["m1", "m2", "m3"].map(hit) }),
    );
    expect(html.match(/tokens-blow group/g)).toHaveLength(3);
    expect(html.match(/token-struck tone-good/g)).toHaveLength(3);
  });
});

describe("the latest move in a replay (M8.09)", () => {
  const at = (combat: CombatEvent): ExpeditionEvent => ({
    kind: "combat",
    text: combat.text,
    floor: 1,
    room: 1,
    combat,
  });
  const fight: ExpeditionEvent = {
    kind: "fight",
    text: "Rats!",
    floor: 1,
    room: 1,
    monsters: ["r1", "r2", "r3"].map((uid) => ({ uid, name: "Giant Rat", hp: 8, max: 8 })),
  };

  it("gathers every hit of a fireball, and starts again on the next move", () => {
    const log = [
      fight,
      at({ kind: "action", round: 1, text: "Sela casts Fireball.", actor: "h1", target: "r1" }),
      at({ kind: "hit", round: 1, text: "burns", actor: "h1", target: "r1" }),
      at({ kind: "hit", round: 1, text: "burns", actor: "h1", target: "r2" }),
      at({ kind: "hit", round: 1, text: "burns", actor: "h1", target: "r3" }),
      at({ kind: "hit", round: 1, text: "bites", actor: "r2", target: "h1" }),
    ];
    expect(stateAt(log, 5).blows.map((b) => b.target)).toEqual(["r1", "r2", "r3"]);
    expect(stateAt(log, 6).blows.map((b) => b.target)).toEqual(["h1"]);
  });

  it("a single swing stays one line", () => {
    const log = [
      fight,
      at({
        kind: "action",
        round: 2,
        text: "Torv uses Power Strike on Rat.",
        actor: "h2",
        target: "r1",
      }),
      at({ kind: "hit", round: 2, text: "hits", actor: "h2", target: "r1" }),
      at({ kind: "killed", round: 2, text: "dies", actor: "h2", target: "r1" }),
    ];
    expect(stateAt(log, 4).blows).toHaveLength(1);
  });
});
