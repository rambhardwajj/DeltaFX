import { prisma } from "@repo/db";
import asyncHandler from "../utils/asyncHandler";
import { CustomError } from "../utils/CustomError";
import { config } from "@repo/config";
import { createClient } from "redis";
import { waitForId } from "../utils/queueWorker";
import { ApiResponse } from "../utils/ApiResponse";

const balanceRedisProducer = createClient({
  url: config.REDIS_URL,
});

async function connectBalanceRedisProducer() {
  balanceRedisProducer.connect();
}
connectBalanceRedisProducer();

export const getUserBalance = asyncHandler(async (req, res) => {
  // console.log("in get user balance ", req.user)
  const userId = req.user.id;

  if (!userId)  throw new CustomError(404, "no userId forund ");
  
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw new CustomError(404, "User not found ");

  try {
    const getBalanceData = { userId: userId }
      
      balanceRedisProducer.xAdd("stream", "*", {
        data: JSON.stringify({
          streamName: "get-user-balance",
          data: getBalanceData
        })
      })
    
      let workerResponse; 
      try {
         workerResponse = await waitForId(userId);
        if( !workerResponse){
          throw new CustomError(500, "worker response is null")
        }
        console.log(workerResponse)

      } catch (error) {
        throw new CustomError(404, "Error in getting balance from  ")
      }

      res.status(200).json(new ApiResponse(200, "User balance returned", workerResponse))


  } catch (error) {
    res.status(200).json({success: false, message:"Error in getting user balance"})
  }
});

export const getUserUsdBalance = asyncHandler(async (req, res) =>{
  const userId = req.user.id
  if( !userId) 
    throw new CustomError(404, "user id not found ")

  const getUsdBalanceData = {
    userId: userId
  }
  let result;
  try {
    balanceRedisProducer.xAdd("stream", "*", {
      data: JSON.stringify({
        streamName: "get-usd-balance", 
        data: getUsdBalanceData
      })
    })

    const workerResponse = await waitForId(userId);
    console.log("get user usd balance ",workerResponse)
    result = workerResponse;
    if(!workerResponse){
      throw new CustomError(500, "No response from worker")
    }

  } catch (error) {
    console.log(error)
  }

  res.status(200).json(new ApiResponse(200, "usd balance returned to the usr",result ))
})
