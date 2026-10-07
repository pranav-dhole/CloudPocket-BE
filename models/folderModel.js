import mongoose, { Schema } from "mongoose";

const folderSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  parentFolderId: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: "Folder",
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

export const Folder = mongoose.model("Folder", folderSchema);
