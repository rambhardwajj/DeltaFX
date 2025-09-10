import { Router } from "express";
import {  singin, verify } from "../controllers/auth.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { getUser } from "../controllers/getUserBalance";

const router = Router();

router.post('/signin', singin)
router.get('/verify/:token',verify)
router.get('/getUser/:userId',isLoggedIn,  getUser)


export default router