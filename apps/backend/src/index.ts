import { config } from "@repo/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: true, // Reflect request origin
    credentials: true,
  })
);

import { errorHandler } from "./middlewares/error.middleware";
import { ApiResponse } from "./utils/ApiResponse";

import authRouter from "./routes/auth.routes";
import orderRouter from "./routes/order.routes";
import { isLoggedIn } from "./middlewares/auth.middleware";
import { getUserBalance, getUserUsdBalance } from "./controllers/getUserBalance";
import { getSupportedAssets } from "./controllers/getSupportedAssets";

app.get("/", (req, res) => {
  console.log("hey");
  res.status(200).json({ message: "health check" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/trade", orderRouter);
app.get("/api/v1/balance", isLoggedIn ,getUserBalance);
app.get("/api/v1/balance/usd", isLoggedIn, getUserUsdBalance );
app.get("/api/v1/supportedAssets", getSupportedAssets)

app.use(errorHandler);
app.listen(config.PORT_BACKEND, () => {
  console.log("listening on port", config.PORT_BACKEND);
});
