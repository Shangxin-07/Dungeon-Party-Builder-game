/**
 * Town news (M7.17, DESIGN.md §18.1c): caravans, contracts, petitions and
 * visitors waiting for an answer. Worked out in src/sim/town/offers.ts;
 * offers are content (content/offers/).
 */
import { Fold } from "../Fold";
import {
  buyFromCaravan,
  cantDeliver,
  cantGrant,
  cantWelcome,
  deliverContract,
  dismissOffer,
  grantPetition,
  materialWords,
  offerHeadline,
  petitionWords,
  sellToCaravan,
  takeContract,
  welcomeVisitor,
  type Offer,
  type TownState,
} from "../../sim/town";
import { heroTitle } from "../../sim/hero";
import { ix } from "../game";
import { describeItem, type Act } from "./shared";

const KIND_NAMES = {
  caravan: "caravan",
  contract: "contract",
  petition: "petition",
  visitor: "visitor",
} as const;

export function OffersPanel({ town, act }: { town: TownState; act: Act }) {
  const offers = town.offers;
  const kinds = offers.map((o) => KIND_NAMES[ix.offer(o.def).kind]);
  return (
    <Fold
      id="offers"
      title="In town"
      summary={offers.length ? `${offers.length} waiting: ${kinds.join(", ")}` : "nothing waiting"}
    >
      <p className="small muted">
        Caravans, contracts, petitions from the townsfolk, and the odd hero passing through turn up
        every few days. Each waits a day or two for an answer, then goes.
      </p>
      {offers.length ? (
        <div className="offers">
          {offers.map((o) => (
            <OfferCard key={o.id} town={town} act={act} o={o} />
          ))}
        </div>
      ) : (
        <p className="small">Nothing in town wants an answer just now.</p>
      )}
    </Fold>
  );
}

function OfferCard({ town, act, o }: { town: TownState; act: Act; o: Offer }) {
  const def = ix.offer(o.def);
  const left = o.until - town.day;
  const when =
    def.kind === "contract" && o.taken
      ? left
        ? `taken on: ${left + 1} days left to deliver`
        : "taken on: last day to deliver"
      : left
        ? `here ${left + 1} more days`
        : "last day";
  const dismiss = o.taken ? null : (
    <button
      type="button"
      className="btn small"
      onClick={() => act((t) => dismissOffer(ix, t, o.id))}
    >
      {def.kind === "caravan" ? "Let them go" : "Turn it down"}
    </button>
  );
  return (
    <div className="card offer">
      <h4>
        {o.hero ? `${o.hero.name}, passing through` : def.name}{" "}
        <span className={`muted small${left ? "" : " warn"}`}>({when})</span>
      </h4>
      <p className="small">{offerHeadline(ix, o)}</p>
      {def.kind === "caravan" ? (
        <>
          <p className="small">Buying, as many as you have:</p>
          <ul className="small">
            {Object.entries(def.buys).map(([id, price]) => {
              const have = town.materials[id] ?? 0;
              return (
                <li key={id}>
                  {ix.item(id).name} at {price} gold each (you have {have}){" "}
                  {have ? (
                    <>
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => act((t) => sellToCaravan(ix, t, o.id, id, 1))}
                      >
                        Sell 1
                      </button>{" "}
                      {have > 1 ? (
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => act((t) => sellToCaravan(ix, t, o.id, id, have))}
                        >
                          Sell all for {have * price}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="small">Selling, one of each:</p>
          <ul className="small">
            {def.sells.map((w, i) => {
              const sold = o.bought?.includes(i);
              return (
                <li key={w.item} title={describeItem(ix.item(w.item))}>
                  {ix.item(w.item).name}, {w.price} gold{" "}
                  {sold ? (
                    <span className="muted">(bought)</span>
                  ) : (
                    <button
                      type="button"
                      className="btn small"
                      disabled={town.gold < w.price}
                      onClick={() => act((t) => buyFromCaravan(ix, t, o.id, i))}
                    >
                      Buy
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="row-buttons">{dismiss}</div>
        </>
      ) : null}
      {def.kind === "contract" ? (
        <>
          <div className="row-buttons">
            {o.taken ? (
              <button
                type="button"
                className="btn"
                disabled={!!cantDeliver(ix, town, o.id)}
                title={cantDeliver(ix, town, o.id)}
                onClick={() => act((t) => deliverContract(ix, t, o.id))}
              >
                Deliver
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => act((t) => takeContract(ix, t, o.id))}
              >
                Take it on
              </button>
            )}{" "}
            {dismiss}
          </div>
          {o.taken && cantDeliver(ix, town, o.id) ? (
            <p className="small muted">{cantDeliver(ix, town, o.id)}</p>
          ) : null}
        </>
      ) : null}
      {def.kind === "petition" ? (
        <>
          <p className="small">
            Costs <strong>{def.gold} gold</strong>
            {def.materials ? ` and ${materialWords(ix, def.materials)}` : ""}:{" "}
            {petitionWords(ix, def.effect)}.
          </p>
          <div className="row-buttons">
            <button
              type="button"
              className="btn"
              disabled={!!cantGrant(ix, town, o.id)}
              title={cantGrant(ix, town, o.id)}
              onClick={() => act((t) => grantPetition(ix, t, o.id))}
            >
              Grant it
            </button>{" "}
            {dismiss}
          </div>
          {cantGrant(ix, town, o.id) ? (
            <p className="small muted">{cantGrant(ix, town, o.id)}</p>
          ) : null}
        </>
      ) : null}
      {def.kind === "visitor" && o.hero ? (
        <>
          <p className="small">
            {heroTitle(ix, o.hero, true)}:{" "}
            {Object.entries(o.hero.stats)
              .map(([s, v]) => `${s} ${v}`)
              .join(", ")}
            . Joins free, with their kit.
          </p>
          <div className="row-buttons">
            <button
              type="button"
              className="btn"
              disabled={!!cantWelcome(ix, town, o.id)}
              onClick={() => act((t) => welcomeVisitor(ix, t, o.id))}
            >
              Welcome them
            </button>{" "}
            {dismiss}
          </div>
          {cantWelcome(ix, town, o.id) ? (
            <p className="small muted">{cantWelcome(ix, town, o.id)}</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
