import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../content";
import { indexLibrary } from "../sim/library";
import { autoStart, awaySet, launch, newTown, pitMap } from "../sim/town";
import { PitSide } from "./PitSide";

const ix = indexLibrary(library);

describe("the pit, side on (M8.04)", () => {
  it("draws every floor, a party below by the shaft, and a seal", () => {
    const t = launch(ix, autoStart(ix, newTown(ix, heroNames, 1)), heroNames);
    expect(t.outings.length).toBe(1);
    const known = pitMap(ix, t, awaySet(t));
    const html = renderToStaticMarkup(
      createElement(PitSide, {
        town: t,
        known,
        seals: [{ floor: 1, name: "Plank barricade", percent: 20 }],
        width: () => 0.5,
      }),
    );
    for (const k of known) expect(html).toContain(ix.floor(k.depth).name);
    expect(html).toContain(": set off today");
    expect(html).toContain("sealed 20%");
  });
});
