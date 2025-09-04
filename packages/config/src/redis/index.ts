import { createClient, type RedisClientType } from "redis";

class RedisClient {
    private client: RedisClientType;

    constructor(private url: string) {
        this.client = createClient({ url: url });
        this.client.on("error", (err) => console.error(`Error creating clinet: ${err}`));
    }
    async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
            console.log("Redis connected at: ", this.url);
        }
    }

    async disconnect() {
        if (this.client.isOpen) this.client.disconnect()
    }
}

export const createRedis = (url: string) => new RedisClient(url);
