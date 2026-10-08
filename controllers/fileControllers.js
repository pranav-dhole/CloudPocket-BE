import { createWriteStream } from "fs";
import { rm, unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import { STORAGE_PATH } from "../utils/paths.js";
import idAuth from "../middlewares/idAuthMiddleware.js";
import { File } from "../models/fileModel.js";
import { Folder } from "../models/folderModel.js";
import { Types } from "mongoose";

export async function deleteFile(req, res) {
  try {
    const { fileId } = req.params;
    const fileObjectId = new Types.ObjectId(fileId);
    const fileData = await File.findOne({ _id: fileObjectId }).lean();
    if (!fileData) {
      return res.status(404).json({ message: "File doesnt exist" });
    }
    const filePath = path.join(STORAGE_PATH, fileId + fileData?.fileExtension);

    const parentFolderData = await Folder.find({
      _id: fileData.parentFolderId,
    }).lean();

    if (!parentFolderData)
      return res.status(404).json({ message: "Parent folder doesnt exist" });

    await File.deleteOne({ _id: fileObjectId });
    await rm(filePath, {
      recursive: true,
    });

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error while deleting the file" });
  }
}

export async function getFile(req, res) {
  const { fileId } = req.params;
  const fileObjectId = new Types.ObjectId(fileId);
  const fileData = await File.findOne({ _id: fileObjectId }).lean();
  if (!fileData) {
    return res.status(404).json({ message: "File not found!" });
  }

  const parentFolder = await Folder.findOne({
    _id: new Types.ObjectId(fileData.parentFolderId),
  })
    .lean()
    .select("userId");
  if (!parentFolder.userId.equals(req.user._id)) {
    return res
      .status(401)
      .json({ message: "You are not authorized to view this file" });
  }

  const filePath = `${STORAGE_PATH}/${fileId}${fileData.fileExtension}`;
  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename=${fileData.name}`);
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      if (!res.headersSent) {
        return res.status(500).json({ message: "File not found on disk!" });
      }
    }
  });
}

export async function postFile(req, res) {
  let createdFileId = null;
  let filePath = null;
  try {
    const parentFolderId = req.params.parentFolderId || req.user.rootFolderId;
    const parentFolderObjectId = new Types.ObjectId(parentFolderId);
    const parentFolder = await Folder.findOne({
      _id: parentFolderObjectId,
    })
      .lean()
      .select("userId");
    if (!parentFolder)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    if (!parentFolder.userId.equals(req.user._id)) {
      return res
        .status(401)
        .json({ message: "You are not authorized to upload this file" });
    }

    const fileName = req.headers.filename;
    if (!fileName)
      return res.status(400).json({ message: "Filename is required" });

    const decodedFileName = decodeURIComponent(fileName);
    const sanitizedBaseName = path.basename(decodedFileName);
    const fileExtension = path.extname(sanitizedBaseName);

    const newFileRecord = await File.create({
      fileExtension,
      name: decodedFileName,
      parentFolderId: parentFolderObjectId,
    });
    createdFileId = newFileRecord._id;
    const fullFileName = createdFileId.toString() + fileExtension;
    filePath = path.join(STORAGE_PATH, fullFileName);
    const writeStream = createWriteStream(filePath);

    req.on("aborted", () => {
      writeStream.destroy();
    });
    await pipeline(req, writeStream);

    return res.status(201).json({ message: "File created successfully" });
  } catch (err) {
    console.error(err);
    if (filePath) await unlink(filePath).catch(() => null);
    if (createdFileId) {
      await File.deleteOne({ _id: createdFileId }).catch(console.error);
    }
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Error occured while uploading file" });
    }
  }
}

export async function editFile(req, res) {
  try {
    const { fileId } = req.params;
    const fileObjectId = new Types.ObjectId(fileId);
    const fileData = await File.findOne({ _id: fileObjectId }).lean();
    if (!fileData)
      return res.status(404).json({ message: "File doesnt exist" });

    const parentFolder = await Folder.findOne({
      _id: new Types.ObjectId(fileData.parentFolderId),
    })
      .lean()
      .select("userId");
    if (!parentFolder)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    if (!parentFolder.userId.equals(req.user._id)) {
      return res
        .status(401)
        .json({ message: "You are authorizeed to edit this file" });
    }

    const newFileName = req.body.newFileName;
    if (newFileName === fileData.name) {
      return res.status(403).json({ message: "Filename denied" });
    } else if (!newFileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    await File.updateOne(
      { _id: fileObjectId },
      { $set: { name: newFileName } },
    );

    return res.status(200).json({ message: "File renamed successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while renaming file" });
  }
}
