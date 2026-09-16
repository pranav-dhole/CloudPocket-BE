import { ObjectId } from "mongodb";

export default function idAuth(req, res, next, id) {
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid ID" });
  }
  next();
}
