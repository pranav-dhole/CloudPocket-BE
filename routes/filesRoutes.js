import express from "express";
import { createWriteStream } from "fs";
import { rm, unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import { STORAGE_PATH } from "../utils/paths.js";
import idAuth from "../middlewares/idAuthMiddleware.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// router.param("parentFolderId", idAuth);
// router.param("fileId", idAuth);

// deleting the file using given fileId
router.delete("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileObjectId = new ObjectId(fileId);
    const db = req.db;
    const fileData = await db
      .collection("files")
      .findOne({ _id: fileObjectId });
    if (!fileData) {
      return res.status(404).json({ message: "File doesnt exist" });
    }
    const filePath = path.join(STORAGE_PATH, fileId + fileData?.fileExtension);

    const parentFolderData = await db
      .collection("folders")
      .find({ _id: fileData.parentFolderId });

    if (!parentFolderData)
      return res.status(404).json({ message: "Parent folder doesnt exist" });

    await db.collection("files").deleteOne({ _id: fileObjectId });
    await rm(filePath, {
      recursive: true,
    });

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error while deleting the file" });
  }
});

// getting files from given fileId
router.get("/:fileId", async (req, res) => {
  const { fileId } = req.params;
  const fileObjectId = new ObjectId(fileId);
  const db = req.db;
  const fileData = await db.collection("files").findOne({ _id: fileObjectId });
  if (!fileData) {
    return res.status(404).json({ message: "File not found!" });
  }

  const parentFolder = await db
    .collection("folders")
    .findOne({ _id: new ObjectId(fileData.parentFolderId) });
  if (parentFolder.userId.toString() !== req.user._id.toString()) {
    return res
      .status(401)
      .json({ message: "You are not authorized to view this file" });
  }

  const filePath = `${STORAGE_PATH}/${fileId}${fileData.fileExtension}`;
  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename=${fileData.fileName}`);
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      if (!res.headersSent) {
        return res.status(500).json({ message: "File not found on disk!" });
      }
    }
  });
});

// handling the posted files from the client using its parentFolderId
router.post("/{:parentFolderId}", async (req, res) => {
  let createdFileId = null;
  let filePath = null;
  try {
    const parentFolderId = req.params.parentFolderId || req.user.rootFolderId;
    const parentFolderObjectId = new ObjectId(parentFolderId);
    const db = req.db;
    const parentFolder = await db
      .collection("folders")
      .findOne({ _id: parentFolderObjectId });
    if (!parentFolder)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    if (parentFolder.userId.toString() !== req.user._id.toString()) {
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

    const newFileRecord = await db.collection("files").insertOne({
      fileExtension,
      fileName: decodedFileName,
      parentFolderId: parentFolderObjectId,
    });
    createdFileId = newFileRecord.insertedId;
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
      await req.db
        .collection("files")
        .deleteOne({ _id: createdFileId })
        .catch(console.error);
    }
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ message: "Error occured while uploading file" });
    }
  }
});

// handling file rename using given fileId
router.patch("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileObjectId = new ObjectId(fileId);
    const db = req.db;
    const fileData = await db
      .collection("files")
      .findOne({ _id: fileObjectId });
    if (!fileData)
      return res.status(404).json({ message: "File doesnt exist" });

    const parentFolder = await db
      .collection("folders")
      .findOne({ _id: new ObjectId(fileData.parentFolderId) });
    if (!parentFolder)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    if (parentFolder.userId.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "You are authorizeed to edit this file" });
    }

    const newFileName = req.body.newFileName;
    if (newFileName === fileData.fileName) {
      return res.status(403).json({ message: "Filename denied" });
    } else if (!newFileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    await db
      .collection("files")
      .updateOne({ _id: fileObjectId }, { $set: { fileName: newFileName } });

    return res.status(200).json({ message: "File renamed successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while renaming file" });
  }
});

export default router;
