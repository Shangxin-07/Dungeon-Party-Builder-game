/**
 * The town screen's tabs, and the "needs you" list at the top of News: the
 * things waiting on the player, each pointing at the tab and panel to open.
 * Pure: it reads the town and never changes it.
 */
import type { Index } from "../../sim/library";
import { isLow } from "../../sim/morale";
import { awaySet, outingStatus, restockPlan, type TownState } from "../../sim/town";

/**
 * Where a panel lives (M8.42). On a wide screen the town is three panes: the
 * guild (roster, recruits, buildings) on the left, the parties on the right,
 * and the centre's tabs between them. On a phone every one of them is a tab.
 */
export type TabId = "guild" | "town" | "pit" | "debrief" | "news" | "books" | "parties";

/** The centre pane's tabs. */
export type CentreTab = Exclude<TabId, "guild" | "parties">;

export const TABS: { id: TabId; name: string; holds: string; pane: "left" | "centre" | "right" }[] =
  [
    { id: "guild", name: "Guild", holds: "The roster, recruits and buildings", pane: "left" },
    {
      id: "town",
      name: "Town",
      holds: "The map, the market, workshops and townsfolk",
      pane: "centre",
    },
    {
      id: "pit",
      name: "The Pit",
      holds: "The pit, posts, research, and the lost and fallen",
      pane: "centre",
    },
    { id: "debrief", name: "Debrief", holds: "Parties back from below", pane: "centre" },
    { id: "news", name: "News", holds: "What needs you, offers and talk", pane: "centre" },
    { id: "books", name: "Books", holds: "The accounts, the memorial and saves", pane: "centre" },
    {
      id: "parties",
      name: "Parties",
      holds: "The next party, its orders, parties on file, and parties below",
      pane: "right",
    },
  ];

export const isCentre = (t: TabId): t is CentreTab =>
  TABS.find((x) => x.id === t)?.pane === "centre";

/**
 * Which tab each folding panel lives on, so opening one from elsewhere (the
 * town map, the needs-you list) can switch to it first.
 */
export const FOLD_TAB: Record<string, TabId> = {
  camp: "parties",
  recruits: "guild",
  restock: "parties",
  party: "parties",
  "parties-on-file": "parties",
  scouting: "parties",
  roster: "guild",
  buildings: "guild",
  townmap: "town",
  market: "town",
  workshops: "town",
  folk: "town",
  pit: "pit",
  "pit-floors": "pit",
  research: "pit",
  lost: "pit",
  fallen: "pit",
  back: "debrief",
  away: "parties",
  offers: "news",
  talk: "news",
  accounts: "books",
  memorial: "books",
  saves: "books",
};

/** At the camp the posts are the game, so they sit with the parties. */
export const foldTab = (town: TownState, fold: string): TabId | undefined =>
  fold === "posts" ? (town.camp ? "parties" : "pit") : FOLD_TAB[fold];

export type Need = {
  key: string;
  text: string;
  /** The panel to open, and the element in it to bring into view. */
  fold: string;
  target: string;
  /** The button's word. */
  go: string;
  tone?: "warn";
};

const names = (xs: { name: string }[]) =>
  xs.length <= 2
    ? xs.map((x) => x.name).join(" and ")
    : `${xs
        .slice(0, -1)
        .map((x) => x.name)
        .join(", ")} and ${xs.at(-1)!.name}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Everything waiting on the player, most pressing first. */
export function needsYou(ix: Index, town: TownState): Need[] {
  const out: Need[] = [];
  const away = awaySet(town);
  const home = town.roster.filter((h) => !away.has(h.id));

  for (const o of town.outings) {
    const status = outingStatus(ix, town, o);
    if (status === "out") continue;
    out.push({
      key: `outing:${o.id}`,
      text: `${o.name} ${status === "lost" ? "may be lost" : "is overdue"} (due back day ${o.expected})`,
      fold: "away",
      target: "away-heading",
      go: "Look",
      tone: "warn",
    });
  }
  if (town.haul.length) {
    const trip = town.trips.at(-1);
    out.push({
      key: "haul",
      text: `${trip?.name ?? "A party"} is back: ${town.haul.length} ${plural(town.haul.length, "piece", "pieces")} of haul to sell, salvage or study`,
      fold: "back",
      target: "debrief-heading",
      go: "Debrief",
    });
  }
  const bodies = town.bodies.length;
  if (bodies)
    out.push({
      key: "bodies",
      text: `${bodies} ${plural(bodies, "body waits", "bodies wait")} to be raised or buried`,
      fold: "fallen",
      target: "fallen-heading",
      go: "See",
      tone: "warn",
    });
  const sites = town.sites.filter((s) => !s.outing).length;
  if (sites)
    out.push({
      key: "lost",
      text: `${sites} ${plural(sites, "party is", "parties are")} lost below and could be searched for`,
      fold: "lost",
      target: "lost-heading",
      go: "See",
      tone: "warn",
    });
  const ups = home.filter((h) => h.levelUps.length);
  if (ups.length)
    out.push({
      key: "levelups",
      text: `${names(ups)} ${plural(ups.length, "has a level", "have levels")} to spend`,
      fold: "roster",
      target: `hero-card-${ups[0]!.id}`,
      go: "Roster",
    });
  const raises = home.filter((h) => h.raiseAsk);
  if (raises.length)
    out.push({
      key: "raises",
      text: `${names(raises)} ${plural(raises.length, "wants", "want")} a raise`,
      fold: "roster",
      target: `hero-card-${raises[0]!.id}`,
      go: "Roster",
    });
  const unhappy = home.filter((h) => isLow(ix, h));
  if (unhappy.length)
    out.push({
      key: "unhappy",
      text: `${names(unhappy)} ${plural(unhappy.length, "is", "are")} unhappy and may not follow orders`,
      fold: "roster",
      target: `hero-card-${unhappy[0]!.id}`,
      go: "Roster",
      tone: "warn",
    });
  if (town.freeHires > 0)
    out.push({
      key: "free-hires",
      text: `${town.freeHires} ${plural(town.freeHires, "recruit", "recruits")} will sign for nothing`,
      fold: "recruits",
      target: "recruits-heading",
      go: "Recruits",
    });
  const offers = town.offers.length;
  if (offers)
    out.push({
      key: "offers",
      text: `${offers} ${plural(offers, "offer waits", "offers wait")} in town for an answer`,
      fold: "offers",
      target: "offers-heading",
      go: "Look",
    });
  if (!town.camp) {
    const restock = restockPlan(ix, town);
    if (restock.length)
      out.push({
        key: "restock",
        text: `The last trip used up ${restock.length} ${plural(restock.length, "thing", "things")} to buy again`,
        fold: "restock",
        target: "restock-heading",
        go: "Restock",
      });
  }
  if (town.damaged.length)
    out.push({
      key: "damaged",
      text: `${names(town.damaged.map((id) => ix.building(id)))} ${plural(town.damaged.length, "is", "are")} damaged and won't work until repaired`,
      fold: "buildings",
      target: `building-${town.damaged[0]}`,
      go: "Repair",
      tone: "warn",
    });
  return out;
}

/** How many needs sit on each tab, for the counts on the tabs. */
export function needsByTab(town: TownState, needs: Need[]): Partial<Record<TabId, number>> {
  const out: Partial<Record<TabId, number>> = {};
  for (const n of needs) {
    const tab = foldTab(town, n.fold);
    if (tab) out[tab] = (out[tab] ?? 0) + 1;
  }
  return out;
}
