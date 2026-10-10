import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  name: {
    type: String,
    minLength: 3,
    required: true,
  },
  rootFolderId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Folder",
  },
  email: {
    type: String,
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Not an valid email"],
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

export const User = mongoose.model("User", userSchema);
