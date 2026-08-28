import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import foldersData from "../foldersDB.json" with { type: "json" };
import usersData from "../usersDB.json" with { type: "json" };
import crypto from "crypto";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const isEmailPresent = usersData.find((user) => user.email === email);

  if (isEmailPresent) {
    return res.status(409).json({
      message:
        "User with such email already exists, please try with another email",
    });
  }

  const userId = crypto.randomUUID();
  const folderId = crypto.randomUUID();

  foldersData.push({
    id: folderId,
    name: `root-${email}`,
    userId,
    parentFolderId: null,
    files: [],
    folders: [],
  });

  usersData.push({
    id: userId,
    name,
    email,
    password,
    rootFolderId: folderId,
  });

  await Promise.all([
    writeFile("./usersDB.json", JSON.stringify(usersData, null, 2)),
    writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
  ]);
  return res.status(201).json({ message: "Account registered successfully" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = usersData.find((user) => user.email === email);
  const uid = user.id;

  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }

  res.cookie("uid", uid, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 1000 * 60,
  });

  return res.status(201).json({ message: "Logged in successfully" });
});

export default router;
