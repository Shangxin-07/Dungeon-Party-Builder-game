import { defineLair } from "../types";

// The Mire Behemoth's wallow (DESIGN.md §17.8), off the main tunnels of the
// Flooded Shafts. Ordinary trips never go in. Scouts find it; a sneak party can
// fetch shed scales from its edge; a delve party sent for it fights the beast.
export default defineLair({
  id: "mire-wallow",
  name: "The Mire Behemoth's Wallow",
  floor: 4,
  monster: "mire-behemoth",
  found: "hears something vast breathing under the black water of a flooded side gallery: a wallow",
  description:
    "The gallery floor drops away into black water. Something the size of a cart lies half under it, breathing slow.",
  fetch: "wallow-scales",
  fetched: "creeps along the edge of the wallow and pulls shed scales out of the mud",
  hoard: "behemoth-hoard",
  calms: 15,
});
