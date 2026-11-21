/**
 * Lost parties and rescue runs (M5, DESIGN.md §10), the guild's news, and the
 * talk around town. Rules live in src/sim/town.ts.
 */
import { library } from "../content";
import { cancelRescue, grumbles, planRescue, type TownState } from "../sim/town";
import { heroTitle } from "../sim/hero";
import { ix } from "./game";

type Act = (f: (t: TownState) => TownState) => void;

/** Where parties fell, who's waiting, and what the monsters walked off with. */
export function LostPanel({ town, act }: { town: TownState; act: Act }) {
  if (!town.sites.length && !town.scavenged.length) return null;
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
              {s.bodies.length ? (
                <p className="small muted">Died here: {s.bodies.join(", ")}.</p>
              ) : null}
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
                  Send the next party to find them
                </button>
              )}
            </li>
          );
        })}
      </ul>
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
