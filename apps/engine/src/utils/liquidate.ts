import {
  currPrices,
  users,
  user_balance,
  open_positions,
  longOrdersHm,
  shortOrderHm,
} from "../index";
import { closeOrder } from "./closeOrder";

export function liquidateOrder(asset: string) {
  const currPriceOfAsset = currPrices[asset]?.price;
  if (!currPriceOfAsset) return;

  while (
    longOrdersHm.get(asset) &&
    !longOrdersHm.get(asset)!.isEmpty() &&
    longOrdersHm.get(asset)!.front()!.liqPrice >= currPriceOfAsset
  ) {
    const orderToLiquidate = longOrdersHm.get(asset)!.pop();
    if (!orderToLiquidate) break;

    const order = open_positions.get(orderToLiquidate.orderId);
    if (!order) continue;

    closeOrder(
      order.userId,
      order.id,
      order.asset,
      currPriceOfAsset,
      order.type,
      order.leverage,
      order.entryPrice
    );
  }

  while (
    shortOrderHm.get(asset) &&
    !shortOrderHm.get(asset)!.isEmpty() &&
    shortOrderHm.get(asset)!.front()!.liqPrice <= currPriceOfAsset
  ) {
    const orderToLiquidate = shortOrderHm.get(asset)!.pop();
    if (!orderToLiquidate) break;

    const order = open_positions.get(orderToLiquidate.orderId);
    if (!order) continue;

    closeOrder(
        order.userId,
      order.id,
      order.asset,
      currPriceOfAsset,
      order.type,
      order.leverage,
      order.entryPrice
    );
  }
}
