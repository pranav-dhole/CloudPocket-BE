import "dotenv/config";
import { OTP } from "../models/Otpmodel.js";
import nodemailer from "nodemailer";

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpService(email) {
  const genOTP = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  const htmlTemplate = `<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 8px; max-width: 400px; margin: auto;">
    <h2 style="color: #333;">Verification Code</h2>
    <p>Hi,</p>
    <p>Use the code below to complete your verification. It is valid for 2 minutes.</p>

    <div style="background: #fff; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0066cc; border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;">
        ${genOTP}
    </div>

    <p style="font-size: 12px; color: #777;">If you didn't request this, please ignore this email.</p>
</div>`;

  try {
    await OTP.findOneAndUpdate(
      { email },
      { otp: genOTP, createdAt: new Date() },
      { upsert: true },
    );

    const info = await transporter.sendMail({
      from: `"Cloudpockets" <${process.env.SMTP_USER}>`, // sender address
      to: email, // list of recipients
      subject: "OTP Verification", // subject line
      html: htmlTemplate, // HTML body
    });

    console.log("Message sent: %s", info.messageId);
    // Preview URL is only available when using an Ethereal test account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("Error while sending mail:", err);
  }
}
