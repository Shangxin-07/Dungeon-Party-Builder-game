/** Materials as icons with counts, e.g. for a contract, a petition or a recipe's cost. */
import type { MaterialCost } from "../../content/types";
import { ItemIcon } from "../art/Icon";
import { ix } from "../game";

export function MaterialChips({
  cost,
  gold,
  short = false,
}: {
  cost: MaterialCost;
  gold?: number;
  /** Just the icon and the count; the name shows on hover. */
  short?: boolean;
}) {
  return (
    <span className="material-chips">
      {Object.entries(cost).map(([id, n]) => (
        <span key={id} className="material-chip" title={ix.item(id).name}>
          <ItemIcon id={id} size={20} />
          {short ? <strong>{n}</strong> : `${n} ${ix.item(id).name.toLowerCase()}`}
        </span>
      ))}
      {gold ? <span className="material-chip">{gold} gold</span> : null}
    </span>
  );
}
