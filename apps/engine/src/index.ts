import { createClient } from "redis";
import { ASSETS, config } from "@repo/config";
import { processTradeCreation } from "./utils/processTrade";
import type { BalanceAmt, OrderI, UserI, liqOrder } from "./utils/types";
import {
  MinPriorityQueue,
  MaxPriorityQueue,
} from "@datastructures-js/priority-queue";
import { closeOrder } from "./utils/closeOrder";
import path from "path";

import { liquidateOrder } from "./utils/liquidate";
import {
  usersToJSON,
  JSONToUsers,
  openPositionsToJSON,
  userBalanceToJSON,
  shortOrderHmToJSON,
  longOrderHmToJSON,
  JSONToOpenPositions,
  jsonToUserBalance,
  JSONToShortOrderHm,
  JSONToLongOrderHm,
} from "./utils/snapShotUtils";
import fs from "fs";

const myAssets = ["BTC", "ETH", "SOL"];
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

export const currPrices = {
  ...Object.fromEntries(
    ASSETS.map((asset) => {
      return [
        asset,
        {
          offset: "$",
          price: 0,
          decimal: 2,
          timeStamp: Date.now(),
        },
      ];
    })
  ),
};

export let users = new Map<string, UserI>();
export let open_positions = new Map<string, OrderI>();
export let user_balance = new Map<string, number>();
export let shortOrderHm = new Map<string, MinPriorityQueue<liqOrder>>();
export let longOrdersHm = new Map<string, MaxPriorityQueue<liqOrder>>();

function safeReadJsonFile(filePath: string, defaultContent: string): string {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File ${filePath} doesn't exist, creating with default content`);
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, defaultContent);
      return defaultContent;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file is empty or contains only whitespace
    if (!content.trim()) {
      console.log(`File ${filePath} is empty, using default content`);
      fs.writeFileSync(filePath, defaultContent);
      return defaultContent;
    }

    // Try to parse JSON to validate it
    JSON.parse(content);
    console.log(`Successfully loaded ${filePath}`);
    return content;
    
  } catch (error) {
    console.error(`Error reading/parsing ${filePath}:`, error);
    console.log(`Using default content for ${filePath}`);
    
    // Backup corrupted file
    const backupPath = `${filePath}.corrupted.${Date.now()}`;
    try {
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`Corrupted file backed up to ${backupPath}`);
      }
    } catch (backupError) {
      console.error(`Failed to backup corrupted file:`, backupError);
    }
    
    // Write default content
    try {
      fs.writeFileSync(filePath, defaultContent);
    } catch (writeError) {
      console.error(`Failed to write default content to ${filePath}:`, writeError);
    }
    
    return defaultContent;
  }
}

// Default JSON structures
const defaultUsers = JSON.stringify({ users: [] }, null, 2);
const defaultOpenPositions = JSON.stringify({ open_positions: [] }, null, 2);
const defaultUserBalance = JSON.stringify({ user_balance: [] }, null, 2);
const defaultShortOrders = JSON.stringify({ shortOrderHm: [] }, null, 2);
const defaultLongOrders = JSON.stringify({ longOrderHm: [] }, null, 2);

// Safe file reading
let usersDatafromSS = safeReadJsonFile('data/users.json', defaultUsers);
let openPositionFromSS = safeReadJsonFile('data/open_orders.json', defaultOpenPositions);
let userBalanceFromSS = safeReadJsonFile('data/user_balance.json', defaultUserBalance);
let shortOrderFromSS = safeReadJsonFile('data/shortorder_hm.json', defaultShortOrders);
let longOrderFromSS = safeReadJsonFile('data/longorder_hm.json', defaultLongOrders);

