/**
 * The Foreman's pages (M8.21, DESIGN.md §20): the story so far. Each chapter
 * the guild has opened, newest first: when it turned up, and the page of the
 * Foreman's day-book that came with it. Chapters are content/story/;
 * src/sim/town/story.ts opens them.
 */
import { Fold } from "../Fold";
import { chapters, storySoFar, type TownState } from "../../sim/town";
import { ix } from "../game";

export function ForemansPagesPanel({ town }: { town: TownState }) {
  const read = storySoFar(ix, town);
  if (!read.length) return null;
  const all = chapters(ix).length;
  const newest = [...read].reverse();
  return (
    <Fold
      id="foremans-pages"
      title="The Foreman's pages"
      summary={`${read.length} of ${all} pages: ${newest[0]!.chapter.title}`}
    >
      <p className="small muted">
        Pages of the old mine foreman's day-book, left for the guild as it goes deeper. Whoever
        leaves them knows what the guild has done.
      </p>
      {newest.map(({ chapter, day }, i) => (
        <details key={chapter.id} open={i === 0}>
          <summary>
            <strong>{chapter.title}</strong> <span className="muted small">day {day}</span>
          </summary>
          <div className="foreman-page">
            {chapter.page.split(/\n\s*\n/).map((para, j) => (
              <p key={j}>{para}</p>
            ))}
          </div>
        </details>
      ))}
      {read.length < all ? (
        <p className="small muted">
          More pages are out there. Find the Hearthstone's shards and seal the floors.
        </p>
      ) : null}
    </Fold>
  );
}
