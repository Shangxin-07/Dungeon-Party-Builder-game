/**
 * The Hearthstone's shards (DESIGN.md §20): for each floor that can be sealed,
 * how many of its shards are in the store room, how many its Seal Stone
 * takes, and what the guild knows of where the rest are. Worked out in
 * src/sim/town/shards.ts; where the shards are is content (content/shards/).
 */
import { Fold } from "../Fold";
import {
  cantMendGateway,
  cantRaiseGateway,
  gatewayCostWords,
  gatewaysNow,
  mendCost,
  mendGateway,
  nextGatewayLevel,
  raiseGateway,
  setGateway,
  floorReveals,
  shardProgress,
  type ShardStatus,
  type TownState,
} from "../../sim/town";
import type { GatewaySetting } from "../../content/types";
import { ix } from "../game";
import { stoneOf } from "../../sim/shards";
import type { Act } from "./shared";

const KIND = { bearer: "Carried", cache: "Hidden", library: "Library" } as const;

export function HearthstonePanel({ town, act }: { town: TownState; act: Act }) {
  const floors = shardProgress(ix, town);
  if (!floors.length) return null;
  const found = floors.reduce((n, f) => n + f.shards.filter((x) => x.state === "found").length, 0);
  const sealed = Object.keys(town.dungeon.stones).length;
  const need = floors.reduce((n, f) => n + f.need, 0);
  return (
    <Fold
      id="hearthstone"
      title="The Hearthstone"
      summary={`${found} of ${need} shards found${sealed ? `, ${sealed} ${sealed === 1 ? "floor" : "floors"} sealed` : ""}`}
    >
      <p className="small muted">
        The miners cracked the warding stone under the Old Delve, and its shards blew up through the
        floors. Gather all of a floor's shards to forge its Seal Stone (cleansed at the Temple, or
        bound at the Black Market), then send a party to set it on the stairs below that floor: the
        floor below fights back, but once it's set, the stone is a gateway: you choose what comes up
        those stairs. Every gateway that holds blesses the town, and every seal spreads the guild's
        name. Shard-bearers keep to the back tunnels: only a party hunting a thinned-out floor meets
        one, and it won't stand and fight with a party that isn't seasoned enough.
      </p>
      {floors.map(({ set, held: have, need: n, shards }) => (
        <div key={set.id} className="shard-floor">
          <h4>
            Floor {set.floor}: {ix.floor(set.floor).name}{" "}
            <span className={have >= n || shut(town, set.floor) ? "good small" : "muted small"}>
              {town.dungeon.stones[set.floor]
                ? gateWord(town, set.floor)
                : stored(town, set.floor).length
                  ? "Seal Stone forged"
                  : `${have} of ${n} in the store room`}
            </span>
          </h4>
          {floorReveals(ix, town, set.floor).map((text, i) => (
            <p key={i} className="small reveal">
              From the Foreman's pages: {text}
            </p>
          ))}
          <StoneLine town={town} floor={set.floor} ready={have >= n} act={act} />
          <ul className="small shard-list">
            {shards.map((s) => (
              <ShardLine key={s.id} s={s} town={town} />
            ))}
          </ul>
        </div>
      ))}
    </Fold>
  );
}

/** "sealed, Trickle", "sealed, breached". */
function gateWord(town: TownState, floor: number): string {
  const s = town.dungeon.stones[floor]!;
  return `sealed, ${s.damaged ? "breached" : ix.lib.sealing.gateway.settings[s.setting].name}`;
}

const shut = (town: TownState, floor: number) =>
  !!town.dungeon.stones[floor] || stored(town, floor).length > 0;

/** Seal Stones in the store for this floor (M8.17). */
const stored = (town: TownState, floor: number) =>
  Object.keys(town.materials).filter(
    (id) => (town.materials[id] ?? 0) > 0 && stoneOf(ix, id)?.set.floor === floor,
  );

