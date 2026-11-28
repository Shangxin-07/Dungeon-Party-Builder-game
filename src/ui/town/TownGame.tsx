/**
 * The town game: load or start a save, then lay out the town's panels.
 */
import { useEffect, useRef, useState } from "react";
import { heroNames, materials } from "../../content";
import { ItemIcon } from "../art/Icon";
import {
  awaySet,
  defence,
  launch,
  newTown,
  rest,
  rosterSize,
  TownError,
  renownRank,
  retainerBill,
  foodGrown,
  housing,
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
import { TownMap } from "./TownMap";
import { Memorial } from "./Memorial";
import { HearthstonePanel } from "./Hearthstone";
import { DigSitesPanel } from "./DigSites";
import { ForemansPagesPanel } from "./ForemansPages";
import { EndingPanel } from "./Ending";
import { CampPanel, PostsPanel } from "./Posts";
import { ResearchPanel } from "./Research";
import { WorkshopsPanel } from "./Workshops";
import { FolkPanel } from "./Folk";
import { NewsStrip } from "./NewsStrip";
import { NeedsYou } from "./NeedsYou";
import { OffersPanel } from "./Offers";
import { foldTab, isCentre, needsByTab, needsYou, TABS, type CentreTab, type TabId } from "./needs";
import { onOpenFold } from "../Fold";

const TAB_KEY = "dpb-ui-tab";
const CENTRE_KEY = "dpb-ui-centre";

/** The centre pane's tab this browser was last on (never in the save). */
function rememberedCentre(): CentreTab {
  try {
    const t = localStorage.getItem(CENTRE_KEY);
    if (t && TABS.some((x) => x.id === t && isCentre(x.id))) return t as CentreTab;
  } catch {
    // Blocked storage: start on the town.
  }
  return "town";
}

function rememberCentre(t: CentreTab) {
  try {
    localStorage.setItem(CENTRE_KEY, t);
  } catch {
    // Private windows: the tab just isn't remembered.
  }
}

const IDLE_WARN_KEY = "dpb-ui-idle-warn";

/** Whether to ask before a second Next day with nothing done in between (M9.13). */
function idleWarnOn(): boolean {
  try {
    return localStorage.getItem(IDLE_WARN_KEY) !== "off";
  } catch {
    return true;
  }
}

function setIdleWarn(on: boolean) {
  try {
    if (on) localStorage.removeItem(IDLE_WARN_KEY);
    else localStorage.setItem(IDLE_WARN_KEY, "off");
  } catch {
    // Private windows: the choice just isn't remembered.
  }
}

/** A deserter's account shares its trip's seed: tell them apart. */
const tripId = (t: TripReport) => `${t.seed}:${t.account?.by ?? ""}`;

/** The tab this browser was last on (never in the save). */
function rememberedTab(): TabId {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (TABS.some((x) => x.id === t)) return t as TabId;
  } catch {
    // Blocked storage: start on the town.
  }
  return "town";
}

