import { User } from "../models/userModel.js";
import { Folder } from "../models/folderModel.js";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";
import { Session } from "../models/sessionModel.js";

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

    await User.create(
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
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const isPasswordCorrect = await user.comparePassword(String(password));
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const sessions = await Session.find({ userId: user._id }).sort({
      createdAt: 1,
    });
    if (sessions.length >= 2) {
      const excessCount = sessions.length - 2 + 1;
      const sessionsToDelete = sessions.slice(0, excessCount);
      const idsToDelete = sessionsToDelete.map((s) => s._id);
      await Session.deleteMany({ _id: { $in: idsToDelete } });
    }

    const session = await Session.create({ userId: user._id });
    res.cookie("sid", session._id, {
      httpOnly: true,
      sameSite: "lax",
      signed: true,
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

export async function logoutUser(req, res) {
  const { sid } = req.signedCookies;
  if (sid) {
    await Session.findByIdAndDelete(sid);
  }

  res.clearCookie("sid", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return res.status(200).json({ message: "Logged out successfully" });
}

export async function logoutUsers(req, res) {
  const { sid } = req.signedCookies;
  const session = await Session.findById(sid);

  if (session) {
    await Session.deleteMany({ userId: session.userId });
  }
  res.clearCookie("sid", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return res
    .status(200)
    .json({ message: "Logged out successfully from all devices" });
}

export function userBasicInfo(req, res) {
  return res.status(200).json({ name: req.user.name, email: req.user.email });
}