/** Where the floor's Seal Stone is (M8.17): set, waiting in the store, or ready to forge. */
function StoneLine({
  town,
  floor,
  ready,
  act,
}: {
  town: TownState;
  floor: number;
  ready: boolean;
  act: Act;
}) {
  const set = town.dungeon.stones[floor];
  if (set) return <Gateway town={town} floor={floor} act={act} />;
  const stones = stored(town, floor);
  if (stones.length)
    return (
      <p className="small">
        The {ix.item(stones[0]!).name} is in the store. Send a party to floor {floor} to set it on
        the stairs below (the party's orders, "Stairs").
      </p>
    );
  if (ready)
    return (
      <p className="small">
        Every shard is home. Forge the Seal Stone:{" "}
        {ix.lib.sealing.ways
          .map((w) => `${w.name.toLowerCase()} at the ${ix.building(w.workshop).name}`)
          .join(", or ")}
        .
      </p>
    );
  return null;
}

function ShardLine({ s, town }: { s: ShardStatus; town: TownState }) {
  const where = s.floor ? `floor ${s.floor}` : "";
  return (
    <li className={s.state === "found" ? "muted" : undefined}>
      <strong>{s.state === "found" ? "✓" : KIND[s.kind]}</strong>{" "}
      {s.state === "found" ? `${s.text} Day ${s.day}.` : (bearerName(s, town) ?? s.text)}
      {s.points !== undefined && s.need !== undefined ? (
        <>
          {" "}
          <progress max={s.need} value={Math.min(s.points, s.need)} /> {Math.floor(s.points)}/
          {s.need}
        </>
      ) : null}
      {s.state !== "found" && s.kind !== "library" ? (
        <span className="muted"> ({where})</span>
      ) : null}
    </li>
  );
}

/** Once someone has met a shard-bearer, the panel names it. */
function bearerName(s: ShardStatus, town: TownState): string | undefined {
  if (s.kind !== "bearer" || s.state !== "open") return undefined;
  const source = ix.lib.shards.flatMap((x) => x.shards).find((x) => x.id === s.id);
  if (source?.kind !== "bearer") return undefined;
  const met =
    Object.values(town.records).some((r) => r.seen.includes(source.monster)) ||
    town.memorial.some((m) => m.record.seen.includes(source.monster));
  if (!met) return undefined;
  return `${ix.monster(source.monster).name} carries it. Hunt floor ${source.floor} down to ${Math.round(source.below * 100)}% and send heroes with at least ${source.stand} levels between them.`;
}

const SETTINGS: GatewaySetting[] = ["shut", "trickle", "open"];

/** A set stone's gateway (M8.18): its setting, strain, level and mending. */
function Gateway({ town, floor, act }: { town: TownState; floor: number; act: Act }) {
  const g = gatewaysNow(ix, town).find((x) => x.floor === floor);
  if (!g) return null;
  const rules = ix.lib.sealing.gateway;
  const next = nextGatewayLevel(ix, town, floor);
  const cantRaise = cantRaiseGateway(ix, town, floor);
  const cantMend = cantMendGateway(ix, town, floor);
  const stone = town.dungeon.stones[floor]!;
  return (
    <div className="gateway small">
      <p className="good">
        The {ix.item(g.stone).name}, set on day {g.day}
        {g.by ? ` by ${g.by}` : ""}, is the gateway on the stairs below. Level {g.level}.
      </p>
      {g.way ? (
        <p className={g.damaged ? "muted" : undefined}>
          Blessing, <strong>{g.way.blessing.name}</strong>
          {g.damaged ? " (lost while it's breached)" : ""}: {g.way.blessing.text}
        </p>
      ) : null}
      {g.damaged ? (
        <p className="bad">
          Breached: it stands open, whatever it's set to, until it's mended (
          {gatewayCostWords(ix, mendCost(ix, stone))}).{" "}
          <button
            type="button"
            disabled={!!cantMend}
            title={cantMend}
            onClick={() => act((t) => mendGateway(ix, t, floor))}
          >
            Mend it
          </button>
        </p>
      ) : null}
      <div className="seg" role="group" aria-label={`Gateway below floor ${floor}`}>
        {SETTINGS.map((k) => (
          <button
            key={k}
            type="button"
            className={g.setting === k ? "on" : ""}
            aria-pressed={g.setting === k}
            title={rules.settings[k].blurb}
            onClick={() => act((t) => setGateway(ix, t, floor, k))}
          >
            {rules.settings[k].name}
          </button>
        ))}
      </div>
      <p className="muted">{rules.settings[g.setting].blurb}</p>
      {g.damaged ? null : (
        <p>
          Strain <progress max={g.limit} value={Math.min(g.strain, g.limit)} />{" "}
          <span className={g.percent >= rules.warnAt * 100 ? "warn" : undefined}>{g.percent}%</span>
          <span className="muted">
            {g.days === Infinity
              ? ", nothing leaning on it"
              : `, about ${g.days} ${g.days === 1 ? "day" : "days"} to a breach if floor ${floor + 1} stays as full`}
          </span>
        </p>
      )}
      {next ? (
        <p>
          Level {g.level + 1}: {next.summary} ({gatewayCostWords(ix, next)}){" "}
          <button
            type="button"
            disabled={!!cantRaise}
            title={cantRaise}
            onClick={() => act((t) => raiseGateway(ix, t, floor))}
          >
            Raise it
          </button>
        </p>
      ) : null}
    </div>
  );
}
