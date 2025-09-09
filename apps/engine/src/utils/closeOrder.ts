import { publisherClient } from "..";
import { open_positions } from "..";
import { user_balance } from "..";
import { currPrices } from "..";
import { users } from "..";

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
  entryPrice: number
) {
  const assetQuantity = users.get(userId)?.balance.get(asset)?.balance;
  if (!assetQuantity) {
    await sendToReturnStream(
        "return-stream",
        false,
        "Asset Quantity is null ",
        500,
        {
            id: orderId,
        }
    )
    return;
  }
  let profit = 0;

  if (type === "long") {
    profit = (currPriceOfAsset - entryPrice) * assetQuantity * leverage;
  } else if (type === "short") {
    profit = (entryPrice - currPriceOfAsset) * assetQuantity * leverage;
  } else {
    await sendToReturnStream(
        "return-stream",
        false,
        "Order type does not exists ",
        500,
        {
            id: orderId,
        }
    )
  }

  const userBalance = users.get(userId)?.balance.get("USD")?.balance || 0;
  users.get(userId)?.balance.set("USD", { balance: userBalance + profit, decimal: 2 });
  users.get(userId)?.balance.set(asset, { balance: 0 , decimal : 2});

  open_positions.delete(orderId)

  user_balance.set(userId, userBalance + profit);

  await sendToReturnStream(
    "return-stream",
    true,
    "Order closed successfully ",
    200,
    {
      id: orderId,
      data:{
        id: orderId,
        openPrice : entryPrice,
        closePrice: currPriceOfAsset,
        leverage: leverage,
        pnl : profit,
        assetId: asset,
        liquidated: true,
        userId: userId,
        createdAt: Date.now()
      } ,
    }
  );
}
