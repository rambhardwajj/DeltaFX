import { INTERVALS } from "@repo/timescaledb";
import asyncHandler from "../utils/asyncHandler.js";
import type { RequestHandler } from "express";
import { client, connectDB } from "@repo/timescaledb";
import { ApiResponse } from "../utils/ApiResponse.js";
import { CustomError } from "../utils/CustomError.js";

// console.log(INTERVALS);

connectDB();

export const getCandles: RequestHandler = asyncHandler(async (req, res) => {
    console.log("In Get Candles")
  const { asset, interval, limit } = req.params;
//   console.log(asset, interval, limit)

  if (!asset || !interval || !limit) {
    throw new CustomError(400, "Feilds are required")
  }

  const viewName = `${asset.toLowerCase()}_ohlcv_${interval.replace(/\s+/g, "")}`;
//   console.log(viewName)

  try {
    const query = `
    SELECT bucket, open, high, low, close, volume
      FROM ${viewName}
      
      ORDER BY bucket DESC
      LIMIT ${limit};
      `;

    const rows  = await client.query(query);
    const reversedRows = {
      ...rows,
      rows: rows.rows.reverse()
    };

    res.status(200).json(new ApiResponse(200, "Rows retrieeved for the assets", reversedRows))
  } catch (error:any) {
    throw new CustomError(400, error.message)
  }
});