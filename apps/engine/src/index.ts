import { createClient } from "redis";
import { ASSETS, config } from "@repo/config";
import { processTradeCreation } from "./utils/processTrade";
import type { BalanceAmt, OrderI, UserI } from "./utils/types";

const subscriberClient = createClient({
  url: "redis://localhost:6379",
});
export const publisherClient = createClient({
  url: config.REDIS_URL,
});

subscriberClient.on("error", (err) => {
  console.error("Redis subscriber error:", err);
});
publisherClient.on("error", (err) => {
  console.error("Redis publisher error:", err);
});

async function connectRedis() {
  try {
    await subscriberClient.connect();
    await publisherClient.connect();
    console.log("Redis connected");
  } catch (error) {
    console.log("error in connecting to subscriber", error);
  }
}
connectRedis();
subscriberClient.on("error", (err) => {
  console.error(err);
});

export const currPrices = {
  ...Object.fromEntries(
    ASSETS.map((asset) => {
      return [
        asset,
        {
          offset: "$",
          prices: 0,
          decimal: 2,
          timeStamp: Date.now(),
        },
      ];
    })
  ),
};
export const users = new Map<string, UserI>();
export const open_positions = new Map<string, OrderI>();
export const user_balance = new Map<string, number>();

function returnResponseToStream(
  stream: string,
  success: boolean,
  message: string,
  status: number,
  data: any
) {
  publisherClient.xAdd(stream, "*", {
    data: JSON.stringify({
      success: success,
      responseMessage: message,
      status: status,
      data: data,
    }),
  });
}

async function receiveStreamData(stream: string) {
  while (true) {
    const responseFromStream = await subscriberClient.xRead(
      { key: "stream", id: "$" },
      { BLOCK: 0, COUNT: 1 }
    );
    if (responseFromStream === null) {
      console.log("Response from stream is null");
      continue;
    }
    // @ts-ignore
    const { streamName, data } = JSON.parse(
          // @ts-ignore
      responseFromStream[0].messages[0].message.data
    );
    console.log(streamName);

    if (streamName === "curr-prices") {
      ASSETS.forEach((asset) => {
        currPrices[asset] = data[asset];
      });
      console.log();
      // data is coming with 10^2
      console.log(data);
    }
    // ------------------------------------------------
    if (streamName === "trade-create") {
      console.log();
      console.log("Incoming data", data);
      console.log("Orders Before: ", Object.fromEntries(open_positions));

      if (
        !data.userId ||
        !data.data.orderId ||
        !data.data.asset ||
        !data.data.type ||
        !data.data.margin ||
        !data.data.leverage ||
        !data.data.slippage
      ) {
        console.log("some order data not foung");
        returnResponseToStream(
          "return-stream",
          false,
          "order data missing",
          404,
          null
        );
        continue;
      }

      processTradeCreation({
        userId: data.userId,
        orderId: data.data.orderId,
        asset: data.data.asset,
        type: data.data.type,
        margin: data.data.margin,
        leverage: data.data.leverage,
        slippage: data.data.slippage
      });

      console.log("orderOpen data sent to Return Queue ");
    }

    if (streamName === "trade-close") {
      console.log();
      console.log(data);

      const closeOrderData = { id: data.orderId };

      returnResponseToStream(
        "return-stream",
        true,
        "order closed",
        200,
        closeOrderData
      );

      // publisherClient.xAdd("return-stream", "*", {
      //   data: JSON.stringify({
      //     id: data.orderId,
      //   }),
      // });

      console.log("orderClose data sent to Return Queue");
    }
    // ------------------------------------------------
    if (streamName === "create-user") {
      if (!data.userId || !data.data.email) {
        returnResponseToStream(
          "return-stream",
          false,
          "UserId or email missing",
          400,
          null
        );
        continue;
      }

      const balanceMap = new Map<string, BalanceAmt>();

      // balance with 10^2
      balanceMap.set("USD", { balance: 500000, decimal: 2 });
      user_balance.set(data.userId, 500000);
      const userDataToStore = {
        id: data.userId,
        email: data.data.email,
        balance: balanceMap,
      };

      if (!users.has(data.userId)) {
        users.set(data.userId, userDataToStore);
      }

      const userReturn = {
        id: data.userId,
        email: data.email,
        balance: Object.fromEntries(balanceMap),
      };
      returnResponseToStream(
        "return-stream",
        true,
        "User Created in Engine",
        200,
        userReturn
      );
      console.log("users map- >  ", users);
    }

    // ------------------------------------------------
    if (streamName === "get-user-balance") {
      if (!data.userId || !users.has(data.userId)) {
        console.log("get-user-bal: Either Id or user doesnot exits");
        returnResponseToStream(
          "return-stream",
          false,
          "Cannot get balance as userId is null",
          404,
          null
        );
        continue;
      }

      if (users.has(data.userId)) {
        const balanceMap = users.get(data.userId)!.balance;
        const balanceSend = {
          id: data.userId,
          userBalance: Object.fromEntries(balanceMap),
        };

        console.log("user balance sent to be", balanceSend);
        returnResponseToStream(
          "return-stream",
          true,
          "User balance returned",
          200,
          balanceSend
        );
      } else {
        returnResponseToStream(
          "return-stream",
          false,
          "Cannot get balance as userId is null",
          404,
          null
        );
      }
    }
    if (streamName === "get-usd-balance") {
      if (!data.userId || !users.has(data.userId)) {
        returnResponseToStream(
          "return-stream",
          false,
          "Cannot get balance as userId is null",
          404,
          null
        );
        continue;
      }

      if (users.has(data.userId)) {
        const userBalance = users.get(data.userId)?.balance;
        if (userBalance?.get("USD")) {
          const usdBalance = userBalance.get("USD");
          const usdBalanceResponse = {
            id: data.userId,
            usdBalance: usdBalance,
          };

          console.log("sent usd balance to backend ", usdBalanceResponse);
          returnResponseToStream(
            "return-stream",
            true,
            "USD balance returned for the user",
            200,
            usdBalanceResponse
          );
        }
      }
    }
  }
}
receiveStreamData("stream");

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

///----------
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

// pollCurrPrices();
// getBackendTrades();
