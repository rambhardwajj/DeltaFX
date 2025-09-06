import { createClient } from "redis";
import { ASSETS, config } from "@repo/config";

const subscriberClient = createClient({
  url: "redis://localhost:6379",
});
const publisherClient = createClient({
  url: config.REDIS_URL
})
async function connectRedis() {
  try {
    await subscriberClient.connect();
    await publisherClient.connect();
  } catch (error) {
    console.log("error in connecting to subscriber", error);
  }
}
connectRedis();

subscriberClient.on("error", (err) => {
  console.error(err);
});

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

// async function pollCurrPrices() {
//   while (true) {
//     const res = await subscriberClient.xRead(
//       {
//         key: "curr-prices",
//         id: "$",
//       },
//       {
//         BLOCK: 1,
//         COUNT: 1,
//       }
//     );

//     if (res === null) continue;

//     // @ts-ignore
//     const { name, messages } = res[0];
//     const id = messages[0].id;
//     const data = JSON.parse(messages[0].message.data);

//     ASSETS.forEach((asset) => {
//       currPrices[asset] = data[asset];
//     });
//     console.log(currPrices);
//   }
// }
// // ------------------------------------------------------------------
// async function getBackendTrades() {
//   // console.log("got till here getbackend")
//   while (true) {
//     // console.log("in Backend trades engine ");
//     const res = await subscriberClient.xRead(
//       {
//         key: "trade-create",
//         id: "$",
//       },
//       {
//         BLOCK: 1,
//         COUNT: 1,
//       }
//     );
//     if (!res) {
//       console.log("no response");
//       continue;
//     }
//     console.log(res);
//   }
// }

async function receiveStreamData(stream: string) {
  while (true) {
    const res = await subscriberClient.xRead({
        key: "stream",
        id: "$",
      },{
        BLOCK: 1,
        COUNT: 1,
      }
    );

    if (res === null) continue;
    // @ts-ignore 
    const {streamName, data} = JSON.parse(res[0].messages[0].message.data)
    // console.log(res[0].messages[0].message.data.streamName);
    // console.log(dataObj)

    if (streamName === "curr-prices") {
      ASSETS.forEach((asset) => {
        currPrices[asset] = data[asset] ;
      });
      console.log()
      console.log(currPrices);
    }
    if(streamName === "trade-create"){
      console.log()
      console.log(data)

      publisherClient.xAdd('return-stream', "*", {
        data : JSON.stringify({
          orderId: data.orderId
        })
      })
      console.log("open data sent")
    }
    if( streamName === "trade-close"){
      console.log()
      console.log(data)

      publisherClient.xAdd('return-stream', "*", {
        data : JSON.stringify({
          orderId: data.orderId
        })
      })
      console.log("close data sent")

    }
  }
}
receiveStreamData("stream")

// pollCurrPrices();
// getBackendTrades();


// Approach 1 - Only getting prices from the queue when i hit the latest order
// This approach wont work when we need to liquidate the order in real time as we dont have the latest prices

// async function getTradesAndOrders() {
//   while (true) {
//     const streams = ASSETS.map((asset) => ({
//       key: asset,
//       id: "$",
//     }));
//     //---------------------------------
//     const response = await subscriberClient.xRead(streams, {
//       BLOCK: 0,
//       COUNT: 1,
//     });
//     if (response === null) continue;
//     // @ts-ignore
//     const { name, messages } = response[0];
//     const id = messages[0].id;
//     const message = JSON.parse(messages[0].message.message);

//     currPrices[name] = {
//       offset: id,
//       prices: message.price,
//       decimal: message.decimal,
//       timeStamp: message.timeStamp,
//     };
//     console.log(currPrices);

//     //-------------------------------
//     const res = await subscriberClient.xRead({
//         key: "trade-create", id: "$",
//       },
//       { BLOCK: 0, COUNT: 1,}
//     );

//     if (!res) {
//       console.log("no response");
//       return;
//     }
//     console.log(res);
//   }
// }

// getTradesAndOrders();

// setInterval(() =>{
//   console.log("hi")
// }, 500)
