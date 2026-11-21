# Saves from earlier versions

`vN.json` is a real save file written by the game at `TOWN_VERSION = N`: a
short game (hire, a few rests, four floor-1 trips) played on the last commit
on main before the version was bumped. `src/sim/old-saves.test.ts` loads each
one, upgrades it to today's version and plays on.

**When you bump TOWN_VERSION**, first save a game at the old version and add
it here as `v<old>.json` (the test fails until you do). Any save the game
exports works: use "Download save" in the Saves panel, or write the
`exportSave` output from a quick script. Don't edit these files by hand: the
point is that they are exactly what an old version wrote.
