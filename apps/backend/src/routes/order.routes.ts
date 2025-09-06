import express from "express";

const app = express();

import { Router } from "express";
import { closeOrder, createOrder } from "../controllers/order.controller";

const router = Router();

router.post("/create", createOrder);
router.post("/close", closeOrder);

export default router;
