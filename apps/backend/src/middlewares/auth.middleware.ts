import type { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError.js";
import dotenv from "dotenv"
import jwt from "jsonwebtoken";
import type { decodedUser } from "../types";
import { config } from "@repo/config";


const isLoggedIn = (req:Request, res:Response, next: NextFunction ) =>{
    console.log(req.cookies)
    const {accessToken} = req.cookies;
    if( !accessToken){
        throw new CustomError(400, "Middleware: No Access token in cookies, Unauthorised request")
    }
    try {
        const decoded = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET!)
        req.user = decoded as decodedUser ;
        console.log(req.user)
        next()
    } catch (error) {
        throw new CustomError(
            400,
            "Invalid or expired token in middleware"
        )
    }
}

export { isLoggedIn } 