function rememberTab(t: TabId) {
  try {
    localStorage.setItem(TAB_KEY, t);
  } catch {
    // Private windows: the tab just isn't remembered.
  }
}

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
  // Nothing clicked since the last Next day (M9.13): the button goes red.
  const [idle, setIdle] = useState(false);
  // Anything clicked or typed but Next day (or its warning) counts as doing something.
  const busy = (target: EventTarget) => {
    if (idle && !(target as HTMLElement).closest?.(".next-day")) setIdle(false);
  };
  // The tab picked on a phone, and the centre pane's tab on a wide screen.
  const [tab, setTab] = useState<TabId>(rememberedTab);
  const [centre, setCentre] = useState<CentreTab>(rememberedCentre);
  const centreRef = useRef<HTMLDivElement>(null);
  const pickTab = (t: TabId) => {
    setTab(t);
    rememberTab(t);
    if (isCentre(t)) {
      setCentre(t);
      rememberCentre(t);
    }
  };
  const needs = needsYou(ix, town);
  // Opening a panel from elsewhere (the map, the needs-you list) goes to its tab.
  useEffect(
    () =>
      onOpenFold((id) => {
        const t = foldTab(town, id);
        if (t) pickTab(t);
      }),
    [town],
  );
  // A party back from below debriefs in the centre pane (M9.00).
  const heard = town.trips.length ? tripId(town.trips.at(-1)!) : "";
  const lastHeard = useRef({ slot, heard });
  useEffect(() => {
    const was = lastHeard.current;
    if (heard && was.slot === slot && heard !== was.heard) pickTab("debrief");
    lastHeard.current = { slot, heard };
  }, [slot, heard]);
  const toTop = () => {
    centreRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

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

  const watchTrip = (trip: TripReport) => (
    <section className="town" aria-labelledby="watch-heading">
      <h2 id="watch-heading">
        Day {trip.day}:{" "}
        {trip.name
          ? `${trip.name} sets off`
          : `${trip.party.map((h) => h.name).join(", ")} go down`}
      </h2>
      <p className="muted">
        {trip.party.map((h) => h.name).join(", ")}. This is how it went, from the day they set off.
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
  const watchRaid = (raid: RaidReport) => (
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
          <div className={`results results-${raid.outcome === "repelled" ? "returned" : "wiped"}`}>
            <p>{describeRaid(raid)}</p>
            <button type="button" className="btn btn-main" onClick={() => setWatching(false)}>
              Back to town
            </button>
          </div>
        }
      />
    </section>
  );

  const launchParty = (prep?: (t: TownState) => TownState) => {
    try {
      setTown(launch(ix, prep ? prep(town) : town, heroNames));
      setError(undefined);
    } catch (e) {
      if (e instanceof TownError) setError(e.message);
      else throw e;
    }
  };
  const onWatchTrip = (trip: TripReport) => {
    setWatching({ trip });
    toTop();
  };
  const counts = needsByTab(town, needs);
  const count = (id: TabId) => counts[id] ?? 0;
  const tabButton = (t: (typeof TABS)[number], on: boolean, className = "") => {
    const n = count(t.id);
    return (
      <button
        key={t.id}
        type="button"
        className={`${on ? "on" : ""} ${className}`.trim() || undefined}
        aria-current={on ? "page" : undefined}
        title={t.holds}
        onClick={() => {
          if (watching) setWatching(false);
          pickTab(t.id);
        }}
      >
        {t.name}
        {n ? (
          <span className="tab-count" aria-label={`, ${n} waiting`}>
            {n}
          </span>
        ) : null}
      </button>
    );
  };
  // On a phone only the picked tab's pane shows (or the centre, while watching).
  const shown = (pane: "left" | "centre" | "right") =>
    watching ? pane === "centre" : TABS.find((t) => t.id === tab)?.pane === pane;
  const paneClass = (pane: "left" | "centre" | "right") =>
    `town-pane town-${pane}${shown(pane) ? " pane-shown" : ""}`;

  const centreBody = watching ? (
    "trip" in watching ? (
      watchTrip(watching.trip)
    ) : (
      watchRaid(watching)
    )
  ) : (
    <>
      {centre === "town" ? (
        <>
          <TownMap town={town} />
        </>
      ) : null}
      {centre === "pit" ? (
        <>
          <PitPanel
            town={town}
            onWatchRaid={(r) => {
              setWatching(r);
              toTop();
            }}
          />
          {town.camp ? null : <PostsPanel town={town} act={act} />}
          {town.camp ? null : <ForemansPagesPanel town={town} />}
          {town.camp ? null : <HearthstonePanel town={town} act={act} />}
          {town.camp ? null : <DigSitesPanel town={town} act={act} />}
          <LostPanel town={town} act={act} />
          <FallenPanel town={town} act={act} />
        </>
      ) : null}
      {centre === "debrief" ? (
        town.trips.length || town.haul.length ? (
          <DebriefPanel town={town} act={act} onWatch={onWatchTrip} />
        ) : (
          <p className="muted pane-empty">
            No party has come back yet. When one does, its debrief opens here.
          </p>
        )
      ) : null}
      {centre === "news" ? (
        <>
          <NeedsYou needs={needs} />
          {town.camp ? null : <OffersPanel town={town} act={act} />}
          <TalkPanel town={town} />
        </>
      ) : null}
      {centre === "books" ? (
        <>
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
        </>
      ) : null}
    </>
  );

  return (
    <section
      className="town town-panes"
      aria-label="Town"
      onPointerDownCapture={(e) => busy(e.target)}
      onKeyDownCapture={(e) => busy(e.target)}
    >
      <div className="town-top">
        <TownBar
          town={town}
          act={act}
          idle={idle}
          onNextDay={() => {
            act((t) => rest(ix, t, heroNames));
            setIdle(true);
          }}
        />
      </div>
      <nav className="tabs town-tabs phone-tabs" aria-label="Town">
        {TABS.map((t) => tabButton(t, !watching && tab === t.id))}
      </nav>
      <EndingPanel town={town} />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="town-grid">
        <div className={paneClass("left")} aria-label="The guild">
          <CampPanel town={town} act={act} />
          {town.camp ? <PostsPanel town={town} act={act} /> : null}
          <RestockPanel town={town} act={act} />
          {town.camp ? null : <PartyPanel town={town} act={act} onLaunch={launchParty} />}
          <AwayPanel town={town} act={act} />
          <Roster town={town} act={act} />
          <Recruits town={town} act={act} />
        </div>
        <div className="town-middle">
          <NewsStrip
            town={town}
            needs={needs}
            onAll={() => {
              if (watching) setWatching(false);
              pickTab("news");
            }}
          />
          <div className={paneClass("centre")} ref={centreRef}>
            <nav className="tabs town-tabs centre-tabs" aria-label="Centre">
              {TABS.filter((t) => t.pane === "centre").map((t) =>
                tabButton(t, !watching && centre === t.id),
              )}
            </nav>
            {centreBody}
          </div>
          {town.camp ? null : (
            <div className={`town-folk${!watching && tab === "town" ? " pane-shown" : ""}`}>
              <FolkPanel town={town} act={act} />
            </div>
          )}
        </div>
        <div className={paneClass("right")} aria-label="The town's works">
          <Market town={town} act={act} />
          <Buildings town={town} act={act} />
          {town.camp ? null : <ResearchPanel town={town} act={act} />}
          {town.camp ? null : <WorkshopsPanel town={town} act={act} />}
        </div>
      </div>
    </section>
  );
}

