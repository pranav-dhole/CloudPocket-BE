import express from "express";
import {
  loginWithGoogle,
  sendOtp,
  setPassword,
  verifyOtp,
} from "../controllers/authControllers.js";
import { checkPasswordSetup } from "../middlewares/checkPasswordSetup.js";

const router = express.Router();

// send OTP to client email for verification
router.post("/sendOtp", sendOtp);

// verifying the OTP sent by client
router.post("/verifyOtp", verifyOtp);

// verifying & logging in using google Oauth credentials of client
router.post("/google", loginWithGoogle);

// checking and setting password of users with google Oauth logins
router.post("/setPassword", checkPasswordSetup, setPassword);

export default router;
