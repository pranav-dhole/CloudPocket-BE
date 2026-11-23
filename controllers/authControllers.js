import mongoose, { Types } from "mongoose";
import { OTP } from "../models/Otpmodel.js";
import { User } from "../models/userModel.js";
import { sendOtpService } from "../services/sendOtpService.js";
import { verifyGoogleClient } from "../utils/verifyGoogleClient.js";
import { Folder } from "../models/folderModel.js";
import { Session } from "../models/sessionModel.js";
import { redisClient } from "../utils/redisClient.js";

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

export async function loginWithGoogle(req, res) {
  const { idToken } = req.body;
  const { name, email } = await verifyGoogleClient(idToken);
  const user = await User.findOne({ email, isDeleted: { $ne: true } }).select(
    "-__v +isPasswordSet",
  );

  if (user) {
    if (user.isPasswordSet && user.password) {
      // const sessions = await Session.find({ userId: user._id }).sort({
      //   createdAt: 1,
      // });

      // if (sessions.length >= 2) {
      //   const excessCount = sessions.length - 2 + 1;
      //   const sessionsToDelete = sessions.slice(0, excessCount);
      //   const idsToDelete = sessionsToDelete.map((s) => s._id);
      //   await Session.deleteMany({ _id: { $in: idsToDelete } });
      // }

      // const session = await Session.create({
      //   userId: user._id,
      //   purpose: "normal",
      // });

      const sessionRandomId = crypto.randomUUID();
      const redisKey = `session:${sessionRandomId}`;
      await redisClient.json.set(redisKey, "$", {
        userId: user._id,
        purpose: "normal",
      });

      await redisClient.expire(redisKey, 60 * 60);

      res.cookie("sid", sessionRandomId, {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
        maxAge: 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Logged in successfully",
        requiresPasswordSetup: false,
      });
    }

    // const session = await Session.create({
    //   userId: user._id,
    //   purpose: "password_setup",
    // });

    const sessionRandomId = crypto.randomUUID();
    const redisKey = `session:${sessionRandomId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id,
      purpose: "password_setup",
    });

    await redisClient.expire(redisKey, 60 * 60);

    res.cookie("sid", sessionRandomId, {
      httpOnly: true,
      sameSite: "lax",
      signed: true,
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Please set your account password",
      requiresPasswordSetup: true,
    });
  }

  const session = await mongoose.startSession();
  try {
    const rootFolderId = new Types.ObjectId();
    const newUserId = new Types.ObjectId();

    session.startTransaction();

    await Folder.create(
      [
        {
          _id: rootFolderId,
          name: `root-${email}`,
          parentFolderId: null,
          userId: newUserId,
        },
      ],
      { session },
    );

    await User.create(
      [
        {
          _id: newUserId,
          name,
          email,
          rootFolderId,
          isPasswordSet: false,
        },
      ],
      { session },
    );

    // const newSession = await Session.create({
    //   userId: newUserId,
    //   purpose: "password_setup",
    // });

    const newSessionRandomId = crypto.randomUUID();
    const redisKey = `session:${newSessionRandomId}`;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id,
      purpose: "password_setup",
    });

    res.cookie("sid", newSessionRandomId, {
      httpOnly: true,
      sameSite: "lax",
      signed: true,
      maxAge: 60 * 60 * 1000,
    });

    await session.commitTransaction();
    return res.status(201).json({
      message: "Google verification successful. Please set your password.",
      requiresPasswordSetup: true,
    });
  } catch (err) {
    await session.abortTransaction();

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(err.errors).map((e) => e.message),
      });
    }

    if (err.code === 11000 && err.keyValue?.email) {
      return res.status(409).json({
        message:
          "User with such email already exists, please try with another email",
      });
    }

    return res.status(500).json({
      message: "Internal server error while logging in with google oauth",
    });
  } finally {
    await session.endSession();
  }
}

export async function setPassword(req, res) {
  try {
    const userId = req.user?._id || req.userId;
    const { password } = req.body;

    if (!password || password.trim().length < 4) {
      return res
        .status(400)
        .json({ message: "Password must be at least 4 characters long." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.isPasswordSet && user.password) {
      return res
        .status(400)
        .json({ message: "Password is already set for this account." });
    }

    user.password = password;
    user.isPasswordSet = true;

    await user.save();

    // await Session.findByIdAndUpdate(req.authSession._id, { purpose: "normal" });
    const sessionKey = req.sessionKey || `${req.signedCookies?.sid}`;
    await redisClient.json.set(sessionKey, "$.purpose", "normal");

    return res.status(200).json({
      message:
        "Password set successfully! You can now log in with your email and password.",
    });
  } catch (err) {
    console.error("Error setting password:", err);
    return res
      .status(500)
      .json({ message: "Internal server error while setting password." });
  }
}
