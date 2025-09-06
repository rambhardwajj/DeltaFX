import asyncHandler from "../utils/asyncHandler";

import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { CustomError } from "../utils/CustomError";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "redis";
import { config } from "@repo/config";

const authRedisProducer = createClient({
  url: config.REDIS_URL,
});

async function connectAuthRedisProducer() {
  authRedisProducer.connect();
}
connectAuthRedisProducer();

export const singin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const token = jwt.sign({ email }, "jsonsecret", { expiresIn: "1h" });

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
      user: "062e545032666e",
      pass: "2085583b4d7704",
    },
  });

  const info = await transporter.sendMail({
    from: '"Maddison Foo Koch" <maddison53@ethereal.email>',
    to: email,
    subject: "Hello ✔",
    text: text, // plain‑text body
    html: html, // HTML body
  });

  res.status(200).json({ message: "email sent " });
});

export const verify = asyncHandler(async (req, res) => {
  const { token } = req.params;
  console.log(token);
  if (!token) throw new CustomError(400, "token is invalid");

  try {
    const decoded = jwt.verify(token, "jsonsecret");
    const email = decoded;
    console.log(decoded);

    console.log("Verified email:", email);

    // db call from email to check if user exists

    // else
    // create uuid
    const userId = uuidv4();
    const userData = { userId: userId, email: email };

    authRedisProducer.xAdd("stream", "*", {
      data: JSON.stringify({
        streamName: "create-user",
        data: userData, 
      }),
    });

    // crate user in db

    res
      .status(200)
      .cookie("authToken", token, {
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
