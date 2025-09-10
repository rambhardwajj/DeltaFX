import WebSocket, { type RawData } from "ws";
import { ASSETS } from "@repo/config";
import { createClient } from "redis";

const DECIMAL_PRECISION = 2;

const publisher = createClient({
  url: "redis://localhost:6379",
});
async function connectRedis() {
  await publisher.connect();
}

connectRedis();
interface assetPriceI {
  [asset: string]: {
    price: number;
    buyPrice: number;
    decimal: number;
    timeStamp: number;
  };
}
const currentPrices: assetPriceI = {
  ...Object.fromEntries(
    ASSETS.map((asset) => {
      return [
        asset,
        {
          timeStamp: Date.now() * 1000,
          decimal: DECIMAL_PRECISION,
          price: 0,
          buyPrice: 0
        },
      ];
    })
  ),
};

setInterval(() => {
  ASSETS.map((asset) => {
    if (currentPrices[asset]?.price === 0) return;
    console.log("currPrices" + " -> " + JSON.stringify(currentPrices));

    publisher.XADD("stream", "*", {
      data: JSON.stringify({
        streamName: "curr-prices",
        data: currentPrices
    }),
    });
  });
}, 1000);

const main = async () => {
  const ws = new WebSocket("wss://ws.backpack.exchange");
  ws.on("error", console.error);

  ws.on("open", () => {
    for (const asset of ASSETS) {
      const subscription = { method: "SUBSCRIBE", params: [`${asset}`] };
      ws.send(JSON.stringify(subscription));
    }
  });

  ws.on("message", async (msg) => {
    const response = JSON.parse(msg.toString());
    const onePercent = (response.data.b * (10**DECIMAL_PRECISION)) * 0.01;
    currentPrices[response.stream] = {
      price:parseInt((Number(response.data.a) * (10 ** DECIMAL_PRECISION)).toFixed(0)),
      buyPrice: parseInt(((Number(response.data.a) + (0.01 * Number(response.data.a))) * (10 ** DECIMAL_PRECISION)).toFixed(0)),
      decimal: DECIMAL_PRECISION,
      timeStamp: response.data.T,
    };
    // console.log(currentPrices[response.stream])
  });
};

main();
