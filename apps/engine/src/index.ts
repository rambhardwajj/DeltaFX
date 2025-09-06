import { createClient } from "redis";
import { ASSETS } from "@repo/config";

const subscriberClient = createClient({
  url: "redis://localhost:6379",
});
async function connectSubscriber() {
  try {
    await subscriberClient.connect();
  } catch (error) {
    console.log("error in connecting to subscriber", error);
  }
}
connectSubscriber();

subscriberClient.on("error", (err) => {
  console.error(err);
});

let lastId = "$";
const currPrices = {
  ...Object.fromEntries(
    ASSETS.map((asset) => {
      return [
        asset,
        {
          offset: "$",
          prices: 0,
          decimal: 0,
          timeStamp: Date.now(),
        },
      ];
    })
  ),
};

async function getCurrentPrices(asset: string) {
  const res = await subscriberClient.xRead(
    { key: asset, id: currPrices[asset]!.offset },
    {
      BLOCK: 0,
      COUNT: 1,
    }
  );

  if (res === null) return;

  // @ts-ignore
  const { name, messages } = res[0];
  const id = messages[0].id;
  const message = JSON.parse(messages[0].message.message);

  currPrices[name] = {
    offset: id,
    prices: message.price,
    decimal: message.decimal,
    timeStamp: message.timeStamp,
  };

  console.log(currPrices);
}

setInterval(() => {
  ASSETS.map((asset) => {
    getCurrentPrices(asset);
  });
}, 100);
