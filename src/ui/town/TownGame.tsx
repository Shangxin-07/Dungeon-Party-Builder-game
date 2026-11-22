/**
 * The town game: load or start a save, then lay out the town's panels.
 */
import { useEffect, useState } from "react";
import { heroNames } from "../../content";
import {
  awaySet,
  defence,
  launch,
  newTown,
  partySlots,
  rest,
  rosterSize,
  TownError,
  waitUntilBack,
  wageBill,
  type TownState,
  type TripReport,
} from "../../sim/town";
import type { RaidReport } from "../../sim/raid";
import { ix } from "../game";
import { describeRaid, PitPanel } from "../Pit";
import {
  activeSlot,
  adoptLegacySave,
  downloadRaw,
  inspectSlot,
  type SlotState,
  setActiveSlot,
  SLOTS,
  writeSlot,
} from "../saves";
import { Results, TripPlayer } from "../Watch";
import { RestockPanel } from "../Restock";
import { FallenPanel, LostPanel, TalkPanel } from "../Lost";
import { Accounts } from "../Accounts";
import type { Act } from "./shared";
import { Saves } from "./Saves";
import { TripTown } from "./Trip";
import { DebriefPanel } from "./Debrief";
import { AwayPanel, awayLine } from "./Away";
import { PartyPanel } from "./Party";
import { Roster } from "./Roster";
import { Recruits } from "./Recruits";
import { Market } from "./Market";
import { Buildings } from "./Buildings";
import { Memorial } from "./Memorial";
import { CampPanel, PostsPanel } from "./Posts";

/** A new game starts at the mining camp (the opening, DESIGN.md §8); it can be skipped on day 1. */
export const freshTown = () => newTown(ix, heroNames, Date.now() % 2 ** 31, { camp: true });

export type Game = { slot: number; town: TownState };

export type Start = Game | { slot: number; problem: Extract<SlotState, { state: "unreadable" }> };

export function startingGame(): Start {
  adoptLegacySave();
  const slot = activeSlot();
  const s = inspectSlot(slot);
  if (s.state === "unreadable") return { slot, problem: s };
  return { slot, town: s.state === "ok" ? s.town : freshTown() };
}

/**
 * The town game. If the save it would carry on with can't be read, nothing is
 * played (or autosaved) until the player says what to do with it.
 */
export function TownGame() {
  const [start, setStart] = useState(startingGame);
  if ("problem" in start)
    return (
      <SaveProblem
        slot={start.slot}
        problem={start.problem}
        onPlay={(slot, town) => setStart({ slot, town })}
      />
    );
  return <TownPlay initial={start} />;
}

export function SaveProblem({
  slot,
  problem,
  onPlay,
}: {
  slot: number;
  problem: Extract<SlotState, { state: "unreadable" }>;
  onPlay: (slot: number, town: TownState) => void;
}) {
  const others = SLOTS.filter((n) => n !== slot).map((n) => ({ n, s: inspectSlot(n) }));
  const newer = /newer version/.test(problem.reason);
  return (
    <section className="town panel" aria-labelledby="save-problem-heading">
      <h2 id="save-problem-heading">The guild in slot {slot} can't be loaded</h2>
      <p className="error" role="alert">
        {problem.reason}
      </p>
      <p>
        {newer
          ? "It was saved by a newer version of the game. Reload the page to get the latest version; your guild is still there."
          : "Your save hasn't been touched. Download it to keep it safe while this gets fixed."}
      </p>
      <p className="small">
        <button type="button" className="btn btn-main" onClick={() => location.reload()}>
          Reload the page
        </button>{" "}
        <button type="button" className="btn" onClick={() => downloadRaw(slot, problem.raw)}>
          Download the save
        </button>
      </p>
      <p className="small">
        Or play another slot:{" "}
        {others.map(({ n, s }) =>
          s.state === "unreadable" ? null : (
            <button
              key={n}
              type="button"
              className="btn"
              onClick={() => onPlay(n, s.state === "ok" ? s.town : freshTown())}
            >
              {s.state === "ok" ? `Slot ${n} (day ${s.town.day})` : `Start a guild in slot ${n}`}
            </button>
          ),
        )}{" "}
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (!confirm(`Start over in slot ${slot}? The save there will be gone for good.`))
              return;
            onPlay(slot, freshTown());
          }}
        >
          Start over in slot {slot}
        </button>
      </p>
    </section>
  );
}

