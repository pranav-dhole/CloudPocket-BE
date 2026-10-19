import express from "express";
import { sendOtp, verifyOtp } from "../controllers/authControllers.js";

const router = express.Router();

// send OTP to client email for verification
router.post("/sendOtp", sendOtp);

// verifying the OTP sent by client
router.post("/verifyOtp", verifyOtp);

export default router;
