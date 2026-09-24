import express from "express";
import { checkAuth } from "../middlewares/authMiddleware.js";
import { ObjectId } from "mongodb";
import { client } from "../database.js";

const router = express.Router();

// handling the registeration of an new user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      message: "Name must be at least 3 characters long",
    });
  }
  const db = req.db;

  const session = client.startSession();
  try {
    const isEmailPresent = await db.collection("users").findOne({ email });
    if (isEmailPresent) {
      return res.status(409).json({
        message:
          "User with such email already exists, please try with another email",
      });
    }
    const rootFolderId = new ObjectId();
    const newUserId = new ObjectId();

    session.startTransaction();
    const rootFolder = await db.collection("folders").insertOne(
      {
        _id: rootFolderId,
        name: `root-${email}`,
        parentFolderId: null,
        userId: newUserId,
      },
      { session },
    );

    const newUser = await db.collection("users").insertOne(
      {
        _id: newUserId,
        name,
        email,
        password,
        rootFolderId,
      },
      { session },
    );

    await session.commitTransaction();
    return res.status(201).json({ message: "Account registered successfully" });
  } catch (err) {
    await session.abortTransaction();
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ message: "Internal server error while registering" });
  } finally {
    await session.endSession();
  }
});

// handling login of an registered user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const db = req.db;
  try {
    const user = await db.collection("users").findOne({ email, password });

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    res.cookie("uid", user._id.toString(), {
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
});

// handling logout of an registered user
router.post("/logout", (req, res) => {
  res.clearCookie("uid", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

// getting basic user info i.e name and email to display on its profile
router.get("/", checkAuth, (req, res) => {
  return res.status(200).json({ name: req.user.name, email: req.user.email });
});

export default router;
