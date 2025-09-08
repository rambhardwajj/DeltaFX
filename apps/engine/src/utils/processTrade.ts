import { currPrices, users, user_balance, orders } from "../index";

export async function processTradeCreation(data: {
  userId: string;
  orderId: string;
  asset: string;
  type: string;
  margin: number;
  leverage: number;
  slippage: number;
}) {
  const currPriceOfAsset = currPrices[data.asset]?.prices;
  const decimal = currPrices[data.asset]?.decimal;
  if (!currPriceOfAsset || !decimal) {
    return;
  }
  let liquidationPrice;

  const quantity = (data.margin / decimal) / (currPriceOfAsset / decimal);
  const exposedQuantity = quantity * data.leverage;

  if (data.type === "long") {
    liquidationPrice = currPriceOfAsset / decimal - data.margin / data.leverage;
  } else {
    liquidationPrice = currPriceOfAsset / decimal + data.margin / data.leverage;
  }
  let balanceToDeduct = data.margin / decimal;
  const updatedBalance = updateUserBalance(balanceToDeduct, data.userId, decimal, data.asset);

  if (!updatedBalance) {
    console.log("Insufficient balance");
  }

  const currOrder = {
    id: data.orderId,
    asset: data.asset,
    type: data.type,
    margin: data.margin,
    leverage: data.leverage,
    slippage: data.slippage,
    quantity: quantity,
    exposedQuantity: quantity,
    liquidationPrice: liquidationPrice,
  };

  orders.set(data.orderId, currOrder);
  return currOrder;
}

function updateUserBalance(balanceToDeduct: number, userId: string, decimal: number, asset: string) {
  const currBal = (users.get(userId)!.balance.get("USD")!.balance)/decimal

  if (currBal < balanceToDeduct) {
    console.log("insuff bal");
    return null;
    // throw new Error("insufficient balance");
  }

  // user ke balance ke map mai USD amount set 
  users.get(userId)!.balance.get("USD")!.balance = (currBal* (10**decimal ))- (balanceToDeduct* (10**decimal));
  // user ke usdbalance ke map mai amt set 
  user_balance.set(userId, currBal - balanceToDeduct);

  // set the asset with price 
  const assetSuffix = asset.split(".")[1]
  const assetName = assetSuffix?.split("_")[0]
  console.log(assetName)

  if(assetName)
    users.get(userId)!.balance.get(assetName)!.balance

  

  //------------------------
  return user_balance.get(userId);
}