export function TownPlay({ initial }: { initial: Game }) {
  const [game, setGame] = useState(initial);
  const { slot, town } = game;
  const setTown = (t: TownState) => setGame((g) => ({ ...g, town: t }));
  const [watching, setWatching] = useState<false | { trip: TripReport } | RaidReport>(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    writeSlot(slot, town);
    setActiveSlot(slot);
  }, [slot, town]);

  const act: Act = (f) => {
    try {
      setTown(f(town));
      setError(undefined);
    } catch (e) {
      if (e instanceof TownError) setError(e.message);
      else throw e;
    }
  };

  if (watching && "trip" in watching) {
    const trip = watching.trip;
    return (
      <section className="town" aria-labelledby="watch-heading">
        <h2 id="watch-heading">
          Day {trip.day}:{" "}
          {trip.name
            ? `${trip.name} sets off`
            : `${trip.party.map((h) => h.name).join(", ")} go down`}
        </h2>
        <p className="muted">
          {trip.party.map((h) => h.name).join(", ")}. This is how it went, from the day they set
          off.
        </p>
        <TripPlayer
          heroes={trip.party}
          log={trip.result.log}
          results={
            trip.account ? (
              // A deserter's account (M7.05): it ends where they ran.
              <div className="results">
                <h3>{trip.account.by} ran</h3>
                <p>
                  That's all {trip.account.by} saw. Nothing more is known of{" "}
                  {trip.name ?? "the party"} until someone comes back or finds them.{" "}
                  {trip.account.blame}
                </p>
                <button type="button" className="btn btn-main" onClick={() => setWatching(false)}>
                  Back to town
                </button>
              </div>
            ) : (
              <Results result={trip.result}>
                <TripTown town={town} trip={trip} />
                <button type="button" className="btn btn-main" onClick={() => setWatching(false)}>
                  Back to town
                </button>
              </Results>
            )
          }
        />
      </section>
    );
  }
  if (watching) {
    const raid = watching;
    return (
      <section className="town" aria-labelledby="watch-heading">
        <h2 id="watch-heading">Night of day {raid.day}: raiders at the pit</h2>
        <p className="muted">
          {raid.climbed} monsters climbed out (strength {raid.strength}). The defences held back{" "}
          {raid.defence}, so {raid.raiders.length} raiders reached the town.
        </p>
        <TripPlayer
          heroes={raid.defenders}
          log={raid.log}
          results={
            <div
              className={`results results-${raid.outcome === "repelled" ? "returned" : "wiped"}`}
            >
              <p>{describeRaid(raid)}</p>
              <button type="button" className="btn btn-main" onClick={() => setWatching(false)}>
                Back to town
              </button>
            </div>
          }
        />
      </section>
    );
  }

  return (
    <section className="town" aria-label="Town">
      <TownBar town={town} act={act} />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <DebriefPanel
        town={town}
        act={act}
        onWatch={(trip) => {
          setWatching({ trip });
          window.scrollTo({ top: 0 });
        }}
      />
      <AwayPanel town={town} act={act} />
      <CampPanel town={town} act={act} />
      {town.freeHires > 0 ? <Recruits town={town} act={act} /> : null}
      {town.camp ? <PostsPanel town={town} act={act} /> : null}
      <RestockPanel town={town} act={act} />
      <TalkPanel town={town} />
      <LostPanel town={town} act={act} />
      <FallenPanel town={town} act={act} />
      {town.camp ? null : (
        <PartyPanel
          town={town}
          act={act}
          onLaunch={(prep) => {
            try {
              setTown(launch(ix, prep ? prep(town) : town, heroNames));
              setError(undefined);
            } catch (e) {
              if (e instanceof TownError) setError(e.message);
              else throw e;
            }
          }}
        />
      )}
      <PitPanel
        town={town}
        onWatchRaid={(r) => {
          setWatching(r);
          window.scrollTo({ top: 0 });
        }}
      />
      {town.camp ? null : <PostsPanel town={town} act={act} />}
      <Roster town={town} act={act} />
      {town.freeHires > 0 ? null : <Recruits town={town} act={act} />}
      <Market town={town} act={act} />
      <Buildings town={town} act={act} />
      <Accounts town={town} />
      <Memorial town={town} />
      <Saves
        slot={slot}
        town={town}
        onSwitch={(n, t) => {
          setGame({ slot: n, town: t });
          setError(undefined);
          setWatching(false);
        }}
        onError={setError}
      />
    </section>
  );
}

export function TownBar({ town, act }: { town: TownState; act: Act }) {
  return (
    <div className="townbar">
      <span>
        Day <strong>{town.day}</strong>
      </span>
      <span>
        <strong>{town.gold}</strong> gold
      </span>
      {town.camp ? (
        <span title="Wages start once the camp is held">No wages at the camp</span>
      ) : (
        <span title="What the roster is paid each day">
          Wages <strong>{wageBill(ix, town)}</strong>/day
        </span>
      )}
      <span>
        Roster <strong>{town.roster.length}</strong>/{rosterSize(ix, town)}
      </span>
      {town.camp ? (
        <span>At the mining camp</span>
      ) : (
        <span>
          Party slots <strong>{partySlots(ix, town)}</strong>
        </span>
      )}
      <span title="What holds back what climbs out of the pit tonight, with those below away">
        Defence <strong>{defence(ix, town, awaySet(town))}</strong>
      </span>
      {town.construction.length ? (
        <span
          title={town.construction
            .map((c) => `${ix.building(c.building).name}: ${c.daysLeft}d`)
            .join(", ")}
        >
          Under construction <strong>{town.construction.length}</strong>
        </span>
      ) : null}
      {town.damaged.length ? (
        <span className="damaged-note">{town.damaged.length} damaged</span>
      ) : null}
      {(town.outings ?? []).map((o) => {
        const line = awayLine(town, o);
        return (
          <span key={o.id} className={line.tone ?? undefined}>
            <strong>{o.name}</strong> · {line.text}
          </span>
        );
      })}
      <button
        type="button"
        className="btn"
        title="Everyone at home heals, parties below carry on, night falls at the pit, and new recruits turn up"
        onClick={() => act((t) => rest(ix, t, heroNames))}
      >
        Next day
      </button>
      {(town.outings ?? []).length ? (
        <button
          type="button"
          className="btn"
          title="Pass the days until a party is back or heard of, or something else happens"
          onClick={() => act((t) => waitUntilBack(ix, t, heroNames))}
        >
          Wait until someone's back
        </button>
      ) : null}
    </div>
  );
}
