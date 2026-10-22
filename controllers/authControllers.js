import { OTP } from "../models/Otpmodel.js";
import { sendOtpService } from "../services/sendOtpService.js";

export async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(404)
        .json({ message: "Email is required for sending OTP" });
    }
    await sendOtpService(email);

    return res.status(201).json({ message: "OTP sent successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error while sending the OTP" });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const otpDocument = await OTP.findOne({ email, otp });
    if (!otpDocument) {
      return res.status(404).json({ message: "OTP is invalid or expired" });
    }

    otpDocument.verified = true;
    await otpDocument.save();
    return res.status(201).json({ message: "OTP verified successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error while verifying the OTP" });
  }
}
