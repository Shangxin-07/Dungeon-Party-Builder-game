/**
 * The town screen (M3): recruit, kit out, pick a party and its formation, set
 * standing orders, launch, watch the trip and see what came back. All the
 * rules live in src/sim/town.ts; this file only shows the state and calls
 * those actions.
 */
import { useEffect, useState } from "react";
import { heroNames, library } from "../content";
import type { ItemDef, Row } from "../content/types";
import { describeRetreat, type LootRule } from "../sim/expedition";
import { EQUIP_SLOTS, heroSheet, type EquipSlot, type Hero } from "../sim/hero";
import {
  buy,
  buyPrice,
  cantLaunch,
  dismiss,
  equip,
  hire,
  launch,
  launchWarnings,
  newTown,
  nextLevel,
  packItem,
  partySlots,
  rest,
  rosterSize,
  sell,
  sellPrice,
  setOrders,
  setRow,
  shopStock,
  toggleParty,
  TOWN_VERSION,
  TownError,
  unequip,
  unpackItem,
  upgrade,
  type TownState,
} from "../sim/town";
import { RETREATS } from "./Expedition";
import { ix } from "./game";
import { DERIVED_LABELS, HeroBars, Results, StatSheet, TripPlayer } from "./Watch";

const SAVE_KEY = "dpb-town";

function load(): TownState | undefined {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return undefined;
    const town = JSON.parse(raw) as TownState;
    return town.version === TOWN_VERSION ? town : undefined;
  } catch {
    return undefined;
  }
}

function save(town: TownState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(town));
  } catch {
    // Private windows and full storage: the game still plays, it just won't remember.
  }
}

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

