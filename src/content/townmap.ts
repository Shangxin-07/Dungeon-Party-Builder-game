import { defineTownMap } from "./types";

/**
 * The town map's layout (M8, DESIGN.md §19): the pit in the middle, the
 * palisade's ring round it, and a fixed plot for every building (Mike chose
 * fixed plots, 2026-11-23). A building's `art.plot` names its plot here; its
 * door, the bottom centre of the drawing, stands on the point. Inside the ring
 * the town; outside it the farm, cottages, sawmill and graveyard.
 */
export default defineTownMap({
  width: 900,
  height: 560,
  pit: { x: 450, y: 290, rx: 96, ry: 54 },
  wall: { rx: 330, ry: 214 },
  plots: {
    north: { x: 450, y: 128 },
    "north-east": { x: 650, y: 182 },
    "north-west": { x: 282, y: 156 },
    "inner-north-east": { x: 540, y: 212 },
    east: { x: 708, y: 282 },
    west: { x: 192, y: 278 },
    "south-east": { x: 646, y: 404 },
    "south-west": { x: 262, y: 408 },
    "inner-south-east": { x: 540, y: 446 },
    "inner-south-west": { x: 356, y: 454 },
    "far-north-west": { x: 72, y: 110 },
    "far-west": { x: 52, y: 318 },
    "far-south-west": { x: 96, y: 500 },
    "far-south-east": { x: 830, y: 498 },
    "far-north-east": { x: 830, y: 128 },
  },
});
