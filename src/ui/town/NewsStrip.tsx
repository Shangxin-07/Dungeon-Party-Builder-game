/**
 * The news strip (M9.01): one line, always above the centre pane. A button for
 * each thing waiting on the player, a few words each (the full line on hover);
 * a click goes to where it's answered. Then the latest day's news, which opens
 * the News tab. Green for good news, red for bad, plain for just news.
 */
import { showFold } from "../Fold";
import type { TownState } from "../../sim/town";
import type { Need } from "./needs";

export function NewsStrip({
  town,
  needs,
  onAll,
}: {
  town: TownState;
  needs: Need[];
  onAll: () => void;
}) {
  // The latest day's news, newest first, a few at most.
  const day = town.news.at(-1)?.day;
  const today = town.news
    .filter((n) => n.day === day)
    .reverse()
    .slice(0, 4);
  return (
    <nav className="news-strip" aria-label="News">
      <strong className="news-strip-name">News</strong>
      <span className="news-strip-items">
        {needs.map((n) => (
          <button
            key={n.key}
            type="button"
            className={`news-chip${n.tone ? ` news-chip-${n.tone}` : ""}`}
            title={n.text}
            onClick={() => showFold(n.fold, n.target)}
          >
            {n.short}
          </button>
        ))}
        {today.map((n, i) => (
          <button
            key={`news-${i}`}
            type="button"
            className={`news-chip news-chip-said${n.tone === "bad" ? " news-chip-warn" : n.tone === "good" ? " news-chip-good" : ""}`}
            title={`Day ${n.day}. ${n.text}`}
            onClick={onAll}
          >
            {n.text}
          </button>
        ))}
        {!needs.length && !today.length ? (
          <span className="news-strip-quiet muted small">Nothing is waiting on you.</span>
        ) : null}
      </span>
      <button type="button" className="news-chip news-chip-all" onClick={onAll}>
        All news
      </button>
    </nav>
  );
}
