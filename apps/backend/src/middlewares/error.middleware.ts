import type { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError.js";


const errorHandler = ( error : any, req: Request, res: Response , next : NextFunction) =>{
    let customError : CustomError

    if( error instanceof CustomError ){
        customError = error 
    }else if(error.code === 11000){
        const field = Object.keys(error.keyValue)[0];
        customError = new CustomError(409, `Duplicate value for field: ${field}`);
    }else{
        customError = new CustomError( 500, error.message,  )
    }

    res.status(customError.statusCode).json({
        success: false, 
        message: customError.message,
        data: customError.data,
        statusCode: customError.statusCode
    })
}

export {errorHandler}