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
    credentials: true,
    allowedHeaders: ["http://localhost:3000"],
  })
);

import authRouter from "./routes/auth.routes"
import { errorHandler } from "./middlewares/error.middleware";

app.use("/api/v1/auth", authRouter )

app.get("/", (req, res) => {
  res.status(200).json({ message: "health check" });
});

app.use(errorHandler)
app.listen(config.PORT_BACKEND, () => {
  console.log("listening on port", config.PORT_BACKEND);
});

