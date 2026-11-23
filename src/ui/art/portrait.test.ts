import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../../content";
import { indexLibrary } from "../../sim/library";
import { autoStart, newTown } from "../../sim/town";
import { faceOf, Portrait } from "./Portrait";

const ix = indexLibrary(library);
const heroes = autoStart(ix, newTown(ix, heroNames, 4)).roster;

describe("portraits (M8.06)", () => {
  it("are the same every time, and change with the hero", () => {
    const faces = heroes.map((h) => JSON.stringify(faceOf(h)));
    expect(heroes.map((h) => JSON.stringify(faceOf(h)))).toEqual(faces);
    expect(new Set(faces).size).toBeGreaterThan(1);
  });

  it("wear one of their class's hats, and porters a headband", () => {
    for (const h of heroes) {
      const cls = library.classes.find((c) => c.id === h.classId)!;
      if (cls.hats?.length) expect(cls.hats).toContain(faceOf(h).hat);
    }
    expect(faceOf({ ...heroes[0]!, porter: { watched: 0, xp: 0 } }).hat).toBe(14);
  });

  it("show an injury, and keep the face when the hero rises", () => {
    const h = heroes[0]!;
    expect(faceOf(h).injury).toBeUndefined();
    expect(faceOf({ ...h, injuries: [{ id: "broken-arm", days: 3 }] }).injury).toBeDefined();
    const risen = faceOf({ ...h, name: `${h.name}, Risen` }, true);
    expect(risen.risen).toBe(true);
    expect({ ...risen, risen: false }).toEqual(faceOf(h));
  });

  it("render as stacked layers", () => {
    const html = renderToStaticMarkup(createElement(Portrait, { hero: heroes[0]! }));
    expect(html).toContain("face-part");
    expect(html).toContain("heads");
  });
});
