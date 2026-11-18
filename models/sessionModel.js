import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60,
  },
  purpose: {
    type: String,
    enum: ["normal", "password_setup"],
    default: "normal",
  },
});

export const Session = mongoose.model("Session", sessionSchema);
