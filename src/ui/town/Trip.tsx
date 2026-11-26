/**
 * What a trip changed in town: the party's table in the debrief, and the
 * results screen after a replay.
 */
import { heroSheet } from "../../sim/hero";
import { materialWords, type TownState, type TripReport } from "../../sim/town";
import { ix } from "../game";
import { HeroIcon } from "../art/Icon";
import { describeRaid } from "../Pit";

/** What a trip changed in town: gold, kills per hero, the fallen. */
export function TripTown({
  town,
  trip,
  brief = false,
}: {
  town: TownState;
  trip: TripReport;
  /** In the debrief, where the tally already says what the haul came to. */
  brief?: boolean;
}) {
  const back = trip.back ?? trip.day + trip.result.days;
  const fallen = town.memorial.filter(
    (m) => m.cause !== "raid" && trip.party.some((h) => h.id === m.heroId || h.name === m.name),
  );
  const nights = back - trip.day;
  const quiet = nights - trip.raids.length;
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
          {quiet === nights ? "Every night" : `${quiet} other ${quiet === 1 ? "night" : "nights"}`}{" "}
          the walls held.
        </p>
      ) : null}
      {brief ? null : trip.coins !== undefined ? (
        trip.goldEarned ? (
          <p>
            <strong>{trip.coins}</strong> gold in coin went into the purse.
            {trip.held
              ? ` The rest of the haul (${trip.held} ${trip.held === 1 ? "piece" : "pieces"}) was worth about ${trip.goldEarned - trip.coins} gold at the Market when it came home.`
              : ""}
            {trip.hiddenGold ? (
              <>
                {" "}
                About <strong>{trip.hiddenGold}</strong> of it all came from hidden caches.
              </>
            ) : null}
          </p>
        ) : null
      ) : trip.goldEarned ? (
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
      {!brief && trip.materials && Object.keys(trip.materials).length ? (
        <p>
          Into the guild's store, to build with:{" "}
          <strong>{materialWords(ix, trip.materials)}</strong>.
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
                <td className="hero-cell">
                  <HeroIcon hero={h} size={20} />
                  {h.name}
                </td>
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
