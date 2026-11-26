import { defineRoom } from "../types";

// The Warrens: a burrow hung with web. Touch it and the spiders know.
export default defineRoom({
  id: "web-curtain",
  name: "Webbed burrow",
  behaviour: "trap",
  floors: [2, 2],
  weight: 1,
  descriptions: [
    "A burrow hung floor to roof with old web.",
    "The tunnel narrows to a crawl, grey with silk.",
  ],
  trap: {
    springs: "The party blunders into a curtain of web, and small things bite",
    spotted: "a curtain of web across the crawl, with something waiting in it",
    hidden: 50,
    damage: [2, 4],
    damageType: "poison",
    hits: "all",
  },
});
