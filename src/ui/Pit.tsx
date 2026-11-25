/**
 * The pit (M4): the gauge of what climbs out each night against the town's
 * defences, the watchtower's forecast, recent raids, and the dungeon pressure
 * map (what the town knows of each floor: M7.13 fog). DESIGN.md §4, §8, §18.3.
 */
import { Fold } from "./Fold";
import { library } from "../content";
import type { GatewaySetting } from "../content/types";
import { floorPower, levelPower } from "../sim/encounter";
import { fitDefenders, type RaidReport } from "../sim/raid";
import {
  awaySet,
  buildingEffects,
  defence,
  forecast,
  pitMap,
  gatewaysNow,
  sealsNow,
  sealWord,
  watchRange,
  type PitNight,
  type TownState,
} from "../sim/town";
import { ix } from "./game";
import { PitSide } from "./PitSide";

const OUTCOME_TEXT: Record<RaidReport["outcome"], string> = {
  held: "the defences held",
  repelled: "raid beaten off",
  overrun: "the defenders were beaten",
  unopposed: "nobody was fit to fight",
};

const names = (xs: readonly string[]) =>
  xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? "nobody");

/** One line about a raid that reached the town. */
export function describeRaid(r: RaidReport): string {
  const bits = [`Night of day ${r.day}: strength ${r.strength} vs defence ${r.defence}`];
  if (r.outcome === "repelled")
    bits.push(`${names(r.defenders.map((h) => h.name))} beat off ${r.raiders.length} raiders`);
  else if (r.outcome === "overrun")
    bits.push(`${names(r.defenders.map((h) => h.name))} couldn't hold them`);
  else bits.push("nobody was fit to fight");
  const dead = r.after.filter((h) => h.condition === "dead").map((h) => h.name);
  if (dead.length) bits.push(`${names(dead)} died`);
  if (r.goldStolen) bits.push(`${r.goldStolen} gold stolen`);
  if (r.damaged.length) bits.push(`${names(r.damaged.map((id) => ix.building(id).name))} damaged`);
  return bits.join("; ") + ".";
}

