/**
 * For tests and scripts that aren't about materials: a town with plenty of
 * every material in its store, so building and the Temple only ask for gold.
 */
import { materials } from "../content";
import type { TownState } from "./town";

export const stocked = (t: TownState, n = 999): TownState => ({
  ...t,
  materials: Object.fromEntries(materials.map((m) => [m.id, n])),
});
