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
```

Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Layout

```
src/
  sim/       Pure TypeScript simulation. No UI code, no Math.random (use the seeded Rng).
  content/   Game content as typed data: classes, and later monsters, items, perks...
  ui/        React screens.
```

### Adding content

Content is data, not engine code. To add a hero class, create `src/content/classes/<id>.ts` with `defineClass({...})` and add it to the list in `src/content/index.ts`. The content tests check ids and stats automatically.
