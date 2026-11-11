import express from "express";
import {
  loginWithGoogle,
  sendOtp,
  verifyOtp,
} from "../controllers/authControllers.js";

const router = express.Router();

// send OTP to client email for verification
router.post("/sendOtp", sendOtp);

// verifying the OTP sent by client
router.post("/verifyOtp", verifyOtp);

// verifying & logging in using google Oauth credentials of client
router.post("/google", loginWithGoogle);

export default router;
