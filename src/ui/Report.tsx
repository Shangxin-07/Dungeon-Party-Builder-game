/**
 * The scouting report (M6): what the guild knows about the target floor, and
 * where this party looks weak against it. Worked out in src/sim/report.ts.
 */
import type { Hero } from "../sim/hero";
import { scoutingReport } from "../sim/report";
import { TIER_NAMES } from "../sim/research";
import type { TownState } from "../sim/town";
import { ix } from "./game";
import { Fold } from "./Fold";

export function ScoutingReport({ town, party }: { town: TownState; party: readonly Hero[] }) {
  const floor = town.orders.targetFloor;
  const r = scoutingReport(ix, town, floor, party);
  return (
    <Fold
      id="scouting"
      level={3}
      className="report"
      title={`Scouting report: floor ${floor}, ${ix.floor(floor).name}`}
      summary={
        r.warnings.length ? (
          <span className="warn">
            {r.warnings.length} {r.warnings.length === 1 ? "worry" : "worries"}
          </span>
        ) : party.length ? (
          <span className="good">looks well suited</span>
        ) : undefined
      }
    >
      {r.intel ? (
        <p className={`small report-intel${r.intel.stale ? " warn" : ""}`}>
          <strong>Scouted</strong> by {r.intel.by} on day {r.intel.day}
          {r.intel.daysAgo
            ? ` (${r.intel.daysAgo} ${r.intel.daysAgo === 1 ? "day" : "days"} ago)`
            : " (today)"}
          {r.intel.stale ? ", may be out of date" : ""}: monster level {r.intel.level}, about{" "}
          {r.intel.population} monsters living there. They met {r.intel.groups}{" "}
          {r.intel.groups === 1 ? "group" : "groups"}
          {r.intel.slipped ? ` and slipped past ${r.intel.slipped}` : ""} in {r.intel.rooms}
          {r.intel.of > r.intel.rooms ? ` of ${r.intel.of}` : ""} rooms.
          {r.intel.features.length ? ` Found: ${r.intel.features.join(", ").toLowerCase()}.` : ""}
          {r.intel.hazards.length ? ` Traps: ${r.intel.hazards.join(", ").toLowerCase()}.` : ""}
        </p>
      ) : (
        <p className="small muted">
          Nobody has scouted this floor yet. A scout party would bring back what's on it now.
        </p>
      )}
      <ul className="report-monsters small">
        {r.monsters.map((m) => (
          <li key={m.monster}>
            <strong>{m.known ? ix.monster(m.monster).name : "???"}</strong>{" "}
            <span className="muted">
              {m.share ? `${Math.round(m.share * 100)}% of groups` : "rare"}
              {m.counted !== undefined ? ` · scouts counted ${m.counted}` : ""}
            </span>
            {m.known ? (
              <span className="muted">
                {m.tier >= 2 ? ` · ${TIER_NAMES[m.tier]!.toLowerCase()}` : ""}
                {m.ambusher ? " · ambusher" : ""}
                {m.weakTo.length ? ` · weak to ${m.weakTo.join(", ")}` : ""}
                {m.shrugsOff.length ? ` · shrugs off ${m.shrugsOff.join(", ")}` : ""}
                {m.ward ? <span className="warn">{` · can't be hurt yet (${m.ward})`}</span> : ""}
                {m.tricks ? <span className="report-tricks">{` · ${m.tricks}`}</span> : ""}
              </span>
            ) : (
              <span className="muted"> · nobody here has met one</span>
            )}
          </li>
        ))}
      </ul>
      {r.warnings.length ? (
        <ul className="warnings">
          {r.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : party.length ? (
        <p className="small good">This party looks well suited to what's down there.</p>
      ) : null}
    </Fold>
  );
}
