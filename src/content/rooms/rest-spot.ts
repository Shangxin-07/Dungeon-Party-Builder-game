import { defineRoom } from "../types";

// The party catches its breath. The best healer decides how much it helps.
export default defineRoom({
  id: "rest-spot",
  name: "Safe nook",
  behaviour: "rest",
  floors: [1, 3],
  weight: 1,
  descriptions: [
    "A dry alcove with one way in. A good place to rest.",
    "An old miners' shelter, its door still barred from the inside.",
  ],
  rest: { hpPercent: 60, manaPercent: 60 },
});
