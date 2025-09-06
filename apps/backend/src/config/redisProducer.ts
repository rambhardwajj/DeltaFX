import {config} from "@repo/config"
import { createClient, type RedisClientType } from "redis";

export const redisProducer : RedisClientType = createClient({
    url: config.REDIS_URL
})

async function connectRedis() {
    await redisProducer.connect()
}
connectRedis();