/**
 * The guild's store of materials (DESIGN.md §8) in the town bar (M9.00): an
 * icon and a count each, the name and what it's for on hover. Every material
 * is shown, so players learn what exists; shards only once one is found.
 */
function StoreChips({ town }: { town: TownState }) {
  const shown = materials.filter((m) => !m.id.startsWith("shard-") || town.materials[m.id]);
  return (
    <span className="store-chips" aria-label="The guild's store">
      {shown.map((m) => {
        const n = town.materials[m.id] ?? 0;
        return (
          <span
            key={m.id}
            className={`material-chip${n ? "" : " none"}`}
            title={`${m.name}: ${m.blurb}`}
          >
            <ItemIcon id={m.id} size={20} />
            <strong>{n}</strong>
            <span className="sr-only"> {m.name.toLowerCase()}</span>
          </span>
        );
      })}
    </span>
  );
}

/** The guild's Renown (M8.19) in the town bar: the number, the rank, and what's next on hover. */
function RenownBadge({ town }: { town: TownState }) {
  const { rank, next } = renownRank(ix, town.renown);
  const title = [
    `${rank.name}: ${rank.summary}`,
    next ? `At ${next.at}, ${next.name.toLowerCase()}: ${next.summary}` : "",
    "Sealing floors spreads the guild's name most; shards, lairs, contracts and petitions add a little.",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <span title={title}>
      Renown <strong>{town.renown}</strong>{" "}
      <span className="muted">({rank.name.toLowerCase()})</span>
    </span>
  );
}

export function TownBar({
  town,
  idle,
  onNextDay,
}: {
  town: TownState;
  act: Act;
  idle?: boolean;
  onNextDay: () => void;
}) {
  return (
    <div className="townbar">
      <span>
        Day <strong>{town.day}</strong>
      </span>
      <span>
        <strong>{town.gold}</strong> gold
      </span>
      {town.camp ? (
        <span title="Pay starts once the camp is held">No pay at the camp</span>
      ) : (
        <span title="Retainers for the heroes at home each day. Parties are paid by their share of the haul.">
          Retainers <strong>{retainerBill(ix, town)}</strong>/day
        </span>
      )}
      <span>
        Roster <strong>{town.roster.length}</strong>/{rosterSize(ix, town)}
      </span>
      {town.folk.count || foodGrown(ix, town) ? (
        <span title="Townsfolk, and the food in store (M7.15)">
          Townsfolk <strong>{town.folk.count ?? 0}</strong>/{housing(ix, town)}, food{" "}
          <strong>{town.folk.food ?? 0}</strong>
        </span>
      ) : null}
      {town.camp ? <span>At the mining camp</span> : <RenownBadge town={town} />}
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
      <StoreChips town={town} />
      {town.outings.map((o) => {
        const line = awayLine(town, o);
        return (
          <span key={o.id} className={line.tone ?? undefined}>
            <strong>{o.name}</strong> · {line.text}
          </span>
        );
      })}
      <NextDay idle={!!idle} onNextDay={onNextDay} />
    </div>
  );
}

/**
 * The Next day button (M9.13). Red when nothing has been clicked since the
 * last one; pressing it then asks first, unless the player switched that off.
 */
function NextDay({ idle, onNextDay }: { idle: boolean; onNextDay: () => void }) {
  const [asking, setAsking] = useState(false);
  const [warn, setWarn] = useState(idleWarnOn);
  const go = () => {
    setAsking(false);
    onNextDay();
  };
  return (
    <span className="next-day">
      <button
        type="button"
        className={`btn${idle ? " btn-idle" : ""}`}
        title={
          idle
            ? "Nothing done since the last day passed"
            : "Everyone at home heals, parties below carry on, night falls at the pit, and new recruits turn up"
        }
        onClick={() => (idle && warn ? setAsking(true) : go())}
      >
        Next day
      </button>
      {asking ? (
        <div className="next-day-ask" role="alertdialog" aria-label="Advance a day?">
          <p>You've done nothing for this day, are you sure you want to advance a day?</p>
          <label className="small">
            <input
              type="checkbox"
              checked={!warn}
              onChange={(e) => {
                setWarn(!e.target.checked);
                setIdleWarn(!e.target.checked);
              }}
            />{" "}
            Don't warn me again
          </label>
          <div className="row-buttons">
            <button type="button" className="btn btn-main" onClick={go}>
              Next day
            </button>
            <button type="button" className="btn" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
