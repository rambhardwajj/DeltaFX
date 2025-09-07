import express from "express";

const app = express();

import { Router } from "express";
import { closeOrder, createOrder } from "../controllers/order.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", isLoggedIn,  createOrder);
router.post("/close", isLoggedIn,  closeOrder);

export default router;
