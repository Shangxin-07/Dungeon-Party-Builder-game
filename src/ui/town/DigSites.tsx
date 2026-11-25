/**
 * Dig sites on held floors (M8.20, DESIGN.md §20): the town grows downward.
 * For each floor a Seal Stone holds, its sites, whether they're working, and
 * what could go up. Worked out in src/sim/town/digs.ts and digging.ts.
 */
import { Fold } from "../Fold";
import { dig, digView, materialWords, type TownState } from "../../sim/town";
import { ix } from "../game";
import type { Act } from "./shared";

export function DigSitesPanel({ town, act }: { town: TownState; act: Act }) {
  const floors = digView(ix, town);
  if (!floors.length) return null;
  const built = floors.reduce(
    (n, f) => n + f.sites.filter((s) => s.site && s.site.level > 0).length,
    0,
  );
  return (
    <Fold
      id="dig-sites"
      title="Dig sites"
      summary={`${built} ${built === 1 ? "site" : "sites"} on ${floors.length} held ${floors.length === 1 ? "floor" : "floors"}`}
    >
      <p className="small muted">
        A floor the guild holds has room to build on: a forward camp for parties going deeper, a
        mine, and a shrine or a den over the stone. Sites work while the gateway holds and the floor
        stays quiet, so keep hunting it.
      </p>
      {floors.map((f) => (
        <div key={f.floor} className="shard-floor">
          <h4>
            Floor {f.floor}: {ix.floor(f.floor).name}{" "}
            <span className={f.held && f.quiet ? "good small" : "warn small"}>
              {!f.held
                ? "gateway breached: nothing works"
                : f.quiet
                  ? "quiet enough to work"
                  : `too busy to work: hunt it down to ${f.quietBelow}`}
            </span>{" "}
            <span className="muted small">
              ({f.sites.filter((s) => s.site).length} of {f.slots} sites)
            </span>
          </h4>
          <ul className="small dig-list">
            {f.sites.map(({ def, site, works, now, next, why }) => (
              <li key={def.id}>
                <strong>{def.name}</strong>
                {site?.level ? (
                  <span className={works ? "good" : "warn"}>
                    {" "}
                    level {site.level}, {works ? "working" : "idle"}
                  </span>
                ) : null}
                {site?.work ? (
                  <span className="muted">
                    {" "}
                    (digging{site.level ? ` level ${site.work.level}` : ""}: {site.work.daysLeft}{" "}
                    {site.work.daysLeft === 1 ? "day" : "days"} left)
                  </span>
                ) : null}
                {now ? <>: {now.summary}.</> : <span className="muted">: {def.blurb}</span>}
                {next && !site?.work ? (
                  <div>
                    <span className="muted">
                      {site?.level ? `Level ${site.level + 1}` : "Build"}: {next.summary} (
                      {[`${next.cost} gold`, materialWords(ix, next.materials)]
                        .filter(Boolean)
                        .join(", ")}
                      , {next.days} days)
                    </span>{" "}
                    <button
                      type="button"
                      disabled={!!why}
                      title={why}
                      onClick={() => act((t) => dig(ix, t, f.floor, def.id))}
                    >
                      {site?.level ? "Raise it" : "Dig it"}
                    </button>
                    {why && !/Not enough gold|Short of/.test(why) ? (
                      <span className="muted"> {why}</span>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Fold>
  );
}
