import { resolve } from "bun";
import asyncHandler from "../utils/asyncHandler";
import {config, createRedis} from "@repo/config"

const redisClient = createRedis(config.REDIS_URL)

export const createOrder = asyncHandler( async(req, res) =>{
    const {asset, type, margin, leverage , slippage }  = req.body;

    const uuid = crypto.randomUUID()
    const orderPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject()
        },5000)

        const order = {
           orderId: uuid,  asset, type, margin, leverage, slippage
        }

        // add to queue

        // subscribe to the queue and get the latest ids
        // resolve the promise in when you received the response with the same id 
    })
})