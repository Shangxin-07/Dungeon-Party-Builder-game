/**
 * The town game: load or start a save, then lay out the town's panels.
 */
import { useEffect, useState } from "react";
import { heroNames } from "../../content";
import {
  defence,
  launch,
  newTown,
  partySlots,
  rest,
  rosterSize,
  TownError,
  wageBill,
  type TownState,
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
import { TripTown, LastTrip } from "./Trip";
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
  const [watching, setWatching] = useState<false | "trip" | RaidReport>(false);
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

  const trip = town.lastTrip;
  if (watching && typeof watching === "object") {
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
  if (watching && trip) {
    return (
      <section className="town" aria-labelledby="watch-heading">
        <h2 id="watch-heading">
          Day {trip.day}: {trip.party.map((h) => h.name).join(", ")} go down
        </h2>
        <p className="muted">They're on their own now. You can only watch.</p>
        <TripPlayer
          heroes={trip.party}
          log={trip.result.log}
          results={
            <Results result={trip.result}>
              <TripTown town={town} />
              <button type="button" className="btn btn-main" onClick={() => setWatching(false)}>
                Back to town
              </button>
            </Results>
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
      {trip ? <LastTrip town={town} onWatch={() => setWatching("trip")} /> : null}
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
              setWatching("trip");
              window.scrollTo({ top: 0 });
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
      <span title="What the roster is paid each day">
        Wages <strong>{wageBill(ix, town)}</strong>/day
      </span>
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
      <span>
        Defence <strong>{defence(ix, town)}</strong>
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
      <button
        type="button"
        className="btn"
        title="Everyone heals, night falls at the pit, and new recruits turn up"
        onClick={() => act((t) => rest(ix, t, heroNames))}
      >
        Rest a day
      </button>
    </div>
  );
}
