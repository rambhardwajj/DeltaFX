import WebSocket, { type RawData } from "ws";
import { createRedis } from "@repo/config"

import { ASSETS } from "@repo/config";
import type { AssetData } from "@repo/types";
import { config } from "@repo/config";

const main = async () => {
    const ws = new WebSocket("wss://ws.backpack.exchange");

    const redisClient = createRedis(config.REDIS_URL)
    await redisClient.connect();

    let wsDataForQueue = {
        assetsData : []
    }

    ws.on("error", console.error);
    const subscription = { method: "SUBSCRIBE", params: ASSETS, id: 1 };
    
    ws.on("open", () => {
      for (const asset of ASSETS) {
        console.log(asset);
        ws.send(JSON.stringify(subscription));
      }
    });
    
    ws.on("message", (msg:RawData) => {
      const response = JSON.parse(msg.toString());
      const data = response.data
    
      if (data.e === "bookTicker") {
        const stramData: AssetData = {
          asset: data.s,
          price: Math.round(Number(data.a) * Math.pow(10, data.a.split(".")[1].length)),
          decimal: data.a.split(".")[1].length,
        };
        console.log("Data",stramData)
        
      }
    });

    const interval = setInterval( () =>{
        // send to redis queue
        if(wsDataForQueue.assetsData.length>0){
            wsDataForQueue.assetsData.push()
        }

    } , 100)
};


main();

