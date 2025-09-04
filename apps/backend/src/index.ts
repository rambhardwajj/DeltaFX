import { config, createRedis } from "@repo/config";

const redis = createRedis(config.REDIS_URL);
console.log(config)
await redis.connect();
