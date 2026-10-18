import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import { Types } from "mongoose";

export async function checkAuth(req, res, next) {
  try {
    const { sid } = req.signedCookies;
    if (!sid) {
      res.clearCookie("sid", {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
      });
      return res.status(401).json({ message: "Not an valid user" });
    }

    const session = await Session.findById(sid);
    if (!session) {
      res.clearCookie("sid", {
        httpOnly: true,
        signed: true,
        sameSite: "lax",
      });
      return res.status(401).json({ message: "Not an valid user" });
    }

    const loggedInUser = await User.findOne({
      _id: new Types.ObjectId(session.userId),
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
