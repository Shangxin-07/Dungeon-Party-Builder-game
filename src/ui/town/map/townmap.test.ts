import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { heroNames, library } from "../../../content";
import { indexLibrary } from "../../../sim/library";
import { newTown, type TownState } from "../../../sim/town";
import { TownMap } from "../TownMap";
import { townScene, sceneSummary } from "./scene";
import { SPRITES, spriteFrame } from "./sprites";

const ix = indexLibrary(library);

/** Every building at its top level, with some work going on and a raid's damage. */
function grown(): TownState {
  const t = newTown(ix, heroNames, 11);
  return {
    ...t,
    buildings: Object.fromEntries(library.buildings.map((b) => [b.id, b.levels.length])),
    construction: [{ building: "tavern", level: 2, daysLeft: 3, started: t.day }],
    damaged: ["farm"],
  };
}

/** Width and height of a PNG, from its header. */
function pngSize(file: string): [number, number] {
  const buf = readFileSync(fileURLToPath(new URL(`./sprites/${file}.png`, import.meta.url)));
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("town map (M8.01)", () => {
  it("every sprite a building names is registered, and its PNG is the size it says", () => {
    for (const b of library.buildings) {
      const s = b.art?.sprite;
      if (!s) continue;
      const sheet = SPRITES[s.sheet];
      expect(sheet, `${b.id}: sprite sheet "${s.sheet}"`).toBeDefined();
      for (const f of s.frames) expect(f, `${b.id}: frame ${f}`).toBeLessThan(sheet!.count);
    }
    for (const [id, sheet] of Object.entries(SPRITES))
      expect(pngSize(id), id).toEqual([sheet.frameWidth * sheet.count, sheet.frameHeight]);
  });

  it("picks a sprite frame per level, the last listed past the end", () => {
    expect(spriteFrame([0, 1], 1)).toBe(0);
    expect(spriteFrame([0, 1], 2)).toBe(1);
    expect(spriteFrame([0, 1], 5)).toBe(1);
  });

  it("the camp shows the pit, before the hall and the wall", () => {
    const camp = newTown(ix, heroNames, 3, { camp: true });
    const scene = townScene(ix, camp);
    expect(scene.camp).toBe(true);
    const built = new Set(scene.buildings.filter((b) => b.level).map((b) => b.def.id));
    expect(built.has("guild-hall") || built.has("palisade")).toBe(false);
    const html = renderToStaticMarkup(createElement(TownMap, { town: camp }));
    expect(html).toContain("THE PIT");
  });

  it("a grown town puts every building on the map, with work and damage", () => {
    const t = grown();
    const scene = townScene(ix, t);
    expect(scene.buildings.map((b) => b.def.id).sort()).toEqual(
      library.buildings.map((b) => b.id).sort(),
    );
    const tavern = scene.buildings.find((b) => b.def.id === "tavern")!;
    expect(tavern.work?.daysLeft).toBe(3);
    expect(tavern.caption).toContain("level 2 going up, 3 days left");
    expect(scene.buildings.find((b) => b.def.id === "farm")!.damaged).toBe(true);
    expect(sceneSummary(scene)).toBe(`${library.buildings.length} built, 1 going up, 1 damaged`);
    const html = renderToStaticMarkup(createElement(TownMap, { town: t }));
    for (const b of library.buildings) expect(html).toContain(b.name);
    expect(html).toContain(SPRITES.tavern!.url);
  });

  it("a building with no art still finds a free plot", () => {
    const plain = { ...library.buildings[0]!, id: "plain-shed", name: "Shed", art: undefined };
    const ix2 = indexLibrary({ ...library, buildings: [...library.buildings, plain] });
    const t = { ...grown(), buildings: { ...grown().buildings, "plain-shed": 1 } };
    const shed = townScene(ix2, t).buildings.find((b) => b.def.id === "plain-shed")!;
    expect(shed.at).toBeDefined();
    expect(shed.art.shape).toBe("house");
  });

  it("the wall rings the pit, and every plot stands outside it (M8.14)", () => {
    const { pit, wall, town, plots } = library.townMap;
    expect(wall.rx).toBeGreaterThan(pit.rx * 1.6);
    expect(wall.rx).toBeLessThan(town.rx);
    expect(wall.ry).toBeLessThan(town.ry);
    for (const [id, p] of Object.entries(plots)) {
      const d = ((p.x - pit.x) / wall.rx) ** 2 + ((p.y - pit.y) / wall.ry) ** 2;
      expect(d, `plot ${id}`).toBeGreaterThan(1);
    }
  });

  it("is display only: drawing never changes the town", () => {
    const t = grown();
    const before = JSON.stringify(t);
    renderToStaticMarkup(createElement(TownMap, { town: t }));
    expect(JSON.stringify(t)).toBe(before);
  });
});
