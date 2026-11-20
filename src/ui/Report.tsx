/**
 * The scouting report (M6): what the guild knows about the target floor, and
 * where this party looks weak against it. Worked out in src/sim/report.ts.
 */
import type { Hero } from "../sim/hero";
import { scoutingReport } from "../sim/report";
import type { TownState } from "../sim/town";
import { ix } from "./game";

export function ScoutingReport({ town, party }: { town: TownState; party: readonly Hero[] }) {
  const floor = town.orders.targetFloor;
  const r = scoutingReport(ix, town, floor, party);
  return (
    <div className="report">
      <h3>
        Scouting report: floor {floor}, {ix.floor(floor).name}
      </h3>
      <ul className="report-monsters small">
        {r.monsters.map((m) => (
          <li key={m.monster}>
            <strong>{m.known ? ix.monster(m.monster).name : "???"}</strong>{" "}
            <span className="muted">{Math.round(m.share * 100)}% of groups</span>
            {m.known ? (
              <span className="muted">
                {m.ambusher ? " · ambusher" : ""}
                {m.weakTo.length ? ` · weak to ${m.weakTo.join(", ")}` : ""}
                {m.shrugsOff.length ? ` · shrugs off ${m.shrugsOff.join(", ")}` : ""}
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
    </div>
  );
}
