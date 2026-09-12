import { ObjectId } from "mongodb";

export async function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  if (!uid) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  const db = req.db;
  const loggedInUser = await db
    .collection("users")
    .findOne({ _id: new ObjectId(uid) });

  if (!loggedInUser) {
    return res.status(401).json({ message: "Not an valid user" });
  }
  req.user = loggedInUser;
  next();
}
