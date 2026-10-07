import { ObjectId } from "mongodb";
import { User } from "../models/userModel.js";

export async function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  if (!uid) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  const db = req.db;
  const loggedInUser = await User.findOne({ _id: new ObjectId(uid) }).lean();

  if (!loggedInUser) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  req.user = loggedInUser;
  next();
}