// Safe data conversion with error handling
try {
  console.log("Converting JSON data to Maps...");
  
  users = JSONToUsers(usersDatafromSS);
  console.log(`✓ Loaded ${users.size} users`);
  
  open_positions = JSONToOpenPositions(openPositionFromSS);
  console.log(`✓ Loaded ${open_positions.size} open positions`);
  
  user_balance = jsonToUserBalance(userBalanceFromSS);
  console.log(`✓ Loaded ${user_balance.size} user balances`);
  
  shortOrderHm = JSONToShortOrderHm(shortOrderFromSS);
  console.log(`✓ Loaded ${shortOrderHm.size} short order queues`);
  
  longOrdersHm = JSONToLongOrderHm(longOrderFromSS);
  console.log(`✓ Loaded ${longOrdersHm.size} long order queues`);
  
  console.log("✅ All data loaded successfully!");
  
} catch (error) {
  console.error("❌ Error converting JSON to data structures:", error);
  console.log("🔄 Initializing with empty data structures as fallback");
  
  // Initialize with empty structures as fallback
  users = new Map<string, UserI>();
  open_positions = new Map<string, OrderI>();
  user_balance = new Map<string, number>();
  shortOrderHm = new Map<string, MinPriorityQueue<liqOrder>>();
  longOrdersHm = new Map<string, MaxPriorityQueue<liqOrder>>();
  
  console.log("✅ Fallback initialization complete");
}
console.log(users)
console.log(open_positions)
console.log(user_balance)
console.log(shortOrderHm)
console.log(longOrdersHm)


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

    // CURR PRICES
    if (streamName === "curr-prices") {
      ASSETS.forEach((asset) => {
        currPrices[asset] = data[asset];
        // call auto liquidate function
        liquidateOrder(asset);
      });
      console.log();
      console.log(data);
    }
    // TRADE CREATE
    if (streamName === "trade-create") {
      console.log();
      console.log("Incoming data", data);
      console.log("Orders Before: ", Object.fromEntries(open_positions));

      if (
        !["long", "short"].includes(data.data.type) ||
        data.data.leverage < 1
      ) {
        console.log("some order data not foung");
        returnResponseToStream(
          "return-stream",
          false,
          "Either leverage <1 or order type is invalid",
          404,
          { id: data.data.orderId }
        );
        continue;
      }
      if (
        !data.userId ||
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
          { id: data.data.orderId }
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
        slippage: data.data.slippage,
      });

      console.log("orderOpen data sent to Return Queue ");
    }
    // TRADE CLOSE
    if (streamName === "trade-close") {
      console.log();

      const closeOrderData = { id: data.orderId };
      const orderData = open_positions.get(data.orderId);
      if (!orderData) {
        returnResponseToStream(
          "return-stream",
          false,
          "order data doesnot exists",
          500,
          closeOrderData
        );
        continue;
      }
      console.log(orderData);
      const currPriceOfAsset = currPrices[orderData!.asset]?.price;
      console.log(orderData?.asset);
      console.log("currPrice of asset", currPriceOfAsset);

      if (!currPriceOfAsset) {
        returnResponseToStream(
          "return-stream",
          false,
          "current Price not found",
          500,
          closeOrderData
        );
        continue;
      }

      closeOrder(
        orderData!.userId,
        orderData!.id,
        orderData!.asset,
        currPriceOfAsset!,
        orderData!.type,
        orderData!.leverage,
        orderData!.entryPrice,
        orderData.margin,
        orderData.quantity
      );

      returnResponseToStream(
        "return-stream",
        true,
        "order closed",
        200,
        closeOrderData
      );

      console.log("orderClose data sent to Return Queue");
    }
    // CREATE USER
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

      balanceMap.set("USD", { balance: 500000, type: "usd" });
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
      // console.log("users map- >  ", users);

      const JsonUser = usersToJSON(users);
      // console.log("Here are json users-> ", JsonUser);
    }
    // GET USER BALANCE
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
    // GET USD BALANCE
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

setInterval(() => {
  const usersToDump = usersToJSON(users);
  fs.writeFile("data/users.json", usersToDump, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
      return;
    }
    console.log("users File written successfully!");
  });

  const openPositionsToDump = openPositionsToJSON(open_positions);
  fs.writeFile("data/open_orders.json", openPositionsToDump, (err) => {
    if (err) {
      console.log("Error in writting in open positions file", err);
      return;
    }
    console.log("Open positions written in file.");
  });

  const userbalanceToDump = userBalanceToJSON(user_balance);
  fs.writeFile("data/user_balance.json", userbalanceToDump, (err) => {
    if (err) {
      console.log("Error in writting in open positions file", err);
      return;
    }
    console.log("User balance written in file.");
  });

  const shortOrdreHMtoJson = shortOrderHmToJSON(shortOrderHm);
  fs.writeFile("data/shortorder_hm.json", shortOrdreHMtoJson, (err) => {
    if (err) {
      console.log("Error in writting in short order file", err);
      return;
    }
    console.log("Short order written in file.");
  });

  const longOrderHmMToJSON = longOrderHmToJSON(longOrdersHm);
  fs.writeFile("data/longorder_hm.json", longOrderHmMToJSON, (err) => {
    if (err) {
      console.log("Error in writting in short order file", err);
      return;
    }
    console.log("Short order written in file.");
  });

}, 10000);

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
