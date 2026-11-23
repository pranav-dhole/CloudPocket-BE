import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";
import { Types } from "mongoose";
import { redisClient } from "../utils/redisclient.js";

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

    // const session = await Session.findById(sid);
    const redisKey = `session:${sid}`;
    const session = await redisClient.json.get(redisKey);
    if (!session || session.purpose === "password_setup") {
      res.clearCookie("sid", {
        httpOnly: true,
        signed: true,
        sameSite: "lax",
      });
      return res.status(401).json({ message: "Authentication required" });
    }

    const loggedInUser = await User.findOne({
      _id: new Types.ObjectId(session.userId),
    }).lean();

    if (!loggedInUser || loggedInUser.isDeleted === true) {
      // await Session.findByIdAndDelete(sid);
      await redisClient.json.del(`session:${sid}`);

      res.clearCookie("sid", {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
      });

      return res.status(401).json({
        message:
          "Not an valid user OR your account is not avaliable, Contact administrator",
      });
    }

    req.user = loggedInUser;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Not an valid user" });
  }
}
