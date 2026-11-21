/**
 * Buildings: upgrades, repairs, works in progress and the helpers on site.
 */
import { library } from "../../content";
import {
  builderHands,
  nextLevel,
  repair,
  repairCost,
  underConstruction,
  upgrade,
  type Construction,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

export function Buildings({ town, act }: { town: TownState; act: Act }) {
  return (
    <section aria-labelledby="buildings-heading" className="panel">
      <h2 id="buildings-heading">Buildings</h2>
      <Helpers town={town} />
      <ul className="cards">
        {library.buildings.map((b) => {
          const level = town.buildings[b.id] ?? 0;
          const now = level ? b.levels[level - 1] : undefined;
          const next = nextLevel(ix, town, b.id);
          const damaged = town.damaged.includes(b.id);
          const fix = damaged ? repairCost(ix, town, b.id) : 0;
          const work = underConstruction(town, b.id);
          return (
            <li key={b.id} className={`card${damaged ? " damaged" : ""}`}>
              <h3>
                {b.name}{" "}
                <span className="muted small">{level ? `level ${level}` : "not built"}</span>
              </h3>
              <p className="small">{b.blurb}</p>
              {now ? <p className="small">Now: {now.summary}.</p> : null}
              {b.raidProof ? <p className="small muted">Raids can't damage it.</p> : null}
              {work ? (
                <Works
                  building={b.name}
                  work={work}
                  total={b.levels[work.level - 1]!.days}
                  town={town}
                />
              ) : null}
              {damaged ? (
                <>
                  <p className="small damaged-note">
                    Damaged in a raid: it does nothing until repaired.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    disabled={town.gold < fix}
                    onClick={() => act((t) => repair(ix, t, b.id))}
                  >
                    Repair for {fix} gold
                  </button>
                </>
              ) : work ? null : next ? (
                <>
                  <p className="small muted">
                    Level {level + 1}: {next.summary}.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    disabled={town.gold < next.cost}
                    onClick={() => act((t) => upgrade(ix, t, b.id))}
                  >
                    {level ? "Upgrade" : "Build"} for {next.cost} gold
                    {next.days ? `, ${next.days} ${next.days === 1 ? "day" : "days"}` : ""}
                  </button>
                </>
              ) : (
                <p className="small muted">As big as it gets for now.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Heroes resting in town lend the builders a hand. */
export function Helpers({ town }: { town: TownState }) {
  const hands = builderHands(ix, town);
  const rules = ix.lib.town.helpers;
  if (!hands.heroes.length) return null;
  const pct = Math.round(hands.work * 100);
  const names = hands.heroes.map((h) => h.name);
  return (
    <p className="small muted">
      Heroes resting in town lend the builders a hand (stronger ones more), up to{" "}
      {Math.round(rules.maxPerDay * 100)}% faster, on the oldest job first.{" "}
      {town.construction.length
        ? `Right now ${names.join(", ")} ${names.length === 1 ? "adds" : "add"} ${pct}% to the builders' pace while they're home.`
        : `${names.join(", ")} would add ${pct}% to the builders' pace.`}
    </p>
  );
}

/** Days until a job is done, counting the help from heroes at home (oldest job only). */
export function daysToFinish(town: TownState, work: Construction): number {
  const help = town.construction[0] === work ? builderHands(ix, town).work : 0;
  let left = work.daysLeft;
  let banked = work.helped ?? 0;
  let n = 0;
  while (left > 0) {
    n++;
    left -= 1;
    banked += help;
    const whole = Math.min(left, Math.floor(banked + 1e-9));
    left -= whole;
    banked -= whole;
  }
  return n;
}

/** Builders at work: progress and when it'll be done. */
export function Works({
  building,
  work,
  total,
  town,
}: {
  building: string;
  work: Construction;
  total: number;
  town: TownState;
}) {
  const done = total - work.daysLeft;
  const eta = daysToFinish(town, work);
  return (
    <div className="works">
      <p className="small">
        Builders at work on level {work.level}: {work.daysLeft}{" "}
        {work.daysLeft === 1 ? "day" : "days"} of work left, ready on day {town.day + eta}
        {eta < work.daysLeft ? " with the heroes helping" : ""}.
        {work.level > 1
          ? ` The ${building} keeps working at level ${work.level - 1} until then.`
          : ""}
      </p>
      <span
        className="pop-track works-track"
        role="img"
        aria-label={`${done} of ${total} days of work done`}
      >
        <span className="pop-fill" style={{ width: `${(done / total) * 100}%` }} />
      </span>
    </div>
  );
}
