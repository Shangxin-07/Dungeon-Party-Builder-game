/**
 * The Hearthstone's shards (DESIGN.md §20): for each floor that can be sealed,
 * how many of its shards are in the store room, how many its Seal Stone
 * takes, and what the guild knows of where the rest are. Worked out in
 * src/sim/town/shards.ts; where the shards are is content (content/shards/).
 */
import { Fold } from "../Fold";
import { shardProgress, type ShardStatus, type TownState } from "../../sim/town";
import { ix } from "../game";

const KIND = { bearer: "Carried", cache: "Hidden", library: "Library" } as const;

export function HearthstonePanel({ town }: { town: TownState }) {
  const floors = shardProgress(ix, town);
  if (!floors.length) return null;
  const held = floors.reduce((n, f) => n + Math.min(f.held, f.need), 0);
  const need = floors.reduce((n, f) => n + f.need, 0);
  return (
    <Fold id="hearthstone" title="The Hearthstone" summary={`${held} of ${need} shards found`}>
      <p className="small muted">
        The miners cracked the warding stone under the Old Delve, and its shards blew up through the
        floors. Gather all of a floor's shards to forge its Seal Stone. Shard-bearers keep to the
        back tunnels: only a party hunting a thinned-out floor meets one, and it won't stand and
        fight with a party that isn't seasoned enough.
      </p>
      {floors.map(({ set, held: have, need: n, shards }) => (
        <div key={set.id} className="shard-floor">
          <h4>
            Floor {set.floor}: {ix.floor(set.floor).name}{" "}
            <span className={have >= n ? "good small" : "muted small"}>
              {have} of {n} in the store room
            </span>
          </h4>
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
