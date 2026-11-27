/**
 * The endings (M8.22, DESIGN.md §20-21): once the heart of the Hearthstone is
 * shut off, and again once the guild has mended or bound the last stone
 * (M8.41), the town shows what the guild did, once, until the player says to
 * keep playing. Whether each was closed is kept in this browser
 * (localStorage), not the save.
 */
import { useState } from "react";
import { heartWay, renownRank, storySoFar, type TownState } from "../../sim/town";
import { ix } from "../game";
import { heartState } from "../../sim/dungeon";

const KEY = "dpb-ending-closed";

const closedFor = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") ?? [];
  } catch {
    return [];
  }
};

export function EndingPanel({ town }: { town: TownState }) {
  return (
    <>
      <ActOneEnding town={town} />
      <WayEnding town={town} />
    </>
  );
}

/** Remember that this ending was closed. */
function closeEnding(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...closedFor(), id]));
  } catch {
    // Private windows: it shows again next time, which is fine.
  }
}

/** The guild's record, for both endings. */
function Record({ town }: { town: TownState }) {
  const fallen = town.memorial.length;
  return (
    <ul className="small">
      <li>{Object.keys(town.dungeon.stones).length} floors sealed.</li>
      <li>
        The guild is {renownRank(ix, town.renown).rank.name.toLowerCase()} (renown {town.renown}).
      </li>
      <li>
        {fallen
          ? `${fallen} ${fallen === 1 ? "hero" : "heroes"} on the memorial.`
          : "Nobody on the memorial."}
      </li>
    </ul>
  );
}

/** The end of it all (M8.41): the last stone mended or bound. */
function WayEnding({ town }: { town: TownState }) {
  const heart = ix.lib.hearts.find((h) => h.ways && heartWay(town, h));
  const way = heart ? heartWay(town, heart) : undefined;
  const day = heart ? heartState(town.dungeon, heart.id).way?.day : undefined;
  const id = way ? `${town.seed}:${heart!.id}:${way.id}:${day}` : "";
  const [closed, setClosed] = useState(() => closedFor().includes(id));
  if (!way || closed) return null;
  const last = storySoFar(ix, town).at(-1)?.chapter;
  return (
    <section className="ending" aria-label="The ending">
      <h2>{way.ending.title}</h2>
      <p>{way.ending.text}</p>
      <Record town={town} />
      {last ? (
        <div className="foreman-page">
          {last.page.split(/\n\s*\n/).map((para, j) => (
            <p key={j}>{para}</p>
          ))}
        </div>
      ) : null}
      <p className="small muted">
        <strong>{way.blessing.name}</strong>: {way.blessing.text} The town is yours, for as long as
        you like.
      </p>
      <button
        type="button"
        className="btn btn-main"
        onClick={() => {
          closeEnding(id);
          setClosed(true);
        }}
      >
        Keep playing
      </button>
    </section>
  );
}

/** Act One's ending: the Hearthstone's heart (M8.22). */
function ActOneEnding({ town }: { town: TownState }) {
  // Act One's ending: the Hearthstone's heart (M8.22).
  const shut = heartState(town.dungeon, ix.lib.hearts[0]!.id).shut;
  // One game's ending: the town's own seed and the day it was shut.
  const id = shut ? `${town.seed}:${shut.day}` : "";
  const [closed, setClosed] = useState(() => closedFor().includes(id));
  if (!shut || closed) return null;
  const last = storySoFar(ix, town).at(-1)?.chapter;
  const fallen = town.memorial.length;
  const close = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...closedFor(), id]));
    } catch {
      // Private windows: it shows again next time, which is fine.
    }
    setClosed(true);
  };
  return (
    <section className="ending" aria-label="The ending">
      <h2>The heart is still</h2>
      <p>
        On day {shut.day}, {shut.by} shut off the heart of the Hearthstone. The Hearthstone breeds
        no more, and its dead will lie where they fall. Under it, the stairs go on down.
      </p>
      <ul className="small">
        <li>
          {Object.keys(town.dungeon.stones).length} floors sealed, every shard of the Hearthstone
          found.
        </li>
        <li>
          The guild is {renownRank(ix, town.renown).rank.name.toLowerCase()} (renown {town.renown}).
        </li>
        <li>
          {fallen
            ? `${fallen} ${fallen === 1 ? "hero" : "heroes"} on the memorial.`
            : "Nobody on the memorial."}
        </li>
      </ul>
      {last ? (
        <div className="foreman-page">
          {last.page.split(/\n\s*\n/).map((para, j) => (
            <p key={j}>{para}</p>
          ))}
        </div>
      ) : null}
      <p className="small muted">
        The town is yours. What's left below is all there will ever be: hunt it out, or leave it be.
      </p>
      <button type="button" className="btn btn-main" onClick={close}>
        Keep playing
      </button>
    </section>
  );
}
