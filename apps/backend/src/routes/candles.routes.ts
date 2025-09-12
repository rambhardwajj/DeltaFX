
import { Router } from "express";
import { getCandles } from "../controllers/candles.controller.js";

const router : Router= Router();

router.post("/get-candles/:asset/:interval/:limit",  getCandles)

export default router;  