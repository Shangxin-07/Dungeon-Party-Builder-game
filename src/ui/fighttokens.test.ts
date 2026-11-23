import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "../sim/library";
import { autoStart, newTown } from "../sim/town";
import { FightTokens } from "./FightTokens";
import type { Bar } from "./Watch";

const ix = indexLibrary(library);

describe("fight tokens (M8.05)", () => {
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
        last: { kind: "hit", round: 2, text: "hits", actor: heroes[0]!.id, target: "m2" },
      }),
    );
    for (const h of heroes) expect(html).toContain(h.name.split(" ")[0]!);
    expect(html).toContain("Goblin ✕");
    expect(html).toContain("tokens-blow");
  });
});
