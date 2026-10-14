import { User } from "../models/userModel.js";
import { Folder } from "../models/folderModel.js";
import mongoose, { Types } from "mongoose";
import crypto from "crypto";

export const cookieSecret = "CLOUDPOCKETDADA";

export async function registerUser(req, res) {
  const { name, email, password } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      message: "Name must be at least 3 characters long",
    });
  }

  const session = await mongoose.startSession();
  try {
    const rootFolderId = new Types.ObjectId();
    const newUserId = new Types.ObjectId();

    session.startTransaction();
    const rootFolder = await Folder.create(
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

    const newUser = await User.create(
      [
        {
          _id: newUserId,
          name,
          email,
          password,
          rootFolderId,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return res.status(201).json({ message: "Account registered successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.log("Registration error:", err);

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

    return res
      .status(500)
      .json({ message: "Internal server error while registering" });
  } finally {
    await session.endSession();
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password }).lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const cookiePayload = JSON.stringify({
      id: user._id.toString(),
      expiry: Math.round(Date.now() / 1000 + 60 * 60),
    });

    const signature = crypto
      .createHash("sha256")
      .update(cookieSecret)
      .update(cookiePayload)
      .update(cookieSecret)
      .digest("base64url");

    const signaturePayload = `${Buffer.from(cookiePayload).toString("base64url")}.${signature}`;

    res.cookie("token", signaturePayload, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 1000 * 60,
    });

    return res.status(201).json({ message: "Logged in successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Internal server error while logging in" });
  }
}

export function logoutUser(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return res.status(200).json({ message: "Logged out successfully" });
}

export function userBasicInfo(req, res) {
  return res.status(200).json({ name: req.user.name, email: req.user.email });
}
