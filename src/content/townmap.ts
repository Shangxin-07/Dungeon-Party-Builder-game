import { defineTownMap } from "./types";

/**
 * The town map's layout (M8, DESIGN.md §19): the pit in the middle, the
 * palisade's ring tight round the pit (it holds back what climbs out, §1/§4/§8;
 * Mike, M8.14), and a fixed plot for every building outside it (Mike chose
 * fixed plots, 2026-11-23). A building's `art.plot` names its plot here; its
 * door, the bottom centre of the drawing, stands on the point. `town` is the
 * trodden ground the buildings stand on; past it the farm, cottages, sawmill
 * and graveyard, then the woods.
 */
export default defineTownMap({
  width: 900,
  height: 560,
  pit: { x: 450, y: 290, rx: 96, ry: 54 },
  wall: { rx: 190, ry: 118 },
  town: { rx: 330, ry: 214 },
  plots: {
    north: { x: 450, y: 128 },
    "north-east": { x: 650, y: 182 },
    "north-west": { x: 282, y: 156 },
    "inner-north-east": { x: 550, y: 150 },
    east: { x: 708, y: 282 },
    west: { x: 192, y: 278 },
    "south-east": { x: 646, y: 404 },
    "south-west": { x: 262, y: 408 },
    "inner-south-east": { x: 556, y: 474 },
    "inner-south-west": { x: 350, y: 476 },
    "far-north-west": { x: 72, y: 110 },
    "far-west": { x: 52, y: 318 },
    "far-south-west": { x: 96, y: 500 },
    "far-south-east": { x: 830, y: 498 },
    "far-north-east": { x: 830, y: 128 },
  },
});
