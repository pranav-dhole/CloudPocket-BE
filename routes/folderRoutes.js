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
      folderName,
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
router.patch("/edit/:folderId", async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const folderData = foldersData.find((folder) => folder.id === folderId);

    const newFolderName = req.body.newFolderName;
    if (newFolderName === folderData.folderName) {
      return res.status(403).json({ msg: "Folder name denied" });
    }

    folderData.folderName = newFolderName;

    await writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2));
    res.status(200).json({ msg: "folder renamed successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error renaming directory" });
  }
});

router.get("/{:folderId}", async (req, res) => {
  try {
    const { folderId } = req.params;
    const folderData = folderId
      ? foldersData.find((folder) => folder.id === folderId)
      : foldersData[0];
    const files = folderData.files.map((folderFile) =>
      filesData.find((file) => file.id === folderFile.id),
    );

    const folders = folderData.folders
      .map((folderId) => foldersData.find((folder) => folder.id === folderId))
      .map(({ id, folderName }) => ({ id, folderName }));

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
