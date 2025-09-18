import express from "express";

const app = express();

import { Router } from "express";
import { closeOrder, createOrder, getClosedOrders } from "../controllers/order.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", isLoggedIn,  createOrder);
router.post("/close", isLoggedIn,  closeOrder);
router.get("/get-closed-orders", isLoggedIn, getClosedOrders)

export default router;
