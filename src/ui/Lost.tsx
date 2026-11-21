/**
 * Lost parties and rescue runs (M5, DESIGN.md §10), the guild's news, and the
 * talk around town. Rules live in src/sim/town/.
 */
import { library } from "../content";
import {
  burialCost,
  bury,
  cancelRescue,
  grumbles,
  planRescue,
  resurrect,
  resurrectQuote,
  materialWords,
  type TownState,
} from "../sim/town";
import { risenName } from "../sim/fallen";
import { heroTitle } from "../sim/hero";
import { ix } from "./game";

type Act = (f: (t: TownState) => TownState) => void;

/** Where parties fell, who's waiting, and what the monsters walked off with. */
export function LostPanel({ town, act }: { town: TownState; act: Act }) {
  const risen = town.risen ?? [];
  if (!town.sites.length && !town.scavenged.length && !risen.length) return null;
  const byFloor = new Map<number, typeof town.scavenged>();
  for (const g of town.scavenged) byFloor.set(g.floor, [...(byFloor.get(g.floor) ?? []), g]);
  return (
    <section aria-labelledby="lost-heading" className="panel lost">
      <h2 id="lost-heading">Lost in the dungeon</h2>
      <ul className="sites">
        {town.sites.map((s) => {
          const planned = town.orders.rescue === s.id;
          const arrive = town.day + s.floor - 1;
          const gear = s.items.filter((i) => i.keep).length;
          const loot = s.items.length - gear;
          return (
            <li key={s.id} className={`site${planned ? " planned" : ""}`}>
              <h3>
                Floor {s.floor}, {s.room ? `room ${s.room}` : "on the way back up"}{" "}
                <span className="muted small">(fell on day {s.day})</span>
              </h3>
              {s.trapped.map((x) => {
                const left = x.until - town.day + 1;
                const late = x.until < arrive;
                return (
                  <p key={x.hero.id} className={late ? "small warn" : "small"}>
                    <strong>{x.hero.name}</strong> ({heroTitle(ix, x.hero)}) is trapped, alive.{" "}
                    {late
                      ? `A party leaving today would get there too late.`
                      : `${left} ${left === 1 ? "day" : "days"} left: a party leaving today reaches them on day ${arrive}.`}
                  </p>
                );
              })}
              {s.bodies.map((b) => {
                const rises = b.died + library.fallen.riseDays;
                return (
                  <p key={b.id} className={b.risen ? "small muted" : "small warn"}>
                    <strong>{b.hero.name}</strong>
                    {b.risen
                      ? "'s remains lie here, put down for good."
                      : `'s body lies here. Unless it's brought home, it rises on day ${rises}.`}
                  </p>
                );
              })}
              <p className="small">
                {gear ? `${gear} pieces of their gear` : "None of their gear"}
                {loot ? ` and ${loot} things they'd found` : ""} still lie there.
                {gear || loot ? " Monsters pick it over every night." : ""}
              </p>
              {planned ? (
                <p className="small">
                  <strong>The next trip is a rescue run.</strong>{" "}
                  <button
                    type="button"
                    className="link"
                    onClick={() => act((t) => cancelRescue(ix, t))}
                  >
                    Cancel
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => act((t) => planRescue(ix, t, s.id))}
                >
                  {s.trapped.length
                    ? "Send the next party to find them"
                    : "Send the next party to bring them home"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {risen.length ? (
        <>
          <h3>The risen</h3>
          <ul className="small">
            {risen.map((r) => {
              const kit = Object.values(r.equipment).filter((id): id is string => !!id);
              return (
                <li key={r.id}>
                  <strong>{risenName(ix, r)}</strong> walks floor {r.floor}, risen on day {r.rose}
                  {kit.length
                    ? `, still wearing their ${kit.map((id) => ix.item(id).name.toLowerCase()).join(", ")}`
                    : ""}
                  .{" "}
                  <span className="muted">
                    Put them down to bring their body home. Anyone who knew them will hate it.
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {byFloor.size ? (
        <>
          <h3>Carried off by monsters</h3>
          <ul className="small">
            {[...byFloor].map(([floor, list]) => (
              <li key={floor}>
                Floor {floor}:{" "}
                {list
                  .map(
                    (g) => `${g.owner ? `${g.owner}'s ` : ""}${ix.item(g.item).name.toLowerCase()}`,
                  )
                  .join(", ")}
                . <span className="muted">Kill whoever has it to get it back.</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

/** Bodies brought home (DESIGN.md §10): bring them back at the Temple, or bury them. */
export function FallenPanel({ town, act }: { town: TownState; act: Act }) {
  const bodies = town.bodies ?? [];
  if (!bodies.length) return null;
  const burial = burialCost(ix, town);
  return (
    <section aria-labelledby="fallen-heading" className="panel">
      <h2 id="fallen-heading">The fallen</h2>
      <p className="small muted">
        Bodies brought home wait here. The Temple can bring a hero back, at the cost of their most
        recent levels (each comes back as it was once they earn the XP again). The Graveyard lays
        them to rest, and the guild takes heart.
      </p>
      <ul className="sites">
        {bodies.map((b) => {
          const q = resurrectQuote(ix, town, b.id);
          return (
            <li key={b.id} className="site">
              <h3>
                {b.hero.name}{" "}
                <span className="muted small">
                  ({heroTitle(ix, b.hero)}, died on day {b.died})
                </span>
              </h3>
              {b.risen ? (
                <p className="small muted">Rose once already. They can only be buried.</p>
              ) : q.terms ? (
                <p className="small">
                  The priests ask {q.terms.gold} gold
                  {Object.keys(q.terms.materials).length
                    ? ` and ${materialWords(ix, q.terms.materials)}`
                    : ""}
                  .{" "}
                  {q.terms.levels
                    ? `${b.hero.name} would lose ${q.terms.levels} ${q.terms.levels === 1 ? "level" : "levels"} (back to level ${b.hero.level - q.terms.levels}).`
                    : `${b.hero.name} is only level 1, so has no levels to lose.`}
                </p>
              ) : null}
              {q.why && q.terms ? <p className="small warn">{q.why}</p> : null}
              <div className="row-buttons">
                {!b.risen ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={!!q.why}
                    title={q.why}
                    onClick={() => act((t) => resurrect(ix, t, b.id))}
                  >
                    Resurrect
                  </button>
                ) : null}{" "}
                <button
                  type="button"
                  className="btn"
                  disabled={burial === undefined || town.gold < burial}
                  title={
                    burial === undefined
                      ? "You need a Graveyard."
                      : town.gold < burial
                        ? `A burial costs ${burial} gold.`
                        : undefined
                  }
                  onClick={() => act((t) => bury(ix, t, b.id))}
                >
                  Bury{burial ? ` (${burial} gold)` : ""}
                </button>
              </div>
              {q.why && !b.risen ? <p className="small muted">{q.why}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Recent news and what heroes are saying. */
export function TalkPanel({ town }: { town: TownState }) {
  const talk = grumbles(ix, town);
  if (!town.news.length && !talk.length) return null;
  return (
    <section aria-labelledby="talk-heading" className="panel">
      <h2 id="talk-heading">Around the guild</h2>
      {town.news.length ? (
        <ul className="news small">
          {[...town.news]
            .reverse()
            .slice(0, 6)
            .map((n, i) => (
              <li key={i} className={n.tone ? `news-${n.tone}` : undefined}>
                <span className="muted">Day {n.day}.</span> {n.text}
              </li>
            ))}
        </ul>
      ) : null}
      {talk.length ? (
        <ul className="talk small">
          {talk.map((g, i) => (
            <li key={i}>{g.text}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Heroes who quit, for the memorial panel. */
export function Departed({ town }: { town: TownState }) {
  if (!town.departed.length) return null;
  return (
    <>
      <h3>Moved on</h3>
      <ul className="memorial small">
        {[...town.departed].reverse().map((d, i) => (
          <li key={i}>
            <strong>{d.name}</strong>, {library.classes.find((c) => c.id === d.classId)?.name}. Quit
            on day {d.day}
            {d.took.length
              ? `, taking their ${d.took.map((id) => ix.item(id).name.toLowerCase()).join(", ")}`
              : ""}
            .
          </li>
        ))}
      </ul>
    </>
  );
}
