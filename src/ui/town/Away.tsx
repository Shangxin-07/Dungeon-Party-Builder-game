/**
 * Parties out in the dungeon (M7.02, DESIGN.md §17.1-17.3). The town only
 * has the clock and the day they're expected back: what happens below stays
 * below until someone comes home or finds them.
 */
import { Fold } from "../Fold";
import { heroTitle } from "../../sim/hero";
import {
  giveUp,
  outingStatus,
  planRescue,
  rescueTarget,
  waitUntilBack,
  type Outing,
  type TownState,
} from "../../sim/town";
import { heroNames } from "../../content";
import { ix } from "../game";
import { Portrait } from "../art/Portrait";
import { partyOutline } from "./Party";
import type { Act } from "./shared";

/** "away 2 days · expected back day 14", and how worried to be. */
export function awayLine(town: TownState, o: Outing): { text: string; tone?: "warn" } {
  const days = town.day - o.left;
  const away = days ? `away ${days} ${days === 1 ? "day" : "days"}` : "set off today";
  const status = outingStatus(ix, town, o);
  if (status === "lost")
    return { text: `${away} · due back day ${o.expected} · possibly lost`, tone: "warn" };
  if (status === "overdue")
    return { text: `${away} · due back day ${o.expected} · overdue`, tone: "warn" };
  return { text: `${away} · expected back day ${o.expected}` };
}

/** The parties below, the clock, and searches for any that are overdue. */
export function AwayPanel({ town, act }: { town: TownState; act: Act }) {
  const outings = town.outings;
  if (!outings.length) return null;
  const searching = rescueTarget(town)?.outing?.id;
  return (
    <Fold
      id="away"
      title="Down below"
      defaultOpen
      summary={outings.map((o) => `${o.name}: ${awayLine(town, o).text}`).join("; ")}
      actions={
        <button
          type="button"
          className="btn"
          title="Pass the days until a party is back or heard of, or something else happens"
          onClick={() => act((t) => waitUntilBack(ix, t, heroNames))}
        >
          Wait until someone's back
        </button>
      }
    >
      <ul className="sites">
        {outings.map((o) => {
          const line = awayLine(town, o);
          const late = town.day > o.expected;
          return (
            <li
              key={o.id}
              className={`site away-party party-outlined${searching === o.id ? " planned" : ""}`}
              style={{ borderColor: partyOutline(o.party) }}
            >
              <h3>
                {o.name} <span className={`small ${line.tone ?? "muted"}`}>({line.text})</span>
              </h3>
              <div className="party-row-faces">
                {o.party.map((h) => (
                  <span key={h.id} title={`${h.name}, ${heroTitle(ix, h, true)}`}>
                    <Portrait hero={h} size={30} />
                  </span>
                ))}
                {o.porterParty.map((h) => (
                  <span key={h.id} className="porter-face" title={`${h.name}, porter`}>
                    <Portrait hero={h} size={24} />
                  </span>
                ))}
                <span className="small muted party-row-orders">
                  Set off day {o.left} for floor {o.result.orders.targetFloor}
                  {o.result.orders.rescue ? ", searching for the missing" : ""}
                </span>
              </div>
              {late ? (
                <>
                  <p className="small muted">
                    Parties do come home late: long fights, a long hunt. But if something has gone
                    wrong down there, the sooner someone goes, the better the chance of finding
                    anyone alive. The guild gives up waiting on day{" "}
                    {o.expected + ix.lib.rescue.giveUpDays}.
                  </p>
                  <SearchButtons town={town} act={act} id={o.id} planned={searching === o.id} />
                  {o.givenUp !== undefined ? (
                    <p className="small muted">
                      Given up for lost on day {o.givenUp}. If they ever come home, they'll be
                      welcome.
                    </p>
                  ) : outingStatus(ix, town, o) === "lost" ? (
                    <p className="small">
                      <button
                        type="button"
                        className="link danger"
                        title="Take them off the roster and the payroll, to make room for new hires. If they turn up, they're back."
                        onClick={() => act((t) => giveUp(ix, t, o.id))}
                      >
                        Give them up for lost
                      </button>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="small muted">
                  Nothing more can be known until they're back. If they aren't by day{" "}
                  {o.expected + ix.lib.rescue.overdueDays}, they're overdue.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** Order the next trip to be a search: a fast rescue for the living, or a recovery. */
export function SearchButtons({
  town,
  act,
  id,
  planned,
}: {
  town: TownState;
  act: Act;
  id: string;
  planned: boolean;
}) {
  const mission = town.orders.mission ?? "recover";
  const button = (m: "rescue" | "recover", label: string, title: string) => (
    <button
      type="button"
      className={`btn${planned && mission === m ? " btn-on" : ""}`}
      aria-pressed={planned && mission === m}
      title={title}
      onClick={() => act((t) => planRescue(ix, t, id, m))}
    >
      {label}
    </button>
  );
  return (
    <div className="row-buttons">
      {button(
        "rescue",
        "Send a rescue party",
        "For the living: travels light and fast, slips past fights where its scout can, and leaves the dead and the gear",
      )}
      {button(
        "recover",
        "Send a recovery party",
        "For the dead and everything they had: walks at the usual pace and carries what it can",
      )}
      {planned ? <span className="small muted">The next party to go down will go.</span> : null}
    </div>
  );
}
