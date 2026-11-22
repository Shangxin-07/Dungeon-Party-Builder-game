/**
 * The Market: buy, sell and haggle. The store room is here too, and with a
 * Blacksmith its gear can be broken down into materials (M7.03).
 */
import { Fold } from "../Fold";
import { heroSheet } from "../../sim/hero";
import {
  buy,
  buyPrice,
  fence,
  haggler,
  marketRate,
  materialWords,
  salvageOf,
  salvageStash,
  sell,
  sellPrice,
  shopStock,
  type TownState,
} from "../../sim/town";
import { ix } from "../game";
import { describeItem, tally, type Act } from "./shared";

export function Market({ town, act }: { town: TownState; act: Act }) {
  const stock = shopStock(ix, town);
  const haggle = haggler(ix, town);
  const stash = tally(town.stash);
  const fenced = fence(ix, town);
  return (
    <Fold id="market" title="Market" summary={`${stash.length} in the store room`}>
      <p className="small">
        The Market pays{" "}
        <strong>
          {Math.round(marketRate(ix, ix.lib.town.haulRate + fenced / 100, haggle.bonus) * 100)}%
        </strong>{" "}
        of the value of loot from the pit (coins at face value
        {fenced ? ", with the Black Market's fence" : ""}) and{" "}
        <strong>{Math.round(marketRate(ix, ix.lib.town.sellRate, haggle.bonus) * 100)}%</strong> for
        gear from the store room.{" "}
        {haggle.hero ? (
          <>
            {haggle.hero.name} does the haggling (Appraisal{" "}
            {heroSheet(ix, haggle.hero).skills.appraisal ?? 0}, CHA{" "}
            {heroSheet(ix, haggle.hero).stats.CHA}).
          </>
        ) : (
          <span className="muted">
            Nobody in the guild can talk the price up. Appraisal and CHA help.
          </span>
        )}
      </p>
      <div className="market">
        <div>
          <h3>For sale</h3>
          <table className="shop">
            <tbody>
              {stock.map((id) => {
                const item = ix.item(id);
                const price = buyPrice(item);
                return (
                  <tr key={id}>
                    <td>
                      {item.name}
                      <div className="muted small">{describeItem(item)}</div>
                    </td>
                    <td className="num">{price}</td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        disabled={town.gold < price}
                        onClick={() => act((t) => buy(ix, t, id))}
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Store room</h3>
          {stash.length ? (
            <table className="shop">
              <tbody>
                {stash.map(([id, n]) => {
                  const item = ix.item(id);
                  const salvage = salvageOf(ix, town, id);
                  return (
                    <tr key={id}>
                      <td>
                        {item.name}
                        {n > 1 ? ` ×${n}` : ""}
                        <div className="muted small">{describeItem(item)}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => act((t) => sell(ix, t, id))}
                        >
                          Sell for {sellPrice(ix, item, haggle.bonus)}
                        </button>
                        {salvage ? (
                          <>
                            {" "}
                            <button
                              type="button"
                              className="btn"
                              title="Break it down at the Blacksmith"
                              onClick={() => act((t) => salvageStash(ix, t, id))}
                            >
                              Salvage: {materialWords(ix, salvage)}
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="muted small">Empty. Gear you buy or take off heroes goes here.</p>
          )}
        </div>
      </div>
    </Fold>
  );
}