export function TownGame() {
  const [town, setTown] = useState<TownState>(() => load() ?? freshTown());
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => save(town), [town]);

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
  if (watching && trip) {
    return (
      <section className="town" aria-labelledby="watch-heading">
        <h2 id="watch-heading">
          Day {trip.day}: {trip.party.map((h) => h.name).join(", ")} go down
        </h2>
        <p className="muted">They're on their own now. You can only watch.</p>
        <TripPlayer
          heroes={trip.party}
          result={trip.result}
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
      {trip ? <LastTrip town={town} onWatch={() => setWatching(true)} /> : null}
      <PartyPanel
        town={town}
        act={act}
        onLaunch={() => {
          try {
            setTown(launch(ix, town, heroNames));
            setError(undefined);
            setWatching(true);
            window.scrollTo({ top: 0 });
          } catch (e) {
            if (e instanceof TownError) setError(e.message);
            else throw e;
          }
        }}
      />
      <Roster town={town} act={act} />
      <Recruits town={town} act={act} />
      <Market town={town} act={act} />
      <Buildings town={town} act={act} />
      <Memorial town={town} />
      <p className="muted small">
        Your town is saved in this browser.{" "}
        <button
          type="button"
          className="link"
          onClick={() => {
            if (confirm("Start a new town? Your current guild will be gone.")) {
              setTown(freshTown());
              setError(undefined);
            }
          }}
        >
          Start a new town
        </button>
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
      <span>
        Roster <strong>{town.roster.length}</strong>/{rosterSize(ix, town)}
      </span>
      <span>
        Party slots <strong>{partySlots(ix, town)}</strong>
      </span>
      <button
        type="button"
        className="btn"
        title="Everyone heals and new recruits turn up"
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
  const fallen = town.memorial.filter((m) => m.day === trip.day + trip.result.days);
  return (
    <div className="trip-town">
      {trip.goldEarned ? (
        <p>
          The Market pays <strong>{trip.goldEarned}</strong> gold for the haul.
        </p>
      ) : null}
      <table className="haul">
        <thead>
          <tr>
            <th>Hero</th>
            <th>Kills</th>
            <th>HP</th>
            <th>Now</th>
          </tr>
        </thead>
        <tbody>
          {trip.result.party.map((h) => {
            const max = heroSheet(ix, h).derived.maxHp;
            const fate = fallen.find((m) => m.name === h.name);
            return (
              <tr key={h.id}>
                <td>{h.name}</td>
                <td>{trip.kills[h.id] ?? 0}</td>
                <td>{h.condition === "ok" ? `${h.hp}/${max}` : h.condition}</td>
                <td>
                  {fate ? (fate.fate === "dead" ? "Dead" : `Lost on floor ${fate.floor}`) : "Home"}
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

function PartyPanel({ town, act, onLaunch }: { town: TownState; act: Act; onLaunch: () => void }) {
  const party = town.party.map((id) => town.roster.find((h) => h.id === id)!).filter(Boolean);
  const slots = partySlots(ix, town);
  const why = cantLaunch(ix, town);
  const warnings = launchWarnings(ix, town);
  const retreatId =
    RETREATS.find((r) => JSON.stringify(r.rule) === JSON.stringify(town.orders.retreat))?.id ??
    "hp-30";
  const row = (r: Row) => party.filter((h) => h.row === r);

  return (
    <section aria-labelledby="party-heading" className="panel">
      <h2 id="party-heading">
        The party{" "}
        <span className="muted">
          ({party.length}/{slots})
        </span>
      </h2>
      <div className="formation">
        {(["front", "back"] as const).map((r) => (
          <div key={r} className="formation-row">
            <h3>{r === "front" ? "Front row" : "Back row"}</h3>
            {row(r).length ? (
              row(r).map((h) => (
                <div key={h.id} className="formation-hero">
                  <HeroBars hero={h} />
                  <span className="muted small">
                    {ix.cls(h.classId).name} · {describeKit(h)}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted small quiet">Nobody.</p>
            )}
          </div>
        ))}
      </div>
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
      </div>

      {warnings.length ? (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="btn btn-main" disabled={!!why} onClick={onLaunch}>
        Send them down
      </button>
      {why ? <span className="muted small"> {why}</span> : null}
    </section>
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

function HeroCard({ town, hero: h, act }: { town: TownState; hero: Hero; act: Act }) {
  const inParty = town.party.includes(h.id);
  const rec = town.records[h.id];
  const sheet = heroSheet(ix, h);
  const supplies = tally(town.stash.filter((id) => ix.item(id).slot === "consumable"));
  const packFull = h.pack.length >= sheet.derived.carrySlots;

  return (
    <li className={`hero-card${inParty ? " in-party" : ""}`}>
      <div className="hero-head">
        <h3>{h.name}</h3>
        <span className="muted small">
          {ix.cls(h.classId).name}, level {h.level}
        </span>
      </div>
      <HeroBars hero={h} />
      <div className="hero-actions">
        <button
          type="button"
          className={`btn${inParty ? " btn-on" : ""}`}
          aria-pressed={inParty}
          onClick={() => act((t) => toggleParty(ix, t, h.id))}
        >
          {inParty ? "In the party" : "Add to party"}
        </button>
        <div className="seg" role="group" aria-label="Row">
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

      <h4>Gear</h4>
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
  const cost = library.town.hireCost;
  const full = town.roster.length >= rosterSize(ix, town);
  return (
    <section aria-labelledby="recruits-heading" className="panel">
      <h2 id="recruits-heading">
        Looking for work <span className="muted">({cost} gold to sign)</span>
      </h2>
      <p className="muted small">
        New faces turn up every day. Each brings their own starting kit.
        {full ? " The roster is full: upgrade the Guild Hall or dismiss someone." : ""}
      </p>
      <ul className="hero-cards">
        {town.recruits.map((h) => (
          <li key={h.id} className="hero-card recruit">
            <div className="hero-head">
              <h3>{h.name}</h3>
              <span className="muted small">{ix.cls(h.classId).name}</span>
            </div>
            <p className="muted small quiet">{ix.cls(h.classId).blurb}</p>
            <StatSheet hero={h} full />
            <p className="small quiet">Brings: {describeKit(h)}</p>
            <button
              type="button"
              className="btn"
              disabled={full || town.gold < cost}
              onClick={() => act((t) => hire(ix, t, h.id))}
            >
              Hire for {cost} gold
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Market({ town, act }: { town: TownState; act: Act }) {
  const stock = shopStock(ix, town);
  const stash = tally(town.stash);
  return (
    <section aria-labelledby="market-heading" className="panel">
      <h2 id="market-heading">Market</h2>
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
                          Sell for {sellPrice(ix, item)}
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
      <ul className="cards">
        {library.buildings.map((b) => {
          const level = town.buildings[b.id] ?? 0;
          const now = level ? b.levels[level - 1] : undefined;
          const next = nextLevel(ix, town, b.id);
          return (
            <li key={b.id} className="card">
              <h3>
                {b.name}{" "}
                <span className="muted small">{level ? `level ${level}` : "not built"}</span>
              </h3>
              <p className="small">{b.blurb}</p>
              {now ? <p className="small">Now: {now.summary}.</p> : null}
              {next ? (
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

function Memorial({ town }: { town: TownState }) {
  if (!town.memorial.length) return null;
  return (
    <section aria-labelledby="memorial-heading" className="panel">
      <h2 id="memorial-heading">Memorial</h2>
      <ul className="memorial">
        {[...town.memorial].reverse().map((m, i) => (
          <li key={i}>
            <strong>{m.name}</strong>, {ix.cls(m.classId).name}.{" "}
            {m.fate === "dead" ? "Died" : "Lost"} on floor {m.floor}, day {m.day}.{" "}
            <span className="muted">
              {m.record.trips} {m.record.trips === 1 ? "trip" : "trips"}, {m.record.kills} kills.
              {m.fate === "lost" ? " Rescue runs are coming later." : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
