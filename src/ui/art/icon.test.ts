import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ICON_SHEETS } from "../../content/types";
import { Icon, ICON_ART, PEOPLE } from "./Icon";

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

  it("a registered sheet draws its cell from the grid", () => {
    ICON_ART.weapons = { url: "w.png", cell: 64 };
    try {
      const html = renderToStaticMarkup(
        createElement(Icon, { icon: { sheet: "weapons", cell: 5 }, name: "Dagger", size: 20 }),
      );
      // Cell 5 on a 4-wide grid: column 1, row 1.
      expect(html).toContain("background-position:-20px -20px");
      expect(html).toContain("background-size:80px 80px");
    } finally {
      delete ICON_ART.weapons;
    }
  });
});
