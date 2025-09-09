import { MaxPriorityQueue, MinPriorityQueue } from "@datastructures-js/priority-queue";
import { currPrices, users, user_balance, open_positions, longOrdersHm, shortOrderHm } from "../index";
import { publisherClient } from "../index";
import type { liqOrder } from "./types";

const addInHmPq = (
  orderType: string,
  userId: string,
  orderId: string,
  liqPrice: number,
  asset: string
) => {
  if (orderType === "long") {
    if (!longOrdersHm.has(asset)) {
      longOrdersHm.set(
        asset,
        new MinPriorityQueue<liqOrder>((o) => o.liqPrice)
      );
    }
    longOrdersHm.get(asset)?.enqueue({ orderId, liqPrice, userId, asset });
  } else {
    if (!shortOrderHm.has(asset)) {
      shortOrderHm.set(
        asset,
        new MaxPriorityQueue<liqOrder>((o) => o.liqPrice)
      );
    }
    shortOrderHm.get(asset)?.enqueue({ orderId, liqPrice, userId, asset });
  }
};

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

function calculateLiquidationPrice(
  margin: number,
  currPriceOfStock: number,
  leverage: number,
  type: string
) {
  let liquidationPrice: number;

  if (type === "long") {
    liquidationPrice = currPriceOfStock - margin / leverage;
  } else {
    liquidationPrice = currPriceOfStock + margin / leverage;
  }

  return liquidationPrice;
}

export async function processTradeCreation({
  userId,
  orderId,
  asset,
  type,
  margin,
  leverage,
  slippage,
}: {
  userId: string;
  orderId: string;
  asset: string;
  type: string;
  margin: number;
  leverage: number;
  slippage: number;
}) {
  if (!users.has(userId)) {
    await sendToReturnStream("return-stream", false, "User not found", 404, {
      id: orderId,
    });
    return;
  }

  console.log("assetPrice", asset);
  console.log("currPrices", currPrices[asset]);
  const assetPrice = currPrices[asset]?.price;
  if (!assetPrice) {
    await sendToReturnStream("return-stream", false, "Price not found", 404, {
      id: orderId,
    });
    return;
  }

  const bal = user_balance.get(userId) || 0;

  const requiredMargin = Number(margin);
  if (bal < requiredMargin) {
    await sendToReturnStream(
      "return-stream",
      false,
      "Insufficient balance",
      400,
      {
        id: orderId,
      }
    );
    return;
  }

  let autoLiquidate = false;

  const quantity = margin / assetPrice;
  const exposure = quantity * leverage;

  user_balance.set(userId, bal - requiredMargin);
  users
    .get(userId)
    ?.balance.set("USD", { balance: bal - requiredMargin, decimal: 2 });

  // this will override in case of anaother order formt the same asset
  users.get(userId)?.balance.set(asset, {
    balance: quantity,
    decimal: 2,
  });

  let liquidationPrice;
  if (type === "long" || leverage === 1) {
    autoLiquidate = false;
  } else autoLiquidate = true;

  if (autoLiquidate) {
    liquidationPrice = calculateLiquidationPrice(
      margin,
      assetPrice,
      leverage,
      type
    );

    addInHmPq(type, userId, orderId, liquidationPrice, asset);
  }

  const newOrder = {
    id: orderId,
    userId,
    asset,
    type,
    margin: requiredMargin,
    leverage: Number(leverage),
    slippage: Number(slippage),
    liquidationPrice,
    entryPrice: assetPrice,
    status: "OPEN",
  };
  
  open_positions.set(orderId, newOrder);

  await sendToReturnStream(
    "return-stream",
    true,
    "Order created successfully ",
    200,
    {
      id: orderId,
      data: newOrder,
    }
  );
}
