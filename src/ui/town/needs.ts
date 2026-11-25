/**
 * The town screen's tabs, and the "needs you" list at the top of News: the
 * things waiting on the player, each pointing at the tab and panel to open.
 * Pure: it reads the town and never changes it.
 */
import type { Index } from "../../sim/library";
import { isLow } from "../../sim/morale";
import { awaySet, outingStatus, restockPlan, type TownState } from "../../sim/town";

export type TabId = "guild" | "town" | "pit" | "news" | "books";

export const TABS: { id: TabId; name: string; holds: string }[] = [
  { id: "guild", name: "Guild", holds: "The party, the roster and recruits" },
  { id: "town", name: "Town", holds: "The map, buildings, market, workshops and townsfolk" },
  { id: "pit", name: "The Pit", holds: "The pit, posts, research, and the lost and fallen" },
  { id: "news", name: "News", holds: "What needs you, debriefs, parties below, and offers" },
  { id: "books", name: "Books", holds: "The accounts, the memorial and saves" },
];

/**
 * Which tab each folding panel lives on, so opening one from elsewhere (the
 * town map, the needs-you list) can switch to it first.
 */
export const FOLD_TAB: Record<string, TabId> = {
  camp: "guild",
  recruits: "guild",
  restock: "guild",
  party: "guild",
  "parties-on-file": "guild",
  scouting: "guild",
  roster: "guild",
  townmap: "town",
  buildings: "town",
  market: "town",
  workshops: "town",
  folk: "town",
  pit: "pit",
  "pit-floors": "pit",
  research: "pit",
  lost: "pit",
  fallen: "pit",
  back: "news",
  away: "news",
  offers: "news",
  talk: "news",
  accounts: "books",
  memorial: "books",
  saves: "books",
};

/** At the camp the posts are the game, so they sit with the guild. */
export const foldTab = (town: TownState, fold: string): TabId | undefined =>
  fold === "posts" ? (town.camp ? "guild" : "pit") : FOLD_TAB[fold];

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
