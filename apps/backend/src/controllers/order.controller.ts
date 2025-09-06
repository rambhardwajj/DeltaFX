import { resolve } from "bun";
import asyncHandler from "../utils/asyncHandler";
import {config} from "@repo/config"
import { ApiResponse } from "../utils/ApiResponse";
import { createClient } from "redis";


const backendPublisher = createClient({
    url: config.REDIS_URL
})

async function connectRedis() {
    await backendPublisher.connect();
}
connectRedis();

export const createOrder = asyncHandler( async(req, res) =>{
    console.log("Create order route")
    const {asset, type, margin, leverage, slippage} = req.body
    const uuid = crypto.randomUUID()

    const data = {uuid, asset , type, margin, leverage, slippage}
    res.status(200).json(new ApiResponse(200, "created order",data ))
})