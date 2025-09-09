import { publisherClient } from "..";
import { open_positions } from "..";
import { user_balance } from "..";
import { currPrices } from "..";
import { users } from "..";
import { shortOrderHm, longOrdersHm } from "..";

async function sendToReturnStream(
  stream: string,
  success: boolean,
  message: string,
  status: number,
  data: any
) {
  await publisherClient.xAdd(stream, "*", {
    data: JSON.stringify({
      success: success,
      responseMessage: message,
      status: status,
      data: data,
    }),
  });
}

export async function closeOrder(
  userId: string,
  orderId: string,
  asset: string,
  currPriceOfAsset: number,
  type: string,
  leverage: number,
  entryPrice: number,
  margin: number,
  quantity: number
) {
  let assetQuantity;
  if( type === "long")
    assetQuantity = users.get(userId)?.balance.get(asset+"_long")?.balance;
  else {
    assetQuantity = users.get(userId)?.balance.get(asset+"_short")?.balance;
  }
  if (!assetQuantity) {
    await sendToReturnStream(
      "return-stream",
      false,
      "Asset Quantity is null ",
      500,
      {
        id: orderId,
      }
    );
    return;
  }
  let profit = 0;
  let pq;

  if (type === "long") {
    profit = (currPriceOfAsset - entryPrice) * assetQuantity * leverage;
    pq = longOrdersHm.get(asset);
  } else if (type === "short") {
    profit = (entryPrice - currPriceOfAsset) * assetQuantity * leverage;
    pq = shortOrderHm.get(asset);
  } else {
    await sendToReturnStream(
      "return-stream",
      false,
      "Order type does not exists ",
      404,
      {
        id: orderId,
      }
    );
  }

  if (pq) {
    console.log("liquidating order-> ", orderId);
    pq.remove((o) => o.orderId === orderId);
  }

  const userBalance = users.get(userId)?.balance.get("USD")?.balance || 0;
  users.get(userId)?.balance.set("USD", {
    balance: userBalance + profit + margin,
    type: "usd",
  });

  if (type === "long") {
    if (
      users.get(userId)?.balance.get(asset+"_long") &&
      open_positions.get(orderId) &&
      users.get(userId)?.balance.get(asset+"_long")!.type === "long"
    ) {
      let orderQuantity = open_positions.get(orderId)?.quantity!;
      let currQuantity = users.get(userId)?.balance.get(asset+"_long")?.balance!;
      users.get(userId)?.balance.set(asset+"_long", {
        balance: currQuantity - orderQuantity,
        type: "long",
      });
    }
  } else if (
    type === "short" &&
    users.get(userId)?.balance.get(asset+"_short") &&
    open_positions.get(orderId) &&
    users.get(userId)?.balance.get(asset+"_short")!.type === "short"
  ) {
    let orderQuantity = open_positions.get(orderId)?.quantity!;
    let currQuantity = users.get(userId)?.balance.get(asset+"_short")?.balance!;
    users.get(userId)?.balance.set(asset+"_short", {
      balance: currQuantity - orderQuantity,
      type: "short",
    });
  }

  open_positions.delete(orderId);

  user_balance.set(userId, userBalance + profit);

  await sendToReturnStream(
    "return-stream",
    true,
    "Order closed successfully ",
    200,
    {
      id: orderId,
      data: {
        id: orderId,
        openPrice: entryPrice,
        closePrice: currPriceOfAsset,
        leverage: leverage,
        pnl: profit,
        assetId: asset,
        liquidated: true,
        userId: userId,
        quantity,
      },
    }
  );
}
