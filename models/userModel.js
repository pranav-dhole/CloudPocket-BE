import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

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

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    console.log("err while saving DOC: ", err);
    next(err);
  }
});

userSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

export const User = mongoose.model("User", userSchema);
