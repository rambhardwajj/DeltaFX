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

async function main() {
  while (true) {
    const res = await subscriberClient.xRead(
        [...ASSETS.map((asset) => {
            return {
                key: asset,
                id: lastId
            }
        })], 
        {
            BLOCK: 0,
            COUNT: 1
        }
    );

    if( res === null) continue;

    // console.log(res)
    if (res) {
        // @ts-ignore 
        for (const stream of res) {
          for (const message of stream.messages) {
            console.log(`Stream: ${stream.name}`, message);
          }
        }
      }
    
  }
}

main();
