import { Session } from "../models/sessionModel.js";
import { User } from "../models/userModel.js";

export async function checkPasswordSetup(req, res, next) {
  try {
    const { sid } = req.signedCookies;

    if (!sid) {
      return res.status(401).json({
        message: "Password setup authorization required.",
      });
    }

    // const session = await Session.findById(sid);
    const redisKey = `session:${sid}`;
    const session = await redisClient.json.get(redisKey);

    if (!session || session.purpose !== "password_setup") {
      return res.status(403).json({
        message: "Invalid password setup session.",
      });
    }

    const user = await User.findById(session.userId);

    if (!user || user.isDeleted === true) {
      // await Session.findByIdAndDelete(sid);
      await redisClient.json.del(`session:${sid}`);

      res.clearCookie("sid", {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
      });

      return res.status(401).json({
        message: "Account unavailable.",
      });
    }

    if (user.isPasswordSet && user.password) {
      return res.status(403).json({
        message: "Password is already set.",
      });
    }

    req.user = user;
    req.authSession = session;
    req.sessionKey = redisKey;

    next();
  } catch (err) {
    console.error("Password setup authentication error:", err);

    return res.status(500).json({
      message: "Unable to verify password setup authorization.",
    });
  }
}
