import asyncHandler from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { v4 as uuidv4 } from "uuid";
import { validate as uuidValidate } from "uuid";
import { redisProducer } from "../config/redisProducer";
import { CustomError } from "../utils/CustomError";
import { waitForId } from "../utils/queueWorker";

export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log("Create order route");
  const { asset, type, margin, leverage, slippage } = req.body;
  const orderId = uuidv4();
  const orderDataForEngine = {
    orderId,
    asset,
    type,
    margin,
    leverage,
    slippage,
  };

  console.log("createOrder for orderId -> " + orderId + " sent to engine");
  redisProducer.xAdd("stream", "*", {
    data: JSON.stringify({
      streamName: "trade-create",
      data: orderDataForEngine,
    }),
  });
 

  try {
    const response = await waitForId(orderId);
    console.log("response from QueueWorker -> ", response);
  } catch (error) {
    throw new CustomError(500, "create order Failed due to server error");
  }

  res
    .status(200)
    .json(new ApiResponse(200, "created order", orderDataForEngine));
});

export const closeOrder = asyncHandler(async (req, res) => {
  console.log("close order route");
  const { orderId } = req.body;
  if (!uuidValidate(orderId)) {
    throw new CustomError(403, "Not a valid uuid");
  }

  console.log("closeOrder for orderId -> " + orderId + " sent to engine");
  redisProducer.xAdd("stream", "*", {
    data: JSON.stringify({
      streamName: "trade-close",
      data: { orderId },
    }),
  });

  try {
    const response = await waitForId(orderId);
    console.log("response from QueueWorker -> ", response);
  } catch (error) {
    throw new CustomError(500, "close order failed due to  server error");
  }

  res.status(200).json(new ApiResponse(200, "close order done", orderId));
});
