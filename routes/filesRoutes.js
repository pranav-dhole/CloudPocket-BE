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
      (folderFileId) => folderFileId !== fileId,
    );
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    await writeFile("./foldersDB.json", JSON.stringify(foldersData));

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
router.get("/{:fileId}", async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      const folderData = foldersData[0];
      const files = folderData.files.map((file) =>
        filesData.find((file) => file.id === file.id),
      );

      res.json({ ...folderData, files });
    } else {
      const folderData = foldersData.find((folder) => folder.id === fileId);
      res.json(folderData);
    }
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error reading directory" });
  }
});

// handling the posted files from the client
router.post("/upload/{*folderpath}", async (req, res) => {
  try {
    let rawPath = req.params.folderpath;
    const relativePath = Array.isArray(rawPath)
      ? rawPath.join("/")
      : rawPath || "/";

    const fileName = req.headers.filename;
    if (fileName === "/" || fileName === `\\` || fileName === "..") {
      return res.status(403).json({ msg: "Filename denied" });
    }

    const id = crypto.randomUUID();
    const fileExtension = path.extname(fileName);
    const fullFileName = id + fileExtension;
    const decodedPath = decodeURIComponent(
      path.join(relativePath, fullFileName),
    );

    const filePath = resolveSafePath(decodedPath);
    if (!isPathSafe(filePath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const targetDir = path.dirname(filePath);
    await mkdir(targetDir, { recursive: true });

    const writeStream = createWriteStream(filePath);
    await pipeline(req, writeStream);

    const parentFolderId = req.headers.parentfolderid || foldersData[0].id;
    const newRecord = {
      id,
      fileExtension,
      fileName,
      parentFolderId,
    };

    filesData.push(newRecord);
    await writeFile("./filesDB.json", JSON.stringify(filesData));

    const fileParentFolder = foldersData.find(
      (folder) => folder.id === parentFolderId,
    );
    fileParentFolder.files.push(newRecord);
    await writeFile("./foldersDB.json", JSON.stringify(foldersData));
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

export default router;
