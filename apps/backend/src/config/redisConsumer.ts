
import { config } from "@repo/config";
import { createClient, type RedisClientType } from "redis";

export const redisConsumer = createClient({
    url: config.REDIS_URL
})

async function connectRedisConsumer() {
    await redisConsumer.connect();
}

connectRedisConsumer();

// export class RedisConsumer{
//     private client : RedisClientType;

//     constructor(){
//         this.client = createClient();
//         this.client.connect();
//         this.infiniteSeek()
//     }

//      async infiniteSeek() {
//         while(true){
//             const response = this.client.xRead({
//                 key: "", 
//                 id: "$"
//             },{
//                 BLOCK: 0,
//                 COUNT: 1
//             })
//         }
//     }
// }
