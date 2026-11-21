/**
 * The town screen: recruit, kit out, pick a party and its formation, set
 * standing orders, launch, watch the trip and see what came back (M3). Watch
 * the pit and its raids, build defences, and keep save slots (M4). Morale,
 * level-ups and rescue runs (M5) are in Heroes.tsx and Lost.tsx. All the
 * rules live in src/sim/town.ts; this file only shows the state and calls
 * those actions.
 */
import { useEffect, useState } from "react";
import { heroNames, library } from "../content";
import type { ItemDef, Row } from "../content/types";
import { describeParty, partyAlignment } from "../sim/alignment";
import { describeRetreat, type LootRule } from "../sim/expedition";
import {
  baseClasses,
  bestClass,
  EQUIP_SLOTS,
  heroSheet,
  heroTitle,
  trainRecruit,
  type EquipSlot,
  type Hero,
} from "../sim/hero";
import {
  answerRaise,
  autoStart,
  builderHands,
  buy,
  buyPrice,
  cantLaunch,
  defence,
  dismiss,
  equip,
  fightsToTrain,
  haggler,
  hire,
  hirePorter,
  hirePrice,
  kitOut,
  launch,
  launchWarnings,
  marketRate,
  newTown,
  nextLevel,
  packItem,
  partyOnFile,
  partySlots,
  pickParty,
  renameParty,
  saveParty,
  savedParty,
  cancelRescue,
  repair,
  repairCost,
  rescueSite,
  rest,
  rosterSize,
  sell,
  sellPrice,
  setOrders,
  setRow,
  shopStock,
  toggleParty,
  TownError,
  trainPorter,
  underConstruction,
  unequip,
  unpackItem,
  upgrade,
  wage,
  wageBill,
  type Construction,
  type TownState,
} from "../sim/town";
import type { RaidReport } from "../sim/raid";
import { importSave } from "../sim/save";
import { RETREATS } from "./Expedition";
import { ix } from "./game";
import { describeRaid, PitPanel } from "./Pit";
import {
  activeSlot,
  adoptLegacySave,
  clearSlot,
  downloadSave,
  downloadRaw,
  inspectSlot,
  type SlotState,
  setActiveSlot,
  SLOTS,
  writeSlot,
} from "./saves";
import { DERIVED_LABELS, HeroBars, Results, StatSheet, TripPlayer } from "./Watch";
import {
  AbilityList,
  ClassList,
  LevelUpPicker,
  MoraleBar,
  PerkList,
  Personality,
  WearBar,
  XpBar,
} from "./Heroes";
import { RestockPanel } from "./Restock";
import { ScoutingReport } from "./Report";
import { Departed, LostPanel, TalkPanel } from "./Lost";
import { Accounts } from "./Accounts";

const freshTown = () => newTown(ix, heroNames, Date.now() % 2 ** 31);

const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: "Weapon",
  offhand: "Off hand",
  armor: "Armour",
};

/** "+4 attack, +2 accuracy", "heals 20", "slashing, ranged". */
export function describeItem(item: ItemDef): string {
  const bits: string[] = [];
  if (item.damageType) bits.push(item.damageType + (item.ranged ? ", ranged" : ""));
  for (const p of item.passives ?? []) {
    if (p.type === "modifyStat") {
      const label =
        p.stat in DERIVED_LABELS ? DERIVED_LABELS[p.stat as keyof typeof DERIVED_LABELS] : p.stat;
      bits.push(`${p.amount > 0 ? "+" : ""}${p.amount} ${label.toLowerCase()}`);
    } else if (p.type === "modifySkill")
      bits.push(`${p.amount > 0 ? "+" : ""}${p.amount} ${p.skill}`);
    else if (p.type === "resist") bits.push(`${p.percent}% ${p.damageType} resist`);
    else if (p.type === "bonusVsTag") bits.push(`+${p.percent}% vs ${p.tag}`);
  }
  for (const e of item.use ?? []) {
    if (e.type === "heal") bits.push(`heals ${e.amount}`);
    else if (e.type === "dealDamage") bits.push(`${e.amount} ${e.damageType} damage`);
  }
  return bits.join(", ");
}

/** Count item ids: [["sword", 2], ...] in first-seen order. */
function tally(ids: readonly string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
  return [...m];
}

type Act = (f: (t: TownState) => TownState) => void;

type Game = { slot: number; town: TownState };
type Start = Game | { slot: number; problem: Extract<SlotState, { state: "unreadable" }> };

