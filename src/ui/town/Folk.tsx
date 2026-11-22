/**
 * Townsfolk (M7.15, DESIGN.md §18.1b): how many, housing and food, what they
 * pay, why no more are coming, and who works where. Worked out in
 * src/sim/town/folk.ts; rules are content (content/townsfolk.ts).
 */
import { Fold } from "../Fold";
import {
  folkAt,
  folkIdle,
  folkJobs,
  folkRoom,
  foodGrown,
  housing,
  jobName,
  setFolkJob,
  whyNoSettlers,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

export function FolkPanel({ town, act }: { town: TownState; act: Act }) {
  const rules = ix.lib.townsfolk;
  const folk = town.folk;
  const room = housing(ix, town);
  const grown = foodGrown(ix, town);
  const eaten = folk.count * rules.eats;
  const why = whyNoSettlers(ix, town);
  const idle = folkIdle(town);
  const jobs = folkJobs(ix, town);
  return (
    <Fold
      id="folk"
      title="Townsfolk"
      summary={
        room || folk.count
          ? `${folk.count}/${room} settlers, food ${folk.food} (${grown - eaten >= 0 ? "+" : ""}${grown - eaten}/day), ${folk.count * rules.tax} gold a day in tax`
          : "build Cottages and a Farm"
      }
    >
      <p className="small muted">
        Settlers come when the pit has been held for {rules.safeDays} days and there's housing
        (Cottages) and food for one more (the Farm). Each eats {rules.eats} food a day and pays{" "}
        {rules.tax} gold in tax, {rules.marketDay} more on market days (every {rules.marketEvery}{" "}
        days, with a Market). They can work the salvage crew, the lookout and workshop benches, in
        whatever room the heroes leave, but never the barricade or the dungeon. A raid that gets
        through sends {Math.round(rules.fleeOnRaid * 100)}% of them packing; a town without food
        loses one a day.
      </p>
      <p className="small">
        <strong>{folk.count}</strong> of {room} homes taken. Food: <strong>{folk.food}</strong> in
        store (holds {rules.foodStore}), {grown} grown and {eaten} eaten a day.{" "}
        {why ? <span className="muted">{why}</span> : <span>More may come any day.</span>}
      </p>
      {folk.count ? (
        <>
          <p className="small">{idle ? `${idle} with nothing to do.` : "Everyone has a job."}</p>
          <ul className="small folk-jobs">
            {jobs.map((job) => {
              const n = folkAt(town, job);
              const more = !!idle && folkRoom(ix, town, job) > n;
              return (
                <li key={job}>
                  {jobName(ix, job)}: <strong>{n}</strong>{" "}
                  <button
                    type="button"
                    className="btn small"
                    disabled={!n}
                    onClick={() => act((t) => setFolkJob(ix, t, job, n - 1))}
                    aria-label={`One less at the ${jobName(ix, job)}`}
                  >
                    −
                  </button>{" "}
                  <button
                    type="button"
                    className="btn small"
                    disabled={!more}
                    onClick={() => act((t) => setFolkJob(ix, t, job, n + 1))}
                    aria-label={`One more at the ${jobName(ix, job)}`}
                  >
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Fold>
  );
}
