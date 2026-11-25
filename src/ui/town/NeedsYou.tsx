/**
 * "Needs you": the top of the News tab. One line for everything waiting on
 * the player, each with a button that opens the panel where it's answered.
 */
import { showFold } from "../Fold";
import type { Need } from "./needs";

export function NeedsYou({ needs }: { needs: Need[] }) {
  return (
    <section className="panel needs" aria-labelledby="needs-heading">
      <div className="fold-head">
        <h2 id="needs-heading">Needs you</h2>
        <span className="fold-summary">
          {needs.length ? `${needs.length} waiting` : "nothing waiting"}
        </span>
      </div>
      {needs.length ? (
        <ul className="needs-list">
          {needs.map((n) => (
            <li key={n.key} className={n.tone ? `need need-${n.tone}` : "need"}>
              <span>{n.text}</span>
              <button type="button" className="btn" onClick={() => showFold(n.fold, n.target)}>
                {n.go}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Nothing is waiting on you. Send a party down, or pass a day.</p>
      )}
    </section>
  );
}
