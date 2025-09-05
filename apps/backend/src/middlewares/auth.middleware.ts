import type { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError.js";
import dotenv from "dotenv"
import jwt from "jsonwebtoken";
import type { decodedUser } from "../types";

dotenv.config();

const isLoggedIn = (req:Request, res:Response, next: NextFunction ) =>{
    const {accessToken} = req.cookies;
    if( !accessToken){
        throw new CustomError(400, "Unauthorised request")
    }

    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!)
        req.user = decoded as decodedUser ;
        next()
    } catch (error) {
        throw new CustomError(
            400,
            "Invalid or expired token"
        )
    }
}

export { isLoggedIn } 
