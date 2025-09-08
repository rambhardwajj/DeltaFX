import asyncHandler from "../utils/asyncHandler";

import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import jwt from "jsonwebtoken";
import { CustomError } from "../utils/CustomError";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "redis";
import { config } from "@repo/config";
import { waitForId } from "../utils/queueWorker";
import { ApiResponse } from "../utils/ApiResponse";
import { prisma } from "@repo/db";

const authRedisProducer = createClient({
  url: config.REDIS_URL,
});

async function connectAuthRedisProducer() {
  authRedisProducer.connect();
}
connectAuthRedisProducer();

export const singin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const token = jwt.sign({ email }, config.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });

  console.log(email);

  var mailGenerator = new Mailgen({
    theme: "default",
    product: {
      // Appears in header & footer of e-mails
      name: "Delta FX",
      link: "http://localhost:4001/verify",
    },
  });
  const emailBody = {
    body: {
      name: email,
      intro: "Welcome to PMS! Click the button below to verify your email.",
      action: {
        instructions: "To verify your account, please click here:",
        button: {
          color: "#22BC66",
          text: "Verify Email",
          link: `http://localhost:4000/api/v1/auth/verify/${token}`,
        },
      },
      outro: "Need help? Just reply to this email.",
    },
  };

  var html = mailGenerator.generate(emailBody);
  var text = mailGenerator.generatePlaintext(emailBody);

  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "b87c4f2d58f263",
      pass: "a01ba65a50628f",
    },
  });

  const info = await transporter.sendMail({
    from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
    to: email,
    subject: "Hello ✔",
    text: text, // plain‑text body
    html: html, // HTML body
  });

  res.status(200).json({ message: "email sent to the user" });
});

export const verify = asyncHandler(async (req, res) => {
  const { token } = req.params;
  console.log(token);
  if (!token) throw new CustomError(400, "token is invalid");

  try {
    const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    if(!decoded){
      throw new CustomError(400, "invalid token")
    }

    const jwtData = decoded

    console.log("jwt Payload:", jwtData);
    // @ts-ignore 
    const email = jwtData.email
    const userId = uuidv4();
    const userData = { userId: userId, data: jwtData };

    authRedisProducer.xAdd("stream", "*", {
      data: JSON.stringify({
        streamName: "create-user",
        data: userData,
      }),
    });
    console.log("userData with userId " + userId + " sent to Engine");

    try {
      const response = await waitForId(userId);
      if(!response){
        throw new CustomError(400, "Wrong token")
      }
      console.log("response from QueueWorker -> ", response);
    } catch (error) {
      throw new CustomError(500, "close order failed due to  server error");
    }

    try {
      const resFromDB = await prisma.user.create({
        data:{
          id: userId,
          email: email as string,
          lastLoggedId : new Date(Date.now()),
        }
      })
      console.log("res from db ", resFromDB)
  
      if(!resFromDB){
        throw new CustomError(500, "Failed to add user to the database"); 
      }
      
    } catch (error) {
      throw new CustomError(500, "Failed in creating user" )
    }

    let accessToken;
    try {
    accessToken  = jwt.sign({email, id:userId}, config.ACCESS_TOKEN_SECRET , {expiresIn: "7d"})
      
    } catch (error) {
      throw new CustomError(500, "Error in creating jwt token ")
    }

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        // httpOnly: true,
        secure: true,
        // sameSite:  "none" as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: "cookie set" });
  } catch (error) {
    console.log(error);
  }
});

export const logout = asyncHandler(async (req , res ) =>{
  const userId = req.user.id;
  if(!userId) throw new CustomError(400, "Invalid user Id in Logout")
  console.log(userId)

  // check if user exists 

  res.clearCookie("accessToken");
  res.status(200).json(new ApiResponse(200, "logged Out successfully", userId))
})