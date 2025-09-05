import WebSocket, { type RawData } from "ws";
import { ASSETS } from "@repo/config";
import { createClient } from "redis";

const DECIMAL_PRECISION = 4;

const publisher = createClient({
  url: "redis://localhost:6379",
});

async function connectRedis() {
  await publisher.connect();
}

connectRedis();

interface assetPriceI {
  [asset: string]:{
    price: number,
    decimal: number,
    timeStamp: number
  }
}

const currentPrices : assetPriceI = {
  ...Object.fromEntries(
    ASSETS.map((asset) => {
      return [
        asset,
        {
          timeStamp: Date.now() * 1000,
          decimal: DECIMAL_PRECISION,
          price: 0,
        }
      ];
    })
  )
}

setInterval(() => {
  ASSETS.map((asset) => {
    console.log(asset, currentPrices[asset]);
    if (currentPrices[asset]?.price === 0) {
      return;
    }
    publisher.XADD(asset, "*", {
      message: JSON.stringify(currentPrices[asset])
    })
    // console.log();
    // console.log(asset, currentPrices[asset], "PUBLISHED TO STREAM")
    // console.log();
  });
}, 100);

const main = async () => {
  const ws = new WebSocket("wss://ws.backpack.exchange");
  ws.on("error", console.error);

  ws.on("open", () => {
    for (const asset of ASSETS) {
      const subscription = { method: "SUBSCRIBE", params: [`${asset}`] };
      // console.log(asset);
      ws.send(JSON.stringify(subscription));
    }
  })

  ws.on("message", async (msg) => {
    const response = JSON.parse(msg.toString());
    currentPrices[response.stream] = {
      price: (response.data.a * (10** DECIMAL_PRECISION)),
      decimal : DECIMAL_PRECISION,
      timeStamp: response.data.T
    }
    console.log(currentPrices[response.stream])
  })


};

main();