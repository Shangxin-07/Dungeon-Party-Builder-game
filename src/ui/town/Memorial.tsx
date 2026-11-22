/**
 * The memorial to the fallen.
 */
import { Fold } from "../Fold";
import type { TownState } from "../../sim/town";
import { ix } from "../game";
import { Departed } from "../Lost";

export function Memorial({ town }: { town: TownState }) {
  if (!town.memorial.length && !town.departed.length) return null;
  return (
    <Fold id="memorial" title="Memorial" summary={`${town.memorial.length} fallen`}>
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
              {m.fate === "lost"
                ? m.heroId
                  ? " Never came home, and nobody knows what happened."
                  : " Lost before rescue runs existed: never found."
                : ""}
              {m.buried ? ` Buried on day ${m.buried}.` : ""}
              {m.risen && !m.buried ? " Their body rose in the dark." : ""}
            </span>
          </li>
        ))}
      </ul>
      <Departed town={town} />
    </Fold>
  );
}
