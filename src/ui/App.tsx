import { classes } from "../content";

export function App() {
  return (
    <main className="page">
      <header>
        <p className="eyebrow">Work in progress</p>
        <h1>Dungeon Party Builder</h1>
        <p className="lede">
          Recruit a party, gear them up, and send them into the dungeon. Once they leave town,
          they're on their own. You can only watch.
        </p>
      </header>

      <section aria-labelledby="classes-heading">
        <h2 id="classes-heading">Heroes waiting in town</h2>
        <ul className="cards">
          {classes.map((c) => (
            <li key={c.id} className="card">
              <h3>{c.name}</h3>
              <p>{c.blurb}</p>
              <p className="meta">
                <span>Main stats: {c.mainStats.join(", ")}</span>
                <span>Likes: {c.likes.join(", ")}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <p>
          Nothing is playable yet. Next up: the simulation core, where a party fights its first
          monsters.
        </p>
      </footer>
    </main>
  );
}
