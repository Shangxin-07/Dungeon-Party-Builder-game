/**
 * Workshops (M7.14, DESIGN.md §18.1): who works each bench, what's queued and
 * how long it'll take, and what can be made. Worked out in
 * src/sim/town/workshops.ts; recipes are content (content/recipes/).
 */
import { Fold } from "../Fold";
import {
  assignBench,
  awaySet,
  benchOf,
  benches,
  cancelJob,
  cantQueue,
  canWork,
  costWords,
  openWorkshops,
  outingOf,
  queueDays,
  queueJob,
  recipesAt,
  recipeWords,
  workRate,
  workshopIds,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

const days = (n: number) =>
  n === Infinity ? "waiting for a worker" : n <= 1 ? "done tonight" : `${Math.ceil(n)} days`;

export function WorkshopsPanel({ town, act }: { town: TownState; act: Act }) {
  const open = openWorkshops(ix, town);
  const below = awaySet(town);
  const queued = open.reduce((n, id) => n + (town.workshops[id]?.queue.length ?? 0), 0);
  const rules = ix.lib.workshops;
  return (
    <Fold
      id="workshops"
      title="Workshops"
      summary={
        open.length
          ? `${open.length} working, ${queued} ${queued === 1 ? "job" : "jobs"} queued`
          : "build a Sawmill, Blacksmith or Apothecary"
      }
    >
      <p className="small muted">
        Heroes and porters at home can work a bench instead of resting: a day at the bench is{" "}
        {Math.round(rules.rest * 100)}% of a day's rest. The materials are paid when you queue a
        job, and come back if you call it off. A strong arm speeds up the forge and the saw, a sharp
        mind the still; porters work at half pace.
      </p>
      {open.length ? (
        open.map((id) => <Shop key={id} id={id} town={town} act={act} below={below} />)
      ) : (
        <p className="small">
          Build a{" "}
          {workshopIds(ix)
            .map((id) => ix.building(id).name)
            .join(", a ")}{" "}
          (Buildings) to start making things.
        </p>
      )}
    </Fold>
  );
}

function Shop({
  id,
  town,
  act,
  below,
}: {
  id: string;
  town: TownState;
  act: Act;
  below: ReadonlySet<string>;
}) {
  const def = ix.building(id);
  const shop = town.workshops[id] ?? { workers: [], queue: [] };
  const seats = benches(ix, town, id);
  const front = shop.queue[0] ? ix.recipe(shop.queue[0].recipe) : undefined;
  const eta = queueDays(ix, town, id, below);
  const free = town.roster
    .filter((h) => !benchOf(town, h.id) && !below.has(h.id) && !h.untrained)
    .sort((a, b) => (front ? workRate(ix, b, front) - workRate(ix, a, front) : 0));
  let total = 0;
  return (
    <section className="workshop">
      <h3>
        {def.name}{" "}
        <span className="muted small">
          {shop.workers.length}/{seats} {seats === 1 ? "bench" : "benches"}
        </span>
      </h3>
      <p className="small">
        {shop.workers.length ? (
          shop.workers.map((hid, i) => {
            const h = town.roster.find((x) => x.id === hid);
            if (!h) return null;
            return (
              <span key={hid}>
                {i ? ", " : ""}
                <strong>{h.name}</strong>
                {front ? ` (${workRate(ix, h, front)} a day)` : ""}
                {outingOf(town, h.id) ? (
                  <span className="muted"> away below</span>
                ) : canWork(h, below) ? null : (
                  <span className="muted"> laid up</span>
                )}{" "}
                <button
                  type="button"
                  className="link small"
                  onClick={() => act((t) => assignBench(ix, t, h.id, undefined))}
                >
                  off the bench
                </button>
              </span>
            );
          })
        ) : (
          <span className="muted">Nobody at the benches.</span>
        )}{" "}
        {shop.workers.length < seats && free.length ? (
          <select
            aria-label={`Put someone to work at the ${def.name}`}
            value=""
            onChange={(e) => {
              const hid = e.target.value;
              if (hid) act((t) => assignBench(ix, t, hid, id));
            }}
          >
            <option value="">Put someone to work…</option>
            {free.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {front ? `: ${workRate(ix, h, front)} a day` : ""}
                {h.porter ? " (porter)" : ""}
              </option>
            ))}
          </select>
        ) : null}
      </p>
      {shop.queue.length ? (
        <ol className="small queue">
          {shop.queue.map((job, i) => {
            const r = ix.recipe(job.recipe);
            total += eta[i] ?? 0;
            return (
              <li key={job.id}>
                {recipeWords(ix, r)}: {Math.round((job.done / r.work) * 100)}%,{" "}
                <span className="muted">{days(total)}</span>{" "}
                <button
                  type="button"
                  className="link small"
                  onClick={() => act((t) => cancelJob(ix, t, id, job.id))}
                >
                  call off
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="small muted">Nothing queued.</p>
      )}
      <ul className="small recipes">
        {recipesAt(ix, town, id).map(({ recipe: r, ready }) => {
          const why = ready ? cantQueue(ix, town, id, r.id) : undefined;
          return (
            <li key={r.id} className={ready ? undefined : "muted"}>
              <button
                type="button"
                className="btn small"
                disabled={!ready || !!why}
                title={why ?? (ready ? undefined : `Needs ${def.name} level ${r.level}`)}
                onClick={() => act((t) => queueJob(ix, t, id, r.id))}
              >
                Make {recipeWords(ix, r)}
              </button>{" "}
              {costWords(ix, r)}, {r.work} {r.work === 1 ? "day" : "days"} ({r.stat})
              {ready ? "" : `, needs level ${r.level}`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
