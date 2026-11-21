/**
 * The opening and posts round the pit (DESIGN.md §8). CampPanel tells the
 * story of the mining camp and what's left to build before delving opens.
 * PostsPanel puts heroes at home on posts: the barricade, the lookout, the
 * salvage crew and (at the camp only) the seam.
 */
import { heroNames } from "../../content";
import {
  assignPost,
  campNeeds,
  defence,
  fitForPost,
  materialWords,
  newTown,
  openPosts,
  postOf,
  underConstruction,
  warningDays,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

/** While the guild holds the mining camp: what happened, and what's left to build. */
export function CampPanel({ town, act }: { town: TownState; act: Act }) {
  if (!town.camp) return null;
  const needs = campNeeds(ix, town);
  return (
    <section aria-labelledby="camp-heading" className="panel camp">
      <h2 id="camp-heading">The mining camp</h2>
      <p>
        The miners dug too deep. Something is climbing out of the pit every night, and there are no
        walls, no Guild Hall, and nobody trained to go down. Put your people on the posts round the
        pit, gather what you can, and build.
      </p>
      <p>
        Nobody goes down until the camp is held. Still to build:{" "}
        {Object.entries(ix.lib.opening.unlock).map(([id, level], i, all) => {
          const b = ix.building(id);
          const done = (town.buildings[id] ?? 0) >= level;
          const work = underConstruction(town, id);
          const lvl = b.levels[level - 1]!;
          return (
            <span key={id} className={done ? "good" : undefined}>
              <strong>{b.name}</strong>{" "}
              {done
                ? "(built)"
                : work
                  ? `(builders at work, ${work.daysLeft} ${work.daysLeft === 1 ? "day" : "days"} left)`
                  : `(${lvl.cost} gold${lvl.materials ? ` and ${materialWords(ix, lvl.materials)}` : ""})`}
              {i < all.length - 1 ? ", " : "."}
            </span>
          );
        })}
      </p>
      {needs.length ? (
        <p className="small muted">
          Build them in the Buildings panel. When the camp is held, the guild's wagons bring proper
          kit, and parties can start going down.
        </p>
      ) : null}
      {town.day === 1 ? (
        <p className="small">
          <button
            type="button"
            className="link"
            onClick={() => {
              if (
                !confirm("Skip the opening? You'll start with a Guild Hall and proper kit instead.")
              )
                return;
              act((t) => newTown(ix, heroNames, t.seed));
            }}
          >
            Skip the opening
          </button>{" "}
          <span className="muted">and start with a Guild Hall, ready to delve.</span>
        </p>
      ) : null}
    </section>
  );
}

/** Heroes at home on posts round the pit. */
export function PostsPanel({ town, act }: { town: TownState; act: Act }) {
  const posts = openPosts(ix, town);
  const away = new Set(town.party);
  const hands = town.roster.filter((h) => !postOf(town, h.id));
  const got = town.gathered;
  const gotWords = got
    ? [
        ...(Object.keys(got.materials).length ? [materialWords(ix, got.materials)] : []),
        ...(got.gold ? [`${got.gold} gold`] : []),
      ]
    : [];
  return (
    <section aria-labelledby="posts-heading" className="panel">
      <h2 id="posts-heading">Posts round the pit</h2>
      <p className="small muted">
        Heroes at home can hold a post. They still fight any raid that gets through, and a hero who
        goes down with a party leaves their post empty until they're back.
        {town.camp ? "" : " The seam closed with the camp."}
      </p>
      <p className="small">
        Posts hold back <strong>{defence(ix, town) - defence(ix, { ...town, posts: {} })}</strong>{" "}
        strength tonight
        {town.party.length && !town.camp
          ? ` (${defence(ix, town, away) - defence(ix, { ...town, posts: {} })} while the party is away)`
          : ""}
        .{warningDays(ix, { ...town, buildings: {} }) ? " A lookout is watching the pit." : ""}
        {gotWords.length ? ` Yesterday the posts brought in ${gotWords.join(" and ")}.` : ""}
      </p>
      <ul className="cards">
        {posts.map((p) => {
          const on = (town.posts?.[p.id] ?? [])
            .map((id) => town.roster.find((h) => h.id === id))
            .filter((h) => !!h);
          const takers = hands.filter((h) => !h.porter || p.porters);
          return (
            <li key={p.id} className="card">
              <h3>
                {p.name}{" "}
                <span className="muted small">
                  {on.length}/{p.slots}
                </span>
              </h3>
              <p className="small">{p.blurb}</p>
              {p.campOnly ? <p className="small muted">Only while the camp lasts.</p> : null}
              <ul className="post-heroes small">
                {on.map((h) => (
                  <li key={h.id}>
                    {h.name}
                    {fitForPost(h, new Set()) ? "" : " (laid up)"}{" "}
                    <button
                      type="button"
                      className="link"
                      onClick={() => act((t) => assignPost(ix, t, h.id, undefined))}
                    >
                      stand down
                    </button>
                  </li>
                ))}
              </ul>
              {on.length < p.slots && takers.length ? (
                <select
                  aria-label={`Put someone on ${p.name}`}
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) act((t) => assignPost(ix, t, id, p.id));
                  }}
                >
                  <option value="">Put someone here…</option>
                  {takers.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                      {h.porter ? " (porter)" : ""}
                    </option>
                  ))}
                </select>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
