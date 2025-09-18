import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { v4 as uuidv4 } from "uuid";
import { validate as uuidValidate } from "uuid";
import { redisProducer } from "../config/redisProducer";
import { CustomError } from "../utils/CustomError";
import { waitForId } from "../utils/queueWorker";
import { prisma } from "@repo/db";

const assetMap: Record<string, string> = {
  BTC: "bookTicker.BTC_USDC",
  ETH: "bookTicker.ETH_USDC",
  SOL: "bookTicker.SOL_USDC",
};

function getStreamKey(asset: string): string {
  if (!assetMap[asset]) {
    throw new CustomError(400, "Unsupported asset");
  }
  return assetMap[asset];
}

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  if (!userId) throw new CustomError(404, "invalid userId please login again ");

  const { asset, type, margin, leverage, slippage } = req.body;
  const orderId = uuidv4();

  if (margin <= 0 || leverage <= 0 || leverage > 1001) {
    throw new CustomError(400, "Invalid trading parameters");
  }
  if (slippage < 0 || slippage > 100) {
    throw new CustomError(400, "Invalid slippage");
  }
  if (!["BTC", "ETH", "SOL"].includes(asset)) {
    throw new CustomError(400, "Unsupported asset");
  }

  const streamAsset = getStreamKey(asset);
  const orderData = {
    orderId,
    asset: streamAsset,
    type,
    margin,
    leverage,
    slippage,
  };

  const orderDataForEngine = {
    userId: userId,
    data: orderData,
  };

  console.log("createOrder for orderId -> " + orderId + " sent to engine");

  await redisProducer.xAdd("stream", "*", {
    data: JSON.stringify({
      streamName: "trade-create",
      data: orderDataForEngine,
    }),
  });

  try {
    const response = await waitForId(orderId);
    console.log("response from QueueWorker -> ", response);
    if(response.success){
      console.log("Order created from the queue worker")
    }else{
      throw new CustomError(500, "Engine Processing Error")
    }
  } catch (error) {
    throw new CustomError(500, "create order Failed due to engine error");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "created order", orderDataForEngine));
});

export const closeOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  if (!uuidValidate(orderId)) {
    throw new CustomError(403, "Not a valid uuid");
  }

  console.log("closeOrder for orderId -> " + orderId + " sent to engine");
  await redisProducer.xAdd("stream", "*", {
    data: JSON.stringify({
      streamName: "trade-close",
      data: { orderId },
    }), 
  });

  try {
    const response = await waitForId(orderId);
    console.log("response from QueueWorker -> ", response);
    if(response.success){
      console.log(response.data)
    }
  } catch (error) {
    throw new CustomError(500, "close order failed due to  server error");
  }


  res.status(200).json(new ApiResponse(200, "close order done", orderId));
});

export const getClosedOrders = asyncHandler(async (req, res) =>{
  const userId = req.user.id;
  if( !userId) throw new CustomError(401, "userId not found");
  let closedOrders
  try {
     closedOrders = await prisma.existingTrades.findMany({
      where: {
        userId: userId
      }
    })

  } catch (error) {
    throw new CustomError(404, "No closed order found")
  }

  res.status(200).json( new ApiResponse(200,"closed order returned", closedOrders))
})