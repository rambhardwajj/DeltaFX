
import { config } from "@repo/config";
import { createClient, type RedisClientType } from "redis";

export const redisProducer = createClient({
    url: config.REDIS_URL
})

async function connectRedisConsumer() {
    await redisProducer.connect();
}

connectRedisConsumer();