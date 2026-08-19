import express from "express";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import path, { join } from "path";
import { isPathSafe, STORAGE_PATH } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import foldersData from "../foldersDB.json" with { type: "json" };
import { getFolderContentsRecursive } from "../utils/getFolderContentsRecursive.js";

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

router.delete("/delete/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const targetFolder = foldersData.find((folder) => folder.id === folderId);

    const { folderIds, fileIds } = getFolderContentsRecursive(
      folderId,
      foldersData,
    );

    for (const fileId of fileIds) {
      const fileData = filesData.find((f) => f.id === fileId);
      if (fileData) {
        try {
          const filePath = `${STORAGE_PATH}/${fileData.id}${fileData.fileExtension}`;
          await rm(filePath, { force: true, recursive: true });
        } catch (err) {
          console.warn(err);
          res.status(500).json({
            message:
              "something went wrong while deleting files from file id's data",
          });
        }
      }
    }

    for (let i = filesData.length - 1; i >= 0; i--) {
      if (fileIds.includes(filesData[i].id)) {
        filesData.splice(i, 1);
      }
    }
    for (let i = foldersData.length - 1; i >= 0; i--) {
      if (folderIds.includes(foldersData[i].id)) {
        foldersData.splice(i, 1);
      }
    }

    if (targetFolder.parentFolderId) {
      const parentFolder = foldersData.find(
        (folder) => folder.id === targetFolder.parentFolderId,
      );
      if (parentFolder) {
        parentFolder.folders = parentFolder.folders.filter(
          (dirId) => dirId !== folderId,
        );
      }
    }

    await Promise.all([
      writeFile("./filesDB.json", JSON.stringify(filesData, null, 2)),
      writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2)),
    ]);

    res
      .status(200)
      .json({ message: "Folder and contents deleted successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Something went wrong while deleting folder" });
  }
});

export default router;
