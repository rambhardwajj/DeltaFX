import { Router } from "express";
import {  getuser, logout, singin, verify } from "../controllers/auth.controller";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { getUserOrders } from "../controllers/getUserBalance";

const router = Router();

router.post('/signin', singin)
router.get('/verify/:token',verify)
router.get('/getUser/:userId',isLoggedIn,  getUserOrders)
router.get('/get-user', isLoggedIn, getuser)
router.post('/signout', isLoggedIn, logout);


export default router