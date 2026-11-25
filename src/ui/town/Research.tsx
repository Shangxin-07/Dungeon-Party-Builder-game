/**
 * Research at the Library (M7.07, DESIGN.md §17.7): who's at the desks and
 * what they study, how far each topic has got, and what finishing it gives.
 * Worked out in src/sim/town/research.ts.
 */
import { Fold } from "../Fold";
import {
  assignDesk,
  awaySet,
  canStudy,
  deskOf,
  deskTopic,
  outingOf,
  researchDesks,
  researchTopics,
  studyRate,
  TIER_NAMES,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

const pts = (n: number) => String(Math.round(n * 10) / 10);

export function ResearchPanel({ town, act }: { town: TownState; act: Act }) {
  const desks = researchDesks(ix, town);
  const r = town.research;
  const topics = researchTopics(ix, town);
  const open = topics.filter((x) => !x.done);
  const below = awaySet(town);
  const working = r.desks.filter((d) => {
    const h = town.roster.find((x) => x.id === d.hero);
    return h && canStudy(h, below);
  });
  const daily = working.reduce(
    (s, d) => s + studyRate(ix, town.roster.find((x) => x.id === d.hero)!),
    0,
  );
  const free = town.roster
    .filter((h) => !h.porter && !deskOf(town, h.id) && !below.has(h.id))
    .sort((a, b) => studyRate(ix, b) - studyRate(ix, a));
  const studiedCount = topics.filter((x) => x.kind === "monster" && (x.tier ?? 0) >= 2).length;
  return (
    <Fold
      id="research"
      title="Research"
      summary={
        desks
          ? [
              `${r.desks.length}/${desks} desks`,
              ...(daily ? [`${pts(daily)} points a day`] : []),
              ...(studiedCount
                ? [`${studiedCount} ${studiedCount === 1 ? "monster" : "monsters"} studied`]
                : []),
              ...(r.shelf.length ? [`${r.shelf.length} on the shelf`] : []),
            ].join(", ")
          : "build a Library to start"
      }
    >
      <p className="small muted">
        Heroes at a Library desk study instead of delving: every day they add points (more for a
        sharp mind and good Lore, more again for the Knowledge-minded) and earn a little XP. Every
        kill teaches the guild a point too, and specimens from the haul teach more. A Studied
        monster takes +{ix.lib.research.damage[0]}% damage from the guild and its weak spots and
        tricks show in the scouting report; Mastered, +{ix.lib.research.damage[1]}% and its
        resistances are halved. Some monsters can't be hurt at all until they're researched.
      </p>
      {desks ? (
        <>
          <ul className="cards">
            {r.desks.map((d) => {
              const h = town.roster.find((x) => x.id === d.hero);
              if (!h) return null;
              const now = deskTopic(ix, town, d);
              const out = outingOf(town, h.id);
              return (
                <li key={d.hero} className="card">
                  <h3>{h.name}</h3>
                  <p className="small">
                    {pts(studyRate(ix, h))} points a day
                    {out ? (
                      <span className="muted"> (away below, back to it on return)</span>
                    ) : canStudy(h, below) ? null : (
                      <span className="muted"> (laid up)</span>
                    )}
                  </p>
                  <label className="small">
                    Studying{" "}
                    <select
                      value={d.topic && open.some((x) => x.id === d.topic) ? d.topic : ""}
                      onChange={(e) =>
                        act((t) => assignDesk(ix, t, h.id, e.target.value || undefined))
                      }
                    >
                      <option value="">
                        Whatever is nearest done{now ? ` (now: ${now.name})` : ""}
                      </option>
                      {open.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>{" "}
                  <button
                    type="button"
                    className="link small"
                    onClick={() => act((t) => assignDesk(ix, t, h.id, undefined, true))}
                  >
                    leave the desk
                  </button>
                </li>
              );
            })}
          </ul>
          {r.desks.length < desks && free.length ? (
            <select
              aria-label="Put someone at a research desk"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) act((t) => assignDesk(ix, t, id));
              }}
            >
              <option value="">Put someone at a desk…</option>
              {free.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}: {pts(studyRate(ix, h))} a day
                </option>
              ))}
            </select>
          ) : null}
        </>
      ) : (
        <p className="small">Build a Library (Buildings) for research desks.</p>
      )}
      {topics.length ? (
        <table className="research">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Progress</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((x) => (
              <tr key={x.id} className={x.done ? "muted" : undefined}>
                <td>
                  {x.name}
                  <span className="muted small">
                    {" "}
                    {x.kind === "shelf"
                      ? "on the shelf"
                      : x.kind === "shard"
                        ? "the Hearthstone"
                        : TIER_NAMES[x.tier ?? 1]!.toLowerCase()}
                  </span>
                </td>
                <td className="small">
                  {x.done ? (
                    "done"
                  ) : (
                    <>
                      <progress max={x.need} value={Math.min(x.points, x.need)} /> {pts(x.points)}/
                      {x.need}
                    </>
                  )}
                </td>
                <td className="small">{x.unlocks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="small muted">
          Nothing to study yet: the guild hasn't met anything down there.
        </p>
      )}
    </Fold>
  );
}
