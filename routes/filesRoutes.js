import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import { STORAGE_PATH } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import foldersData from "../foldersDB.json" with { type: "json" };
import { extension } from "mime-types";
import crypto from "crypto";

const router = express.Router();

// file deleting logic
router.delete("/delete/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileIdx = filesData.findIndex((file) => file.id === fileId);

    if (fileIdx < 0 || fileIdx === undefined || fileIdx === null)
      return res.status(404).json({ message: "File doesnt exist" });
    const fileData = filesData[fileIdx];
    const filePath = path.join(STORAGE_PATH, fileId + fileData.fileExtension);

    filesData.splice(fileIdx, 1);
    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );

    if (!parentFolderData)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    parentFolderData.files = parentFolderData.files.filter(
      (id) => id !== fileId,
    );

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);

    await rm(filePath, {
      recursive: true,
    });
    return res.status(200).json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error while deleting the file" });
  }
});

// getting files from path
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const fileData = filesData.find((file) => file.id === id);
  if (!fileData) {
    return res.status(404).json({ message: "File not found!" });
  }

  const filePath = `${STORAGE_PATH}/${id}${fileData.fileExtension}`;
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

// handling the posted files from the client
router.post("/upload/{:parentFolderId}", async (req, res) => {
  try {
    const parentFolderId = req.params.parentFolderId || foldersData[0].id;
    const fileName = req.headers.filename;
    if (!fileName)
      return res.status(400).json({ message: "Filename is required" });

    const decodedFileName = decodeURIComponent(fileName);
    const id = crypto.randomUUID();
    const sanitizedBaseName = path.basename(decodedFileName);
    const fileExtension = path.extname(sanitizedBaseName);
    const fullFileName = id + fileExtension;

    const writeStream = createWriteStream(
      path.join(STORAGE_PATH, fullFileName),
    );
    await pipeline(req, writeStream);

    const newRecord = {
      id,
      fileExtension,
      fileName: decodedFileName,
      parentFolderId,
    };

    filesData.push(newRecord);

    const fileParentFolder = foldersData.find(
      (folder) => folder.id === parentFolderId,
    );

    if (!fileParentFolder)
      return res.status(404).json({ message: "Parent folder doesnt exist" });
    fileParentFolder.files.push(id);

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);
    return res.status(201).json({ message: "File created successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while uploading file" });
  }
});

// handling file rename stuff
router.patch("/edit/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileData = filesData.find((file) => file.id === fileId);
    if (!fileData || fileData === -1)
      return res.status(404).json({ message: "File doesnt exist" });

    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );
    if (!parentFolderData || parentFolderData === -1)
      return res.status(404).json({ message: "Parent folder doesnt exist" });

    const folderData = parentFolderData.files.find(
      (file) => file.id === fileId,
    );
    if (!folderData || folderData === -1)
      return res
        .status(404)
        .json({ message: "File doesnt exist in parent folder" });

    const newFileName = req.body.newFileName;
    if (newFileName === fileData.fileName) {
      return res.status(403).json({ message: "Filename denied" });
    } else if (!newFileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    fileData.fileName = newFileName;
    folderData.fileName = newFileName;

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);

    return res.status(200).json({ message: "File renamed successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while renaming file" });
  }
});

export default router;
