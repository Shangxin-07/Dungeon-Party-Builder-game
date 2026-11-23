/**
 * What the town map shows (M8, DESIGN.md §19), worked out from the town with
 * no drawing: which buildings stand where, at what level, what's going up and
 * what's damaged. Pure, so it can be tested without a browser.
 */
import type { BuildingArt, BuildingDef } from "../../../content/types";
import type { Index } from "../../../sim/library";
import { awaySet, type Construction, type TownState } from "../../../sim/town";

export interface MapBuilding {
  def: BuildingDef;
  art: BuildingArt;
  /** Where its door stands; missing for the wall, gate, towers and headframe. */
  at?: { x: number; y: number };
  /** Level standing now (0 while the first level is still going up). */
  level: number;
  /** The level being built, if any. */
  work?: Construction;
  damaged: boolean;
  /** One line for hover and screen readers. */
  caption: string;
}

export interface TownScene {
  buildings: MapBuilding[];
  /** Still the mining camp (the opening, DESIGN.md §8). */
  camp: boolean;
  /** Heroes at home on a post or a workshop bench: drawn round the pit. */
  working: number;
  folk: number;
  /** Store-room piles drawn at the camp. */
  timber: number;
  ore: number;
}

/** Plain look for a building whose content has no art yet. */
const PLAIN: BuildingArt = { shape: "house", roof: "#6b5a44" };

function caption(
  def: BuildingDef,
  level: number,
  work: Construction | undefined,
  damaged: boolean,
) {
  const days = (n: number) => (n <= 0 ? "done tomorrow" : `${n} day${n === 1 ? "" : "s"} left`);
  const parts = [level ? `${def.name}, level ${level}` : `${def.name}, going up`];
  if (level) parts.push(def.levels[level - 1]?.summary ?? "");
  if (work)
    parts.push(
      level ? `level ${work.level} going up, ${days(work.daysLeft)}` : days(work.daysLeft),
    );
  if (damaged) parts.push("damaged in a raid: repair it in Buildings");
  return parts.filter(Boolean).join(". ") + ".";
}

export function townScene(ix: Index, town: TownState): TownScene {
  const map = ix.lib.townMap;
  const taken = new Set(ix.lib.buildings.map((b) => b.art?.plot).filter(Boolean));
  const spare = Object.keys(map.plots).filter((p) => !taken.has(p));
  const buildings: MapBuilding[] = [];
  for (const def of ix.lib.buildings) {
    const level = town.buildings[def.id] ?? 0;
    const work = town.construction.find((c) => c.building === def.id);
    if (!level && !work) continue;
    let art = def.art;
    let plot = art?.plot;
    if (!art) {
      // No art in content yet: a plain house on the first free plot, if any.
      plot = spare.shift();
      if (!plot) continue;
      art = { ...PLAIN, plot };
    }
    const damaged = town.damaged.includes(def.id);
    buildings.push({
      def,
      art,
      at: plot ? map.plots[plot] : undefined,
      level,
      work,
      damaged,
      caption: caption(def, level, work, damaged),
    });
  }
  // Back to front, so nearer buildings overlap the ones behind them.
  buildings.sort((a, b) => (a.at?.y ?? 0) - (b.at?.y ?? 0));

  const away = awaySet(town);
  const atWork = new Set<string>();
  for (const ids of Object.values(town.posts)) for (const id of ids) atWork.add(id);
  for (const shop of Object.values(town.workshops)) for (const id of shop.workers) atWork.add(id);
  const working = [...atWork].filter((id) => !away.has(id)).length;

  return {
    buildings,
    camp: !!town.camp,
    working,
    folk: town.folk.count,
    timber: town.materials["timber"] ?? 0,
    ore: town.materials["iron-ore"] ?? 0,
  };
}

/** "5 built, 2 going up, 1 damaged" for the panel heading. */
export function sceneSummary(scene: TownScene): string {
  const built = scene.buildings.filter((b) => b.level > 0).length;
  const going = scene.buildings.filter((b) => b.work).length;
  const hurt = scene.buildings.filter((b) => b.damaged).length;
  if (scene.camp && !built) return going ? `The camp: ${going} going up` : "The camp";
  return [`${built} built`, going ? `${going} going up` : "", hurt ? `${hurt} damaged` : ""]
    .filter(Boolean)
    .join(", ");
}
