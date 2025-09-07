import {z} from 'zod'
import dotenv from 'dotenv'
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const envSchema = z.object({
    REDIS_URL: z.string(),
    PORT_BACKEND: z.string().transform(Number),
    PORT_POLLER: z.string().transform(Number),
    DATABASE_URL: z.string()
})

const env = envSchema.parse(process.env);

export const config = {
    REDIS_URL: env.REDIS_URL,
    PORT_BACKEND: env.PORT_BACKEND,
    PORT_POLLER: env.PORT_POLLER,
    DATABASE_URL : env.DATABASE_URL
}


export default config