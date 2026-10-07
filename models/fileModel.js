import mongoose, { Schema } from "mongoose";

const fileSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  parentFolderId: {
    type: Schema.Types.ObjectId,
    default: null,
    ref: "Folder",
  },
  fileExtension: {
    type: String,
    required: true,
  },
});

export const File = mongoose.model("File", fileSchema);
