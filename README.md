# Dungeon Party Builder

A game where you recruit and gear up a party of heroes, send them into a dungeon, and watch what happens. You can't control them once they leave town. If they come back, their loot makes the next party stronger. If they don't, you can send a rescue party after them.

Work in progress. The design plan lives in [`docs/DESIGN.md`](docs/DESIGN.md).

## Running it

You need Node 22 or newer.

```sh
npm install
npm run dev        # local dev server at http://localhost:5173
npm test           # run the tests once
npm run typecheck  # type-check everything
npm run build      # production build into dist/
npm run fight      # run one fight in the terminal and print the battle report
npm run expedition # run one full trip into the dungeon and print the trip report
npm run balance    # simulate hundreds of fights and trips per floor and print the odds
```

`npm run fight` takes options: `--floor 3`, `--seed 42`, or a fixed line-up with `--monsters skeleton,skeleton,goblin-archer`.

`npm run expedition` takes `--floor 3` (how deep to go), `--seed 42`, `--retreat hp-30|downed|potions|never` and `--loot everything|valuable`.

Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Layout

```
src/
  sim/       Pure TypeScript simulation. No UI code, no Math.random (use the seeded Rng).
    stats.ts      primary stats -> secondary stats and skills
    hero.ts       heroes, recruits, starting kit
    combat.ts     the automatic fight loop and battle log
    ai.ts         combat AIs, registered by id
    encounter.ts  floor power (×1.3 per floor) and rolling monster groups
    expedition.ts a full trip: floors, rooms, first aid, carrying, standing orders
    rooms.ts      room behaviours (fight, trap, treasure, rest, quiet), registered by id
    loot.ts       loot tables, item values and appraisal
    validate.ts   content checks (broken ids, bad stats, missing references)
    balance.ts    headless balance runs
  content/   Game content as typed data.
  ui/        React screens.
scripts/     Command-line tools (fight, expedition, balance).
```

### Adding content

Content is data, not engine code. Each kind of content has a folder under `src/content/`:

| Folder | What it holds |
|---|---|
| `classes/` | Hero classes: base stats, row, AI, abilities, starting kit |
| `items/` | Weapons, armour, consumables, loot |
| `abilities/` | Spells and special attacks |
| `statuses/` | Things like Poisoned |
| `monsters/` | Monsters: stats, natural weapon, tags, resistances, triggers |
| `encounters/` | Which monster groups turn up on which floors |
| `skills/` | Non-combat skills (Scouting, Appraisal, Medicine) |
| `perks/` | Perks heroes can learn |
| `loot/` | Loot tables for monsters and chests |
| `rooms/` | Kinds of room: fights, traps, chests, rest spots. Each names a behaviour |
| `floors/` | Each floor's name, how many rooms it has, and rooms it always has (a rest spot) |

To add something, copy a similar file, change it, and add it to the list in `src/content/index.ts`. `npm test` then checks every id and reference and runs a quick balance check.

Items, perks, abilities, statuses and monsters are all built from the same small set of **effects**:

- Always on: `modifyStat`, `modifySkill`, `bonusVsTag`, `resist`
- When something happens: `weaponAttack`, `dealDamage`, `heal`, `applyStatus`, `summon`

For example, the axe's bonus against skeletons is `{ type: "bonusVsTag", tag: "undead", percent: 50 }`, and the slime splitting in two is a `damaged` trigger with a `summon` effect. Only a genuinely new kind of behaviour needs engine code: a new effect type, a new combat AI registered with `registerAi` in `src/sim/ai.ts`, or a new kind of room registered with `registerRoom` in `src/sim/rooms.ts`.