export function PitPanel({
  town,
  onWatchRaid,
}: {
  town: TownState;
  onWatchRaid: (raid: RaidReport) => void;
}) {
  // Heroes down below hold no post and can't defend (DESIGN.md §8, §17).
  const below = awaySet(town);
  const def = defence(ix, town, below);
  const last = town.pit.at(-1);
  const ahead = forecast(ix, town);
  const leaving = new Set([...below, ...town.party]);
  const guard = fitDefenders(
    ix,
    town.roster.filter((h) => !leaving.has(h.id)),
  );
  const top = Math.max(def, last?.strength ?? 0, ...ahead.map((f) => f.strength), 4) * 1.15;
  const defenceBuildings = library.buildings
    .map((b) => ({
      b,
      amount: buildingEffects(ix, town, b.id).reduce(
        (s, e) => s + (e.type === "defence" ? e.amount : 0),
        0,
      ),
    }))
    .filter((x) => x.amount > 0);

  return (
    <Fold
      id="pit"
      title="The pit"
      summary={`Defence ${def}${last ? `, last night ${last.strength}` : ""}`}
    >
      <p className="muted small">
        Whatever the dungeon can't hold climbs out at night. Strength = monsters × their level. Your
        defences hold back their total; anything over that raids the town.
      </p>

      <div className="gauges">
        <Gauge
          label={last ? `Last night (day ${last.day})` : "No nights yet"}
          value={last?.strength ?? 0}
          defence={def}
          top={top}
          note={
            last
              ? `${last.climbed} climbed out${last.climbed ? ` at level ${last.level.toFixed(1)}` : ""}: ${OUTCOME_TEXT[last.outcome]}.`
              : "Pass a day or send a party down to see what climbs out."
          }
        />
        {ahead.map((f, i) => (
          <Gauge
            key={f.day}
            label={i === 0 ? "Tonight, says the watchtower" : `Night of day ${f.day}`}
            value={f.strength}
            defence={def}
            top={top}
            note={
              f.strength > def
                ? `A raid is coming unless a party thins out the dungeon first. ${f.strength - def} strength will get past the walls.`
                : "The walls should hold."
            }
          />
        ))}
      </div>
      {!ahead.length ? (
        <p className="muted small">Build a Watchtower to see tonight's overflow coming.</p>
      ) : null}

      <p className="small">
        Defence <strong>{def}</strong>
        {defenceBuildings.length
          ? ` (${defenceBuildings.map((x) => `${x.b.name} ${x.amount}`).join(", ")})`
          : ": none built yet"}
        {town.damaged.some((id) =>
          ix.building(id).levels.some((l) => l.effects.some((e) => e.type === "defence")),
        )
          ? ". Damaged defences don't count until repaired"
          : ""}
        {below.size ? ". Heroes down below don't count" : ""}. Home guard if the party leaves:{" "}
        <strong>{guard.length ? names(guard.map((h) => h.name)) : "nobody fit"}</strong>.
      </p>

      {town.pit.length > 1 ? <PitHistory nights={town.pit.slice(-30)} /> : null}

      {town.raids.length ? (
        <>
          <h3>Recent raids</h3>
          <ul className="raids">
            {[...town.raids].reverse().map((r) => (
              <li key={r.day} className={`raid raid-${r.outcome}`}>
                {describeRaid(r)}{" "}
                {r.log.length ? (
                  <button type="button" className="link" onClick={() => onWatchRaid(r)}>
                    Watch the fight
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <PressureMap town={town} />
    </Fold>
  );
}

function Gauge({
  label,
  value,
  defence: def,
  top,
  note,
}: {
  label: string;
  value: number;
  defence: number;
  top: number;
  note: string;
}) {
  const over = value > def;
  return (
    <div className="gauge">
      <div className="gauge-head">
        <span>{label}</span>
        <span className="num">
          <strong>{value}</strong> vs {def}
        </span>
      </div>
      <div
        className="gauge-track"
        role="img"
        aria-label={`Overflow strength ${value} against defence ${def}`}
      >
        <span
          className={`gauge-fill${over ? " over" : ""}`}
          style={{ width: `${(value / top) * 100}%` }}
        />
        <span className="gauge-wall" style={{ left: `${(def / top) * 100}%` }} />
      </div>
      <p className="muted small quiet">{note}</p>
    </div>
  );
}

/** Overflow strength per night as bars, with the defence as a dashed step line. */
function PitHistory({ nights }: { nights: readonly PitNight[] }) {
  const W = 600;
  const H = 120;
  const pad = { l: 28, r: 8, t: 8, b: 20 };
  const max = Math.max(4, ...nights.map((n) => Math.max(n.strength, n.defence))) * 1.1;
  const step = (W - pad.l - pad.r) / nights.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const barW = Math.max(2, step - 2);
  const defencePath = nights
    .map((n, i) => {
      const x0 = pad.l + i * step;
      return `${i ? "L" : "M"}${x0},${y(n.defence)} L${x0 + step},${y(n.defence)}`;
    })
    .join(" ");
  const kind = (n: PitNight) =>
    n.outcome === "held" ? "held" : n.outcome === "repelled" ? "repelled" : "through";

  return (
    <figure className="pit-history">
      <figcaption className="small">
        Overflow strength, last {nights.length} nights{" "}
        <span className="legend">
          <span className="swatch held" /> held by the walls
          <span className="swatch repelled" /> raid beaten off
          <span className="swatch through" /> raid got through
          <span className="swatch wall" /> defence
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Overflow strength per night against defence"
      >
        <line className="axis" x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} />
        <text className="tick" x={pad.l - 4} y={y(0)} textAnchor="end" dominantBaseline="middle">
          0
        </text>
        <text
          className="tick"
          x={pad.l - 4}
          y={y(max / 1.1)}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {Math.round(max / 1.1)}
        </text>
        {nights.map((n, i) => {
          const x = pad.l + i * step + 1;
          const h = Math.max(0, y(0) - y(n.strength));
          return (
            <g key={n.day}>
              <rect
                className="hit"
                x={pad.l + i * step}
                y={pad.t}
                width={step}
                height={H - pad.t - pad.b}
              >
                <title>
                  {`Day ${n.day}: ${n.climbed} climbed out (level ${n.level.toFixed(1)}), strength ${n.strength} vs defence ${n.defence}: ${OUTCOME_TEXT[n.outcome]}`}
                </title>
              </rect>
              {h > 0 ? (
                <path
                  className={`bar ${kind(n)}`}
                  d={roundedTop(x, y(0), barW, h, Math.min(4, barW / 2, h))}
                />
              ) : null}
            </g>
          );
        })}
        <path className="wall-line" d={defencePath} />
        <text className="tick" x={pad.l} y={H - 4}>
          day {nights[0]!.day}
        </text>
        <text className="tick" x={W - pad.r} y={H - 4} textAnchor="end">
          day {nights.at(-1)!.day}
        </text>
      </svg>
    </figure>
  );
}

/** A bar anchored at the baseline with rounded top corners. */
function roundedTop(x: number, base: number, w: number, h: number, r: number): string {
  const top = base - h;
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** How wide the bar is for a floor known only roughly: the middle of its fog band. */
function bandWidth(band: string): number {
  const bands = ix.lib.scouting.fog.bands;
  const i = bands.findIndex((b) => b.name === band);
  if (i < 0) return 0;
  const lo = i ? bands[i - 1]!.below : 0;
  return Math.min(1, (lo + Math.min(1, bands[i]!.below)) / 2);
}

const SOURCE_TEXT = {
  watch: "the Watchtower, today",
  scouts: "scouts",
  party: "a party",
  none: "",
} as const;

/**
 * Per floor: what the town knows of how full it is and how strong its monsters
 * are (DESIGN.md §4; M7.13 fog, §18.3). The Watchtower watches the top floors;
 * the rest is the last word from a party or scouts, dated.
 */
function PressureMap({ town }: { town: TownState }) {
  const below = awaySet(town);
  const known = pitMap(ix, town, below);
  const watch = watchRange(ix, town, below);
  const seals = sealsNow(ix, town);
  const gates = gatewaysNow(ix, town);
  const setting = (s: GatewaySetting) => ix.lib.sealing.gateway.settings[s].name;
  return (
    <>
      <h3>Dungeon pressure</h3>
      <p className="muted small">
        The bottom floor breeds, more every day, and full floors push their weakest up. Kill them to
        make room and let a floor calm down. The town only knows what it can see:{" "}
        {watch.floors
          ? `the watch over the pit shows ${watch.floors === 1 ? "floor 1" : `floors 1-${watch.floors}`}${watch.exact ? `, and counts ${watch.exact === 1 ? "floor 1" : `floors 1-${watch.exact}`}` : " roughly"}; `
          : "build a Watchtower (or man the lookout) to watch floor 1; "}
        below that, it's the last word from a party or scouts, forgotten after{" "}
        {ix.lib.scouting.fog.fadeDays} days.
      </p>
      <PitSide
        town={town}
        known={known}
        seals={seals}
        gates={gates.map((g) => ({
          floor: g.floor,
          setting: setting(g.setting),
          damaged: g.damaged,
          percent: g.percent,
          ...(g.way ? { way: g.way.id } : {}),
        }))}
        width={(k) =>
          k.population !== undefined
            ? Math.min(1, k.population / ix.floor(k.depth).capacity)
            : k.band
              ? bandWidth(k.band)
              : 0
        }
      />
      <Fold id="pit-floors" title="Floor by floor" level={3}>
        <table className="pressure">
          <thead>
            <tr>
              <th>Floor</th>
              <th>How full</th>
              <th>Level</th>
              <th>Word from</th>
            </tr>
          </thead>
          <tbody>
            {known.map((k) => {
              const def = ix.floor(k.depth);
              const width =
                k.population !== undefined
                  ? Math.min(1, k.population / def.capacity)
                  : k.band
                    ? bandWidth(k.band)
                    : 0;
              const seal = seals.find((x) => x.floor === def.depth);
              const gate = gates.find((x) => x.floor === def.depth);
              return [
                <tr key={def.id} className={k.source === "none" ? "muted" : undefined}>
                  <td>
                    {def.depth}: {def.name}
                  </td>
                  <td>
                    {k.band ? (
                      <>
                        <span className="pop-track" aria-hidden="true">
                          <span
                            className={`pop-fill${width >= 1 ? " full" : ""}${k.population === undefined ? " rough" : ""}`}
                            style={{ width: `${width * 100}%` }}
                          />
                        </span>{" "}
                        <span className={k.stale ? "warn" : undefined}>
                          {k.band}
                          {k.population !== undefined ? (
                            <span className="num muted">
                              {" "}
                              ({k.source === "scouts" ? "about " : ""}
                              {k.population}/{def.capacity})
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      "unknown"
                    )}
                  </td>
                  <td className="num">
                    {k.level !== undefined ? (
                      <>
                        {k.level.toFixed(1)}{" "}
                        <span
                          className="muted small"
                          title="Total monster power of a typical fight there, and on day 1"
                        >
                          (power {levelPower(k.level)}, was {floorPower(def.depth)})
                        </span>
                      </>
                    ) : (
                      <span className="muted">?</span>
                    )}
                  </td>
                  <td className="small">
                    {k.source === "none" ? (
                      <span className="muted">nobody's been down lately</span>
                    ) : k.source === "watch" ? (
                      SOURCE_TEXT.watch
                    ) : (
                      <span className={k.stale ? "warn" : undefined}>
                        {k.by ?? SOURCE_TEXT[k.source]}
                        {k.source === "scouts" ? " (scouting)" : ""}, day {k.day}
                        {k.daysAgo ? ` (${k.daysAgo} ${k.daysAgo === 1 ? "day" : "days"} ago)` : ""}
                        {k.stale ? ", may be out of date" : ""}
                      </span>
                    )}
                  </td>
                </tr>,
                seal ? (
                  <tr key={`${def.id}-seal`} className="seal-row">
                    <td colSpan={4} className="small">
                      Stairs down sealed: {seal.name.toLowerCase()},{" "}
                      <span className={seal.percent < 34 ? "warn" : undefined}>
                        {sealWord(seal.percent)} ({seal.percent}%)
                      </span>
                      <span className="muted">
                        , put up {seal.by ? `by ${seal.by} ` : ""}on day {seal.day}
                      </span>
                    </td>
                  </tr>
                ) : null,
                gate ? (
                  <tr key={`${def.id}-gate`} className="seal-row">
                    <td colSpan={4} className="small">
                      Stairs down held by the {ix.item(gate.stone).name}, level {gate.level}:{" "}
                      {gate.damaged ? (
                        <span className="warn">breached, standing open until it's mended</span>
                      ) : (
                        <>
                          {setting(gate.setting)}
                          {gate.setting === "open" ? null : (
                            <span className={gate.percent >= 75 ? "warn" : "muted"}>
                              , strain {gate.percent}%
                            </span>
                          )}
                        </>
                      )}
                      <span className="muted"> (the Hearthstone panel sets it)</span>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </Fold>
    </>
  );
}
