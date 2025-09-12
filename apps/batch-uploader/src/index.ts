import { config, ASSETS } from "@repo/config";
import { createClient } from "redis";
import { client, connectDB } from "@repo/timescaledb";

type TradeDetails = {
  symbol: string;
  price: number;
  timeStamp: string;
  quantity: number;
};
const batchRedisClient = createClient({ url: config.REDIS_URL });
let offset = "$";
let writeToFile1 = true;
let arr1: TradeDetails[] = [];
let arr2: TradeDetails[] = [];

async function connectRedis() {
  try {
    await batchRedisClient.connect();
  } catch (error) {
    console.log("error in connecting batch redis");
  }
}

async function insertData(trades: TradeDetails[]) {
  if (!trades || trades.length === 0) return;

  console.log("Inserting data into DB...");
//   console.log("price", trades);

  try {
    for (const trade of trades) {
      if (trade.symbol === "bookTicker.BTC_USDC") {
        trade.symbol = "BTC";
      } else if (trade.symbol === "bookTicker.SOL_USDC") {
        trade.symbol = "SOL";
      } else {
        trade.symbol = "ETH";
      }
    //   console.log(trade.symbol)

      if(trade.price === 0) continue;

      const tableCheck = await client.query(`SELECT to_regclass('public.${trade.symbol}')`);
      console.log(`Table "${trade.symbol}" exists:`, tableCheck.rows[0].to_regclass !== null);


      const res = await client.query(
        `INSERT INTO ${trade.symbol} (symbol, price, quantity, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [trade.symbol, trade.price, trade.quantity, trade.timeStamp]
      );
    //   console.log("res-> ", res)
      console.log("Data inserted")
    }

    console.log(`Inserted ${trades.length} trades`);
  } catch (error) {
    console.error("Error inserting data:", error);
  }
}
async function processAndClearFile(DS: any) {
  // console.log(DS)
  await insertData(DS);
  DS.length = 0;
  console.log(`Cleared ${DS}`);
}

setInterval(async () => {
  console.log("Switching DS...");

  const DSToProcessPath = writeToFile1 ? arr1 : arr2;
  writeToFile1 = !writeToFile1;
  await processAndClearFile(DSToProcessPath);
}, 10000);

// GETTING DATA FROM REDIS TO WRITING IN OUT DS
async function writeToFileFun(trade: TradeDetails) {
  const currDS = writeToFile1 ? arr1 : arr2;
  // console.log(trade)
  currDS.push(trade);
}
async function main() {
  await connectRedis();
  await connectDB();
  async function getDataFromRedisStreams() {
    while (true) {
      const response = await batchRedisClient.xRead(
        [
          {
            key: "stream",
            id: "$",
          },
        ],
        {
          BLOCK: 0,
          COUNT: 1,
        }
      );

      if (!response) continue;
      // @ts-ignore
      const { messages } = response[0];
      const id = messages[0].id;
      offset = id;

      const { streamName, data } = JSON.parse(messages[0].message.data);
      // console.log(data)
      switch (streamName) {
        case "curr-prices": {
          // ["symbol", "price", "timeStamp", "quantity"];
          ASSETS.forEach((asset) => {
            const tradeObj = {
              symbol: asset,
              price: data[asset].price / 10 ** 2,
              timeStamp: new Date(
                parseInt((Number(data[asset].timeStamp) / 1000).toFixed(0))
              ).toISOString(),
              quantity: 0,
            };
            // console.log(tradeObj)
            writeToFileFun(tradeObj);
          });
          break;
        }
        default: {
          break;
        }
      }
    }
  }
  getDataFromRedisStreams();
}
main();
