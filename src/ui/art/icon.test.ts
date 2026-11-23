import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ICON_SHEETS } from "../../content/types";
import { Icon, ICON_ART, monsterIconRef, PEOPLE, SPARE } from "./Icon";

describe("icons (M8)", () => {
  it("falls back to the name's initial, skipping a leading 'The'", () => {
    const html = renderToStaticMarkup(createElement(Icon, { name: "The Foreman's Shade" }));
    expect(html).toContain(">F<");
    expect(html).toContain("icon-letter");
  });

  it("the people icons are real cells of the classes sheet", () => {
    const grid = ICON_SHEETS.classes;
    for (const p of Object.values(PEOPLE)) expect(p.cell).toBeLessThan(grid.cols * grid.rows);
  });

  it("every icon sheet has Mike's art registered", () => {
    for (const sheet of Object.keys(ICON_SHEETS))
      expect(ICON_ART[sheet as keyof typeof ICON_SHEETS]).toBeDefined();
  });

  it("risen guild mates and nameless foes get the spare monster cells", () => {
    expect(monsterIconRef(undefined, "Bram, Risen").icon).toEqual(SPARE.risen);
    expect(monsterIconRef(undefined, "Something").icon).toEqual(SPARE.unknown);
    expect(monsterIconRef("goblin", "Goblin B").icon).toEqual({ sheet: "monsters-1", cell: 4 });
  });

  it("a registered sheet draws its cell from the grid", () => {
    const real = ICON_ART.weapons;
    ICON_ART.weapons = { url: "w.png", cell: 64 };
    try {
      const html = renderToStaticMarkup(
        createElement(Icon, { icon: { sheet: "weapons", cell: 5 }, name: "Dagger", size: 20 }),
      );
      // Cell 5 on a 4-wide grid: column 1, row 1.
      expect(html).toContain("background-position:-20px -20px");
      expect(html).toContain("background-size:80px 80px");
    } finally {
      ICON_ART.weapons = real;
    }
  });
});
