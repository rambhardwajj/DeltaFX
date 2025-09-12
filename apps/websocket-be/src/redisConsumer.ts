
import { config } from "@repo/config";
import { createClient, type RedisClientType } from "redis";

export const redisConsumer = createClient({
    url: config.REDIS_URL
})

async function connectRedisConsumer() {
    await redisConsumer.connect();
}

connectRedisConsumer();