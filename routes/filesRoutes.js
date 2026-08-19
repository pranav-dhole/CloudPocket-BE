import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import { isPathSafe, resolveSafePath, STORAGE_PATH } from "../utils/paths.js";
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
    const fileData = filesData[fileIdx];
    const filePath = path.join(STORAGE_PATH, fileId + fileData.fileExtension);

    filesData.splice(fileIdx, 1);
    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );
    parentFolderData.files = parentFolderData.files.filter(
      (folderFile) => folderFile.id !== fileId,
    );

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);

    await rm(filePath, {
      recursive: true,
    });
    res.status(200).json({ msg: "file deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(404).json({ msg: "Error while deleting the file" });
  }
});

// getting files from path
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const fileData = filesData.find((file) => file.id === id);
  if (!fileData) {
    return res.status(404).json({ error: "File record not found!" });
  }

  const filePath = `${STORAGE_PATH}/${id}${fileData.fileExtension}`;
  if (req.query.action === "download") {
    res.set("Content-Disposition", `attachment; filename=${fileData.fileName}`);
  }
  res.sendFile(filePath, (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found on disk!" });
      }
    }
  });
});

// handling the posted files from the client
router.post("/upload/{:parentFolderId}", async (req, res) => {
  try {
    const parentFolderId = req.params.parentFolderId || foldersData[0].id;
    const fileName = req.headers.filename;
    console.log({ fileName, parentFolderId });

    const decodedFileName = decodeURIComponent(fileName);
    const id = crypto.randomUUID();
    const fileExtension = path.extname(decodedFileName);
    const fullFileName = id + fileExtension;

    const filePath = resolveSafePath(fullFileName);
    if (!isPathSafe(filePath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const writeStream = createWriteStream(filePath);
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
    fileParentFolder.files.push(newRecord);

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);
    res
      .status(200)
      .json({ msg: "file created successfully", record: newRecord });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error writing directory" });
  }
});

// handling file rename stuff
router.patch("/edit/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileData = filesData.find((file) => file.id === fileId);
    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );
    const folderData = parentFolderData.files.find(
      (file) => file.id === fileId,
    );

    const newFileName = req.body.newFileName;
    if (newFileName === fileData.fileName) {
      return res.status(403).json({ msg: "Filename denied" });
    }

    fileData.fileName = newFileName;
    folderData.fileName = newFileName;

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);

    res.status(200).json({ msg: "file renamed successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "File not found" });
    }
    res.status(500).json({ msg: "Error renaming file" });
  }
});

export default router;
