import { User } from "../models/userModel.js";
import { Folder } from "../models/folderModel.js";
import { File } from "../models/fileModel.js";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";
import { Session } from "../models/sessionModel.js";
import { OTP } from "../models/Otpmodel.js";
import { rm } from "fs/promises";
import { getFolderContentsRecursive } from "../utils/getFolderContentsRecursive.js";
import { STORAGE_PATH } from "../utils/paths.js";

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

    const otpDocument = await OTP.findOne({ email, verified: true }).session(
      session,
    );
    if (!otpDocument) {
      return res
        .status(400)
        .json({ message: "Email not verified. Please verify OTP first." });
    }

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

    await otpDocument.deleteOne({ session });
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
    const user = await User.findOne({ email, isDeleted: { $ne: true } });
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
      maxAge: 60 * 60 * 1000,
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
  try {
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
  } catch (err) {
    console.error("Logout All Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export function userBasicInfo(req, res) {
  return res
    .status(200)
    .json({ name: req.user.name, email: req.user.email, role: req.user.role });
}

export async function allUsersInfo(req, res) {
  try {
    if (req.user.role !== "User") {
      const currentUserId = req.user._id;
      const allUsers = await User.find({
        _id: { $ne: currentUserId },
        role: { $ne: "Admin" },
        isDeleted: false,
      })
        .lean()
        .select("name email _id");
      const allSessions = await Session.find().lean().select("userId");
      const allSessionsSet = new Set(
        allSessions.map(({ userId }) => userId.toString()),
      );

      const transformedUsers = allUsers.map(({ _id, name, email }) => ({
        id: _id.toString(),
        name,
        email,
        isLoggedIn: allSessionsSet.has(_id.toString()),
      }));

      return res.status(200).json(transformedUsers);
    }

    return res
      .status(403)
      .json({ message: "You are not authorized to access this page" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error while fetching all users data" });
  }
}

export async function logoutByAdmin(req, res) {
  try {
    if (req.user.role === "User") {
      return res
        .status(403)
        .json({ message: "You are not authorized to logout users" });
    }
    const { userId } = req.body;
    await Session.deleteMany({ userId });
    return res.status(200).json({ message: "Logged out user successfully" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error while logging out user through admin auth" });
  }
}

export async function deleteByAdmin(req, res) {
  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete users" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required in request body" });
    }

    const currentAdminId = req.user._id?.toString() || req.user.id;
    if (userId === currentAdminId) {
      return res.status(400).json({
        message: "Action denied: You cannot delete your own account.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Session.deleteMany({ userId });

    if (user.rootFolderId) {
      const folder = await Folder.findById(user.rootFolderId);

      if (folder) {
        const folderObjectId = folder._id;

        const targetFolder = await Folder.findById(folderObjectId)
          .lean()
          .select("userId");

        if (!targetFolder)
          return res.status(404).json({ message: "Folder doesnt exist" });

        if (!targetFolder.userId.equals(userId)) {
          return res
            .status(403)
            .json({ message: "You are not authorized to delete this folder" });
        }

        const { folderIds, fileIds } = await getFolderContentsRecursive(
          folderObjectId,
          userId,
        );

        for (const file of fileIds) {
          try {
            const filePath = `${STORAGE_PATH}/${file._id}${file.fileExtension}`;
            await rm(filePath, { force: true, recursive: true });
          } catch (err) {
            console.warn(err);
            return res.status(500).json({
              message:
                "Error occured while deleting files from folder deletion",
            });
          }
        }

        const extractedFileIds = fileIds.map((file) => file._id);
        await Promise.all([
          File.deleteMany({ _id: { $in: extractedFileIds } }),
          Folder.deleteMany({ _id: { $in: folderIds } }),
        ]);
      }
    }

    await user.deleteOne();

    return res.status(200).json({ message: "Deleted user successfully" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error while deleting user through admin auth" });
  }
}

export async function softDeleteByAdmin(req, res) {
  try {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to soft delete users" });
    }

    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ message: "userId is required in request body" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Session.deleteMany({ userId });

    return res.status(200).json({ message: "User soft deleted successfully" });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: "Error while soft deleting user through admin auth" });
  }
}
