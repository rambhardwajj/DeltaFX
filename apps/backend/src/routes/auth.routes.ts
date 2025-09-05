import { Router } from "express";
import { singin, verify } from "../controllers/auth.controller";

const router = Router();

router.post('/signin', singin)
router.get('/verify/:token',verify)


export default router