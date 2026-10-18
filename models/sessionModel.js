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
});

export const Session = mongoose.model("Session", sessionSchema);
