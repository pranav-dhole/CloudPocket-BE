import { User } from "../models/userModel.js";
import { Types } from "mongoose";
import crypto from "crypto";
import { cookieSecret } from "../controllers/userControllers.js";

export async function checkAuth(req, res, next) {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ message: "Not an valid user" });
  }

  const [payload, oldSignature] = token.split(".");
  const jsonPayload = Buffer.from(payload, "base64url").toString();
  const newSignature = crypto
    .createHash("sha256")
    .update(cookieSecret)
    .update(jsonPayload)
    .update(cookieSecret)
    .digest("base64url");

  if (oldSignature !== newSignature) {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });
    return res.status(401).json({ message: "Not an valid user" });
  }

  const { id, expiry: expiryTime } = JSON.parse(
    Buffer.from(payload, "base64url").toString(),
  );

  const currentTime = Math.round(Date.now() / 1000);
  if (currentTime > expiryTime) {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
    });
    return res.status(401).json({ message: "Not an valid user" });
  }

  const loggedInUser = await User.findOne({
    _id: new Types.ObjectId(id),
  }).lean();

  if (!loggedInUser) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  req.user = loggedInUser;
  next();
}
