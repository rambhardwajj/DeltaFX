import express from "express";

import { createClient } from "redis";
import { ApiResponse } from "../utils/ApiResponse";
import { config } from "@repo/config";
const app = express();

import { Router } from "express";
import { createOrder } from "../controllers/order.controller";

const router = Router();

router.post("/create", createOrder);
router.get("/close", () => {});

export default router;
