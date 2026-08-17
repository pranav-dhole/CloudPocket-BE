import express from "express";
import { mkdir, rename, writeFile } from "fs/promises";
import path, { join } from "path";
import { isPathSafe, STORAGE_PATH } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import foldersData from "../foldersDB.json" with { type: "json" };

const router = express.Router();

// handling new folder creation logic
router.post("/create/{:parentFolderId}", async (req, res) => {
  try {
    const parentFolderId = req.params.parentFolderId || foldersData[0].id;
    const folderName = req.headers.foldername;

    if (!folderName) {
      return res.status(400).json({ msg: "Folder name parameter is missing" });
    }

    const id = crypto.randomUUID();
    const parentFolder = foldersData.find(
      (folder) => folder.id === parentFolderId,
    );

    const newFolderData = {
      id,
      name: folderName,
      parentFolderId: parentFolderId,
      files: [],
      folders: [],
    };

    parentFolder.folders.push(id);
    foldersData.push(newFolderData);
    await writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2));

    res.status(200).json({ msg: "Folder created successfully", newFolderData });
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
    if (newFileName === fileData.name) {
      return res.status(403).json({ msg: "Filename denied" });
    }

    fileData.name = newFileName;

    const parentFolderData = foldersData.find(
      (folder) => folder.id === fileData.parentFolderId,
    );
    const folderFileData = parentFolderData.files.find(
      (file) => file.id === relativePath,
    );
    folderFileData.name = newFileName;

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

router.get("/{:fileId}", async (req, res) => {
  try {
    const { fileId } = req.params;
    const folderData = fileId
      ? foldersData.find((folder) => folder.id === fileId)
      : foldersData[0];
    const files = folderData.files.map((folderFile) =>
      filesData.find((file) => file.id === folderFile.id),
    );

    const folders = folderData.folders
      .map((folderId) => foldersData.find((folder) => folder.id === folderId))
      .map(({ id, name }) => ({ id, name }));

    res.json({ ...folderData, files, folders });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error reading directory" });
  }
});

export default router;