function startingGame(): Start {
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

function SaveProblem({
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

function TownPlay({ initial }: { initial: Game }) {
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
      {town.freeHires > 0 ? <Recruits town={town} act={act} /> : null}
      <RestockPanel town={town} act={act} />
      <TalkPanel town={town} />
      <LostPanel town={town} act={act} />
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
      <PitPanel
        town={town}
        onWatchRaid={(r) => {
          setWatching(r);
          window.scrollTo({ top: 0 });
        }}
      />
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

function Saves({
  slot,
  town,
  onSwitch,
  onError,
}: {
  slot: number;
  town: TownState;
  onSwitch: (slot: number, town: TownState) => void;
  onError: (message: string) => void;
}) {
  // Re-read the other slots whenever the town changes, so "saved at" stays fresh.
  const slots = SLOTS.map((n) => {
    const s: SlotState | undefined = n === slot ? undefined : inspectSlot(n);
    return { n, s, info: s?.state === "ok" ? s : undefined };
  });
  return (
    <section aria-labelledby="saves-heading" className="panel">
      <h2 id="saves-heading">Saves</h2>
      <p className="muted small">
        Your guild saves itself in this browser after everything you do. Keep up to {SLOTS.length}{" "}
        guilds going in separate slots, or save one to a file to keep it safe or move it to another
        computer.
      </p>
      <ul className="slots">
        {slots.map(({ n, s, info }) => {
          const t = n === slot ? town : info?.town;
          if (s?.state === "unreadable")
            return (
              <li key={n} className="slot">
                <strong>Slot {n}</strong>{" "}
                <span className="muted small">Can't be loaded: {s.reason}</span>
                <span className="slot-actions">
                  <button type="button" className="btn" onClick={() => downloadRaw(n, s.raw)}>
                    Download it
                  </button>
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      if (!confirm(`Delete the save in slot ${n}? It will be gone for good.`))
                        return;
                      clearSlot(n);
                      onError("");
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            );
          return (
            <li key={n} className={`slot${n === slot ? " playing" : ""}`}>
              <strong>Slot {n}</strong>{" "}
              {t ? (
                <span className="muted small">
                  Day {t.day}, {t.gold} gold, {t.roster.length} heroes
                  {t.memorial.length ? `, ${t.memorial.length} fallen` : ""}
                  {info ? `. Saved ${info.savedAt.toLocaleString()}` : ""}
                </span>
              ) : (
                <span className="muted small">Empty</span>
              )}
              <span className="slot-actions">
                {n === slot ? (
                  <span className="small">Playing</span>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onSwitch(n, info?.town ?? freshTown())}
                  >
                    {info ? "Play" : "Start a guild here"}
                  </button>
                )}
                {t ? (
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      const what = n === slot ? "your current guild" : `the guild in slot ${n}`;
                      if (!confirm(`Start over in slot ${n}? ${what} will be gone.`)) return;
                      if (n === slot) onSwitch(n, freshTown());
                      else clearSlot(n);
                      onError("");
                    }}
                  >
                    {n === slot ? "Start over" : "Delete"}
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="small">
        <button type="button" className="btn" onClick={() => downloadSave(town)}>
          Save to a file
        </button>{" "}
        <label className="btn file-btn">
          Load from a file…
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const loaded = importSave(ix, await file.text());
                if (
                  confirm(
                    `Load this guild (day ${loaded.day}) into slot ${slot}? The one there now will be replaced.`,
                  )
                )
                  onSwitch(slot, loaded);
              } catch (err) {
                onError((err as Error).message);
              }
            }}
          />
        </label>
      </p>
    </section>
  );
}

function TownBar({ town, act }: { town: TownState; act: Act }) {
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
      <span>
        Party slots <strong>{partySlots(ix, town)}</strong>
      </span>
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

/** What the last trip changed in town: gold, kills per hero, the fallen. */
function TripTown({ town }: { town: TownState }) {
  const trip = town.lastTrip!;
  const fallen = town.memorial.filter(
    (m) => m.day === trip.day + trip.result.days && m.cause !== "raid",
  );
  const quiet = trip.result.days - trip.raids.length;
  return (
    <div className="trip-town">
      <h4>Meanwhile, at the pit</h4>
      {trip.raids.length ? (
        <ul className="raids">
          {trip.raids.map((r) => (
            <li key={r.day} className={`raid raid-${r.outcome}`}>
              {describeRaid(r)}
            </li>
          ))}
        </ul>
      ) : null}
      {quiet ? (
        <p className="small">
          {quiet === trip.result.days
            ? "Every night"
            : `${quiet} other ${quiet === 1 ? "night" : "nights"}`}{" "}
          the walls held.
        </p>
      ) : null}
      {trip.goldEarned ? (
        <p>
          The Market pays <strong>{trip.goldEarned}</strong> gold for the haul
          {(trip.lootRate ?? ix.lib.town.haulRate) < 1
            ? ` (coins at face value, ${Math.round((trip.lootRate ?? ix.lib.town.haulRate) * 100)}% of the rest` +
              `${trip.haggledBy && (trip.lootRate ?? 0) > ix.lib.town.haulRate ? `, haggled up by ${trip.haggledBy}` : ""})`
            : ""}
          .
          {trip.hiddenGold ? (
            <>
              {" "}
              <strong>{trip.hiddenGold}</strong> of it came from hidden caches.
            </>
          ) : null}
        </p>
      ) : null}
      {trip.recovered?.length ? (
        <p>
          Back in the store room:{" "}
          {trip.recovered
            .map((g) => `${g.owner ? `${g.owner}'s ` : ""}${ix.item(g.item).name.toLowerCase()}`)
            .join(", ")}
          .
        </p>
      ) : null}
      {trip.rescued?.length ? (
        <p className="good">
          Rescued: <strong>{trip.rescued.join(", ")}</strong>. They're home, weak but alive.
        </p>
      ) : null}
      {trip.trapped?.length ? (
        <p className="warn">
          {trip.trapped.join(", ")} {trip.trapped.length > 1 ? "are" : "is"} still alive down there,
          trapped. A rescue party has {ix.lib.rescue.windowDays} days. See "Lost in the dungeon".
        </p>
      ) : null}
      {trip.quit?.length ? (
        <p className="warn">{trip.quit.join(", ")} had enough and quit the guild.</p>
      ) : null}
      <table className="haul">
        <thead>
          <tr>
            <th>Hero</th>
            <th>Kills</th>
            <th>HP</th>
            <th>XP</th>
            <th>Morale</th>
            <th>Fatigue</th>
            <th>Now</th>
          </tr>
        </thead>
        <tbody>
          {trip.result.party.map((h) => {
            const max = heroSheet(ix, h).derived.maxHp;
            const fate = fallen.find((m) => m.name === h.name);
            const trapped = trip.trapped?.includes(h.name);
            const levels = trip.levels?.[h.id] ?? 0;
            const morale = trip.morale?.[h.id] ?? [];
            const total = morale.reduce((s, c) => s + c.amount, 0);
            return (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td>{trip.kills[h.id] ?? 0}</td>
                <td>{h.condition === "ok" ? `${h.hp}/${max}` : h.condition}</td>
                <td>
                  {trip.xp?.[h.id] ? `+${trip.xp[h.id]}` : "–"}
                  {levels ? <strong className="good"> level up!</strong> : null}
                </td>
                <td
                  title={morale
                    .map((c) => `${c.amount > 0 ? "+" : ""}${c.amount} ${c.reason}`)
                    .join("\n")}
                >
                  {morale.length ? (
                    <span className={total >= 0 ? "up" : "down"}>
                      {total > 0 ? "+" : ""}
                      {total}
                    </span>
                  ) : (
                    "–"
                  )}
                  {morale.length ? (
                    <span className="muted small">
                      {" "}
                      {morale
                        .map((c) => `${c.reason} ${c.amount > 0 ? "+" : ""}${c.amount}`)
                        .join("; ")}
                    </span>
                  ) : null}
                </td>
                <td>{trip.fatigue?.[h.id] ?? "–"}</td>
                <td>
                  {trapped
                    ? "Trapped"
                    : fate
                      ? fate.fate === "dead"
                        ? "Dead"
                        : `Lost on floor ${fate.floor}`
                      : "Home"}
                  {trip.injuries?.[h.id]?.length ? (
                    <span className="warn">
                      {", "}
                      {trip.injuries[h.id]!.map((i) => ix.injury(i).name.toLowerCase()).join(", ")}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LastTrip({ town, onWatch }: { town: TownState; onWatch: () => void }) {
  const trip = town.lastTrip!;
  const r = trip.result;
  const what = {
    returned: "came home with orders carried out",
    retreated: "turned back early",
    wiped: "fell in the dungeon",
  }[r.outcome];
  return (
    <p className={`last-trip last-${r.outcome}`}>
      Last trip (day {trip.day}): the party reached floor {r.deepestFloor} and {what}.{" "}
      {trip.goldEarned ? `+${trip.goldEarned} gold. ` : ""}
      <button type="button" className="link" onClick={onWatch}>
        Watch it again
      </button>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Party, formation and orders
// ---------------------------------------------------------------------------

function PartyPanel({
  town,
  act,
  onLaunch,
}: {
  town: TownState;
  act: Act;
  /** Send the party, after `prep` (e.g. picking a party on file) if given. */
  onLaunch: (prep?: (t: TownState) => TownState) => void;
}) {
  const party = town.party.map((id) => town.roster.find((h) => h.id === id)!).filter(Boolean);
  const slots = partySlots(ix, town);
  const why = cantLaunch(ix, town);
  const warnings = launchWarnings(ix, town);
  const retreatId =
    RETREATS.find((r) => JSON.stringify(r.rule) === JSON.stringify(town.orders.retreat))?.id ??
    "hp-30";
  const row = (r: Row) => party.filter((h) => h.row === r);
  const site = rescueSite(town);

  return (
    <section aria-labelledby="party-heading" className="panel">
      <h2 id="party-heading">
        The party{" "}
        <span className="muted">
          ({party.length}/{slots})
        </span>
      </h2>
      {site ? (
        <p className="mission">
          Rescue run: down to floor {site.floor} to find{" "}
          {site.trapped.length
            ? site.trapped.map((x) => x.hero.name).join(" and ")
            : `what's left of ${site.bodies.join(" and ") || "the lost party"}`}
          .{" "}
          <button type="button" className="link" onClick={() => act((t) => cancelRescue(ix, t))}>
            Make it an ordinary trip
          </button>
        </p>
      ) : null}
      <PartiesOnFile town={town} act={act} onLaunch={onLaunch} />
      <div className="formation">
        {(["front", "back"] as const).map((r) => (
          <div key={r} className="formation-row">
            <h3>{r === "front" ? "Front row" : "Back row"}</h3>
            {row(r).length ? (
              row(r).map((h) => (
                <div key={h.id} className="formation-hero">
                  <HeroBars hero={h} />
                  <span className="muted small">
                    {heroTitle(ix, h, true)} · {ix.alignment(h.alignment).name} · morale {h.morale}{" "}
                    · {describeKit(h)}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted small quiet">Nobody.</p>
            )}
          </div>
        ))}
      </div>
      {party.length ? (
        <p
          className={`small${partyAlignment(ix, party).divided || partyAlignment(ix, party).mismatched.length ? " warn" : " muted"}`}
          title="Two-thirds of the party set its alignment; everyone else should be within one step (Good and Evil are two apart). Clashes cost morale every day down there."
        >
          {describeParty(ix, party)}
        </p>
      ) : null}
      {slots > party.length ? (
        <p className="muted small">
          {slots - party.length} empty {slots - party.length === 1 ? "slot" : "slots"}. Add heroes
          from the roster below.
        </p>
      ) : null}

      <div className="controls">
        <label>
          Go to floor{" "}
          <select
            value={town.orders.targetFloor}
            onChange={(e) =>
              act((t) => setOrders(ix, t, { ...t.orders, targetFloor: Number(e.target.value) }))
            }
          >
            {library.floors.map((f) => (
              <option key={f.depth} value={f.depth}>
                {f.depth}: {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orders{" "}
          <select
            value={retreatId}
            onChange={(e) => {
              const rule = RETREATS.find((r) => r.id === e.target.value)!.rule;
              act((t) => setOrders(ix, t, { ...t.orders, retreat: rule }));
            }}
          >
            {RETREATS.map((r) => (
              <option key={r.id} value={r.id}>
                {describeRetreat(r.rule)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loot{" "}
          <select
            value={town.orders.loot}
            onChange={(e) =>
              act((t) => setOrders(ix, t, { ...t.orders, loot: e.target.value as LootRule }))
            }
          >
            <option value="everything">carry everything</option>
            <option value="valuable">leave the junk</option>
          </select>
        </label>
        <label
          title={`After walking floor ${town.orders.targetFloor}, stay and hunt until this share of its monsters are dead. Each ${ix.lib.dungeon.hunting.roomsPerDay} extra rooms take a day; retreat orders still apply.`}
        >
          Hunting{" "}
          <select
            value={town.orders.clearPercent ?? 0}
            onChange={(e) =>
              act((t) =>
                setOrders(ix, t, {
                  ...t.orders,
                  clearPercent: Number(e.target.value) || undefined,
                }),
              )
            }
          >
            <option value={0}>just walk the floor</option>
            {[25, 50, 75, 100].map((p) => (
              <option key={p} value={p}>
                thin floor {town.orders.targetFloor} out by {p}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="small">
        Porters{" "}
        <span className="muted">
          ({(town.porters ?? []).length}/{ix.lib.town.porters.slots})
        </span>
        :{" "}
        {(town.porters ?? []).length ? (
          (town.porters ?? []).map((id) => town.roster.find((x) => x.id === id)?.name).join(", ") +
          ` ${(town.porters ?? []).length === 1 ? "carries" : "carry"} ${(
            town.porters ?? []
          ).reduce((s, id) => {
            const p = town.roster.find((x) => x.id === id);
            return s + (p ? heroSheet(ix, p).derived.carrySlots : 0);
          }, 0)} more slots of loot.`
        ) : (
          <span className="muted">
            none. Porters carry loot, don't fight, and run for home if the party falls.
          </span>
        )}
      </p>
      <ScoutingReport town={town} party={party} />
      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="btn btn-main" disabled={!!why} onClick={() => onLaunch()}>
        Send them down
      </button>
      {why ? <span className="muted small"> {why}</span> : null}
    </section>
  );
}

/** Same heroes, any order. */
const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/**
 * Parties on file (M6): keep two parties and alternate them, so one rests
 * while the other is down there. Pick one to make it the party, or pick and
 * send it in one go.
 */
function PartiesOnFile({
  town,
  act,
  onLaunch,
}: {
  town: TownState;
  act: Act;
  onLaunch: (prep?: (t: TownState) => TownState) => void;
}) {
  const slots = Array.from({ length: ix.lib.town.savedParties }, (_, i) => i);
  return (
    <div className="parties-on-file">
      <h3>Parties on file</h3>
      <ul className="cards">
        {slots.map((slot) => {
          const p = savedParty(town, slot);
          const { heroes, porters } = partyOnFile(town, slot);
          let why: string | undefined;
          let tired: string[] = [];
          if (p && heroes.length) {
            try {
              const picked = pickParty(ix, town, slot);
              why = cantLaunch(ix, picked);
              tired = launchWarnings(ix, picked).filter((w) => /fatigue|% HP/.test(w));
            } catch (e) {
              why = (e as Error).message;
            }
          }
          const current =
            !!p &&
            heroes.length > 0 &&
            sameIds(
              town.party,
              heroes.map((h) => h.id),
            );
          return (
            <li key={slot} className={`card party-card${current ? " in-party" : ""}`}>
              {p ? (
                <>
                  <h4>
                    <input
                      key={p.name}
                      className="party-name"
                      aria-label={`Name of party ${slot + 1}`}
                      defaultValue={p.name}
                      maxLength={24}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== p.name)
                          act((t) => renameParty(ix, t, slot, e.target.value));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                    {current ? <span className="muted small"> (picked)</span> : null}
                  </h4>
                  <p className="small">
                    {heroes.length
                      ? heroes.map((h) => `${h.name} (${heroTitle(ix, h, true)})`).join(", ")
                      : "Nobody from it is left in the guild."}
                    {porters.length
                      ? `, carried for by ${porters.map((h) => h.name).join(", ")}`
                      : ""}
                  </p>
                  <p className="small muted">
                    Floor {p.orders.targetFloor}, {describeRetreat(p.orders.retreat)}
                    {p.orders.clearPercent ? `, thinning it out by ${p.orders.clearPercent}%` : ""}.
                  </p>
                  {why ? (
                    <p className="small warn">{why}</p>
                  ) : tired.length ? (
                    <p className="small warn">{tired.join(" ")}</p>
                  ) : heroes.length ? (
                    <p className="small good">Rested and ready.</p>
                  ) : null}
                  <div className="row-buttons">
                    <button
                      type="button"
                      className="btn"
                      disabled={!heroes.length || current}
                      onClick={() => act((t) => pickParty(ix, t, slot))}
                    >
                      Pick
                    </button>
                    <button
                      type="button"
                      className="btn btn-main"
                      disabled={!!why || !heroes.length}
                      onClick={() => onLaunch((t) => pickParty(ix, t, slot))}
                    >
                      Send {p.name}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!town.party.length}
                      title="Keep the party below, its porters and orders, in this slot"
                      onClick={() => act((t) => saveParty(ix, t, slot))}
                    >
                      {current ? "Save changes" : "Replace with current"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4>{`Party ${String.fromCharCode(65 + slot)}`}</h4>
                  <p className="small muted">
                    Empty. Pick heroes and orders below, then keep them here.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    disabled={!town.party.length}
                    onClick={() => act((t) => saveParty(ix, t, slot))}
                  >
                    Keep the current party here
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function describeKit(h: Hero): string {
  const gear = EQUIP_SLOTS.map((s) => h.equipment[s])
    .filter((id): id is string => !!id)
    .map((id) => ix.item(id).name);
  const pack = tally(h.pack).map(([id, n]) => `${ix.item(id).name}${n > 1 ? ` ×${n}` : ""}`);
  return [...gear, ...pack].join(", ") || "empty-handed";
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

function Roster({ town, act }: { town: TownState; act: Act }) {
  return (
    <section aria-labelledby="roster-heading" className="panel">
      <h2 id="roster-heading">Roster</h2>
      {town.roster.length ? (
        <ul className="hero-cards">
          {town.roster.map((h) => (
            <HeroCard key={h.id} town={town} hero={h} act={act} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nobody is left in the guild. Hire someone below.</p>
      )}
    </section>
  );
}

/** A porter's progress towards training, and the class picker once they're ready. */
function PorterTraining({ hero: h, act }: { hero: Hero; act: Act }) {
  const left = fightsToTrain(ix, h);
  const fit = bestClass(ix, h.stats);
  const [classId, setClassId] = useState(fit);
  const need = ix.lib.town.porters.trainAfterFights;
  return (
    <div className="small">
      <p className="quiet">
        Watched {h.porter!.watched} {h.porter!.watched === 1 ? "fight" : "fights"}
        {left ? ` (${left} more before they can train)` : ""}; {h.porter!.xp} XP banked for when
        they do.
      </p>
      {left ? (
        <progress max={need} value={need - left} aria-label="Watched fights" />
      ) : (
        <p>
          <label>
            Train as{" "}
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {baseClasses(ix).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === fit ? " (best fit)" : ""}
                </option>
              ))}
            </select>
          </label>{" "}
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => trainPorter(ix, t, h.id, classId))}
          >
            Train
          </button>
        </p>
      )}
    </div>
  );
}

function HeroCard({ town, hero: h, act }: { town: TownState; hero: Hero; act: Act }) {
  const inParty = town.party.includes(h.id) || (town.porters ?? []).includes(h.id);
  const rec = town.records[h.id];
  const sheet = heroSheet(ix, h);
  const supplies = tally(town.stash.filter((id) => ix.item(id).slot === "consumable"));
  const packFull = h.pack.length >= sheet.derived.carrySlots;

  return (
    <li className={`hero-card${inParty ? " in-party" : ""}`}>
      <div className="hero-head">
        <h3>{h.name}</h3>
        <span className="muted small">
          {h.porter ? "Porter" : heroTitle(ix, h)}, paid {wage(ix, h)} gold a day
        </span>
        {h.levelUps.length ? <span className="badge">Level up!</span> : null}
      </div>
      <HeroBars hero={h} />
      <MoraleBar hero={h} log />
      <WearBar hero={h} />
      {h.porter ? <PorterTraining hero={h} act={act} /> : <XpBar hero={h} />}
      <Personality hero={h} town={town} />
      <LevelUpPicker key={h.levelUps[0]?.level ?? 0} hero={h} town={town} act={act} />
      {h.raiseAsk ? (
        <div className="raise">
          <p>
            <strong>{h.name} wants a raise</strong> of {h.raiseAsk.amount} gold a day (now paid{" "}
            {wage(ix, h)}). They'll take silence as a no after {ix.lib.town.raises.patienceDays}{" "}
            days.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => answerRaise(ix, t, h.id, true))}
          >
            Agree
          </button>{" "}
          <button
            type="button"
            className="btn"
            onClick={() => act((t) => answerRaise(ix, t, h.id, false))}
          >
            Refuse
          </button>
        </div>
      ) : null}
      <div className="hero-actions">
        <button
          type="button"
          className={`btn${inParty ? " btn-on" : ""}`}
          aria-pressed={inParty}
          onClick={() => act((t) => toggleParty(ix, t, h.id))}
        >
          {h.porter
            ? inParty
              ? "Carrying for the party"
              : "Take along"
            : inParty
              ? "In the party"
              : "Add to party"}
        </button>
        <div className="seg" role="group" aria-label="Row" hidden={!!h.porter}>
          {(["front", "back"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={h.row === r ? "on" : ""}
              aria-pressed={h.row === r}
              onClick={() => act((t) => setRow(ix, t, h.id, r))}
            >
              {r === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      </div>
      <StatSheet hero={h} full />
      <ClassList hero={h} town={town} />
      <PerkList hero={h} />
      <AbilityList hero={h} />

      <h4>
        Gear{" "}
        <button
          type="button"
          className="link small"
          title={`Fill in the ${ix.cls(h.classId).name.toLowerCase()}'s usual kit (${ix
            .cls(h.classId)
            .startingKit.map((id) => ix.item(id).name)
            .join(", ")}): from the store room first, then the Market.`}
          onClick={() => act((t) => kitOut(ix, t, h.id))}
        >
          Kit out
        </button>
      </h4>
      <ul className="gear">
        {EQUIP_SLOTS.map((slot) => {
          const id = h.equipment[slot];
          const spare = tally(town.stash.filter((x) => ix.item(x).slot === slot));
          return (
            <li key={slot}>
              <span className="muted">{SLOT_NAMES[slot]}</span>
              <span>
                {id ? (
                  <>
                    {ix.item(id).name}{" "}
                    <span className="muted small">{describeItem(ix.item(id))}</span>
                  </>
                ) : (
                  <span className="muted">none</span>
                )}
              </span>
              <span className="gear-actions">
                {spare.length ? (
                  <select
                    value=""
                    aria-label={`Swap ${SLOT_NAMES[slot].toLowerCase()}`}
                    onChange={(e) => act((t) => equip(ix, t, h.id, e.target.value))}
                  >
                    <option value="">{id ? "Swap…" : "Equip…"}</option>
                    {spare.map(([x, n]) => (
                      <option key={x} value={x}>
                        {ix.item(x).name}
                        {n > 1 ? ` (${n})` : ""}
                      </option>
                    ))}
                  </select>
                ) : null}
                {id ? (
                  <button
                    type="button"
                    className="link"
                    onClick={() => act((t) => unequip(ix, t, h.id, slot))}
                  >
                    Take off
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <h4>
        Pack{" "}
        <span className="muted small">
          ({h.pack.length}/{sheet.derived.carrySlots} slots; the rest carries loot)
        </span>
      </h4>
      <div className="pack">
        {h.pack.map((id, i) => (
          <button
            key={i}
            type="button"
            className="chip"
            title={`${describeItem(ix.item(id))}. Click to put back in the store room.`}
            onClick={() => act((t) => unpackItem(ix, t, h.id, i))}
          >
            {ix.item(id).name} ×
          </button>
        ))}
        {supplies.length && !packFull ? (
          <select
            value=""
            aria-label="Pack supplies"
            onChange={(e) => act((t) => packItem(ix, t, h.id, e.target.value))}
          >
            <option value="">Pack…</option>
            {supplies.map(([x, n]) => (
              <option key={x} value={x}>
                {ix.item(x).name} ({n})
              </option>
            ))}
          </select>
        ) : null}
        {!h.pack.length && !supplies.length ? <span className="muted small">Empty.</span> : null}
      </div>

      <p className="record muted small">
        {rec
          ? `${rec.trips} ${rec.trips === 1 ? "trip" : "trips"}, ${rec.kills} kills, joined day ${rec.joined}.`
          : null}{" "}
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (confirm(`Dismiss ${h.name}? Their gear stays with the guild.`))
              act((t) => dismiss(ix, t, h.id));
          }}
        >
          Dismiss
        </button>
      </p>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Recruits, Market, buildings, memorial
// ---------------------------------------------------------------------------

function Recruits({ town, act }: { town: TownState; act: Act }) {
  const full = town.roster.length >= rosterSize(ix, town);
  const free = town.freeHires > 0;
  const trained = town.recruits.some((h) => !h.untrained);
  return (
    <section aria-labelledby="recruits-heading" className="panel">
      <h2 id="recruits-heading">
        Looking for work{" "}
        <span className="muted">
          (
          {free
            ? `${town.freeHires} will sign for nothing`
            : `${library.town.hireCost} gold to sign`}
          )
        </span>
      </h2>
      {free ? (
        <p className="small">
          Your first heroes. They have stats but no training and no gear: pick each one's class,
          then kit them out from the store room (the <em>Kit out</em> button on their card).{" "}
          <button type="button" className="link" onClick={() => act((t) => autoStart(ix, t))}>
            Pick for me
          </button>
        </p>
      ) : (
        <p className="muted small">
          New faces turn up every day, untrained and empty-handed: you pick their class and buy
          their gear.
          {trained
            ? " Thanks to the Tavern, some arrive trained and kitted, for the price of their kit."
            : ""}
          {full ? " The roster is full: upgrade the Guild Hall or dismiss someone." : ""}
        </p>
      )}
      <ul className="hero-cards">
        {town.recruits.map((h) => (
          <RecruitCard key={h.id} town={town} recruit={h} act={act} full={full} />
        ))}
      </ul>
    </section>
  );
}

const STAT_ORDER = ["STR", "DEX", "END", "PER", "INT", "WIL", "CHA"] as const;

function RecruitCard({
  town,
  recruit: h,
  act,
  full,
}: {
  town: TownState;
  recruit: Hero;
  act: Act;
  full: boolean;
}) {
  const fit = h.untrained ? bestClass(ix, h.stats) : h.classId;
  const [classId, setClassId] = useState(fit);
  const hero = h.untrained ? trainRecruit(ix, h, classId) : h;
  const price = hirePrice(ix, town, h);
  return (
    <li className="hero-card recruit">
      <div className="hero-head">
        <h3>{h.name}</h3>
        <span className="muted small">{h.untrained ? "untrained" : ix.cls(h.classId).name}</span>
      </div>
      {h.untrained ? (
        <>
          <p className="small quiet">
            Raw: {STAT_ORDER.map((k) => `${k} ${h.stats[k]}`).join(", ")}
          </p>
          <label className="small">
            Train as{" "}
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              {baseClasses(ix).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.id === fit ? " (best fit)" : ""}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <p className="muted small quiet">{ix.cls(hero.classId).blurb}</p>
      <Personality hero={hero} town={town} />
      <MoraleBar hero={hero} />
      <StatSheet hero={hero} full />
      {h.untrained ? (
        <p className="small quiet">
          Comes with nothing. Their usual kit:{" "}
          {ix
            .cls(classId)
            .startingKit.map((id) => ix.item(id).name)
            .join(", ")}
          .
        </p>
      ) : (
        <p className="small quiet">Brings: {describeKit(h)}</p>
      )}
      <button
        type="button"
        className="btn"
        disabled={full || town.gold < price}
        onClick={() => act((t) => hire(ix, t, h.id, h.untrained ? classId : undefined))}
      >
        {price ? `Hire for ${price} gold` : `Sign up as a ${ix.cls(classId).name.toLowerCase()}`}
      </button>
      {h.untrained ? (
        <button
          type="button"
          className="link small"
          title="Porters don't fight. They carry loot, watch the fighting, and run for home if the party falls. Train them in a class once they've seen enough."
          disabled={full || town.gold < ix.lib.town.porters.hireCost}
          onClick={() => act((t) => hirePorter(ix, t, h.id))}
        >
          or sign as a porter ({ix.lib.town.porters.hireCost} gold, {ix.lib.town.porters.wage} a
          day)
        </button>
      ) : null}
    </li>
  );
}

function Market({ town, act }: { town: TownState; act: Act }) {
  const stock = shopStock(ix, town);
  const haggle = haggler(ix, town);
  const stash = tally(town.stash);
  return (
    <section aria-labelledby="market-heading" className="panel">
      <h2 id="market-heading">Market</h2>
      <p className="small">
        The Market pays{" "}
        <strong>{Math.round(marketRate(ix, ix.lib.town.haulRate, haggle.bonus) * 100)}%</strong> of
        the value of loot from the pit (coins at face value) and{" "}
        <strong>{Math.round(marketRate(ix, ix.lib.town.sellRate, haggle.bonus) * 100)}%</strong> for
        gear from the store room.{" "}
        {haggle.hero ? (
          <>
            {haggle.hero.name} does the haggling (Appraisal{" "}
            {heroSheet(ix, haggle.hero).skills.appraisal ?? 0}, CHA{" "}
            {heroSheet(ix, haggle.hero).stats.CHA}).
          </>
        ) : (
          <span className="muted">
            Nobody in the guild can talk the price up. Appraisal and CHA help.
          </span>
        )}
      </p>
      <div className="market">
        <div>
          <h3>For sale</h3>
          <table className="shop">
            <tbody>
              {stock.map((id) => {
                const item = ix.item(id);
                const price = buyPrice(item);
                return (
                  <tr key={id}>
                    <td>
                      {item.name}
                      <div className="muted small">{describeItem(item)}</div>
                    </td>
                    <td className="num">{price}</td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        disabled={town.gold < price}
                        onClick={() => act((t) => buy(ix, t, id))}
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Store room</h3>
          {stash.length ? (
            <table className="shop">
              <tbody>
                {stash.map(([id, n]) => {
                  const item = ix.item(id);
                  return (
                    <tr key={id}>
                      <td>
                        {item.name}
                        {n > 1 ? ` ×${n}` : ""}
                        <div className="muted small">{describeItem(item)}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => act((t) => sell(ix, t, id))}
                        >
                          Sell for {sellPrice(ix, item, haggle.bonus)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted small">Empty. Gear you buy or take off heroes goes here.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Buildings({ town, act }: { town: TownState; act: Act }) {
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
function Helpers({ town }: { town: TownState }) {
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
function daysToFinish(town: TownState, work: Construction): number {
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
function Works({
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

function Memorial({ town }: { town: TownState }) {
  if (!town.memorial.length && !town.departed.length) return null;
  return (
    <section aria-labelledby="memorial-heading" className="panel">
      <h2 id="memorial-heading">Memorial</h2>
      <ul className="memorial">
        {[...town.memorial].reverse().map((m, i) => (
          <li key={i}>
            <strong>{m.name}</strong>, {ix.cls(m.classId).name}.{" "}
            {m.cause === "raid"
              ? "Died defending the town"
              : `${m.fate === "dead" ? "Died" : "Lost"} on floor ${m.floor}`}
            , day {m.day}.{" "}
            <span className="muted">
              {m.record.trips} {m.record.trips === 1 ? "trip" : "trips"}, {m.record.kills} kills.
              {m.fate === "lost" ? " Lost before rescue runs existed: never found." : ""}
            </span>
          </li>
        ))}
      </ul>
      <Departed town={town} />
    </section>
  );
}
