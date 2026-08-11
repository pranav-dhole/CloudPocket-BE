import express from "express";
import { mkdir, rename, writeFile } from "fs/promises";
import path, { join } from "path";
import { isPathSafe, STORAGE_PATH } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import foldersData from "../foldersDB.json" with { type: "json" };

const router = express.Router();

// handling new folder creation logic
router.post("/create/*foldername", async (req, res) => {
  try {
    const rawPath = req.params.foldername;

    if (!rawPath) {
      return res
        .status(400)
        .json({ msg: "Folder name/path parameter is missing" });
    }

    const relativePath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;

    const basePath = req.headers["filecreatepath"];
    const decodedPath = decodeURIComponent(relativePath);
    const folderPath = path.join(basePath, decodedPath);
    const finalFullPath = path.join(STORAGE_PATH, folderPath);
    if (!isPathSafe(finalFullPath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    await mkdir(finalFullPath, { recursive: true });
    res
      .status(200)
      .json({ msg: "Folder created successfully", path: finalFullPath });
  } catch (err) {
    console.error(err);
    res.status(404).json({ msg: "Error while creating an folder", err: err });
  }
});

// handling file rename stuff
router.patch("/edit/:fileId", async (req, res) => {
  try {
    const rawPath = req.params.fileId;
    const relativePath = Array.isArray(rawPath)
      ? rawPath.join("/")
      : rawPath || "";
    const fileData = filesData.find((file) => file.id === relativePath);

    const newFileName = req.body.newFileName;
    if (newFileName === fileData.fileName) {
      return res.status(403).json({ msg: "Filename denied" });
    }

    fileData.fileName = newFileName;

    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );
    const folderFileData = parentFolderData.files.find(
      (file) => file.id === relativePath,
    );
    folderFileData.fileName = newFileName;

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);
    res.status(200).json({ msg: "file renamed successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error renaming directory" });
  }
});

router.get("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      const folderData = foldersData[0];
      const files = folderData.files.map((folderFile) =>
        filesData.find((file) => file.id === folderFile.id),
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

export default router;
