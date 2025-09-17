import { createClient } from "redis";
import { config } from "@repo/config";
import { prisma} from "@repo/db"

const subscriber = createClient({ url: config.REDIS_URL });

async function connectRedis() {
  try {
    await subscriber.connect();
  } catch (error) {
    console.log("Error in connecting to redis");
  }
}
connectRedis();

async function recieveClosedOrder() {
  while (true) {
    try {
      const responseFromCloseStream = await subscriber.xRead(
        {
          key: "close-order-stream",
          id: "$",
        },
        {
          BLOCK: 0,
          COUNT: 1,
        }
      );

      if (responseFromCloseStream === null) {
        console.log("Response is null");
        continue;
      }

      // @ts-ignore
      const { data } = responseFromCloseStream[0].messages[0].message;
      const orderData = JSON.parse(data);

      const rawAssetId = orderData.data.data.assetId; // e.g. bookTicker.BTC_USDC
      const assetId = rawAssetId.split(".")[1].split("_")[0]; // -> BTC

      // Ensure Asset exists, starting mai hai hi nahi
      await prisma.asset.upsert({
        where: { id: assetId },
        update: {},
        create: {
          id: assetId,
          symbol: assetId,
          name: assetId,
          imageUrl: "",
          decimals: 2,
        },
      });

      const closedOrder = {
        id: orderData.data.data.id,
        openPrice: orderData.data.data.openPrice,
        closePrice: orderData.data.data.closePrice,
        leverage: orderData.data.data.leverage,
        pnl: orderData.data.data.pnl,
        assetId,
        liquidated: orderData.data.data.liquidated,
        userId: orderData.data.data.userId,
      };
    

      const res = await prisma.existingTrades.create({
        data: closedOrder,
      });

      console.log("clsoed order inserted:", res);
    } catch (error: any) {
      console.error("failed to upload the closed order:", error.message);
    }
  }
}

recieveClosedOrder();