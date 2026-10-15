import { User } from "../models/userModel.js";
import { Types } from "mongoose";

export async function checkAuth(req, res, next) {
  try {
    const { token } = req.signedCookies;
    if (!token) {
      res.clearCookie({
        httpOnly: true,
        sameSite: "lax",
        signed: true,
      });
      return res.status(401).json({ message: "Not an valid user" });
    }

    const { id, expiry: expiryTime } = JSON.parse(
      Buffer.from(token, "base64url").toString(),
    );

    const currentTime = Math.round(Date.now() / 1000);
    if (currentTime > expiryTime) {
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
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
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Not an valid user" });
  }
}
