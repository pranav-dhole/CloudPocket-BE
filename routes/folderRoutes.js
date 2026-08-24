import express from "express";
import { mkdir, rename, rm, writeFile } from "fs/promises";
import path, { join } from "path";
import { STORAGE_PATH } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import foldersData from "../foldersDB.json" with { type: "json" };
import { getFolderContentsRecursive } from "../utils/getFolderContentsRecursive.js";

const router = express.Router();

// handling new folder creation logic
router.post("/create/{:parentFolderId}", async (req, res) => {
  try {
    const parentFolderId = req.params.parentFolderId || foldersData?.[0]?.id;
    if (!parentFolderId)
      return res
        .status(400)
        .json({ message: "No default parent folder available" });

    const folderName =
      (req.headers.foldername && req.headers.foldername.trim()) || "New Folder";
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

    parentFolder.folders?.push(id);
    foldersData.push(newFolderData);
    await writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2));

    return res.status(201).json({ message: "Folder created successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while creating an folder" });
  }
});

// handling file rename stuff
router.patch("/edit/:folderId", async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const folderData = foldersData.find((folder) => folder.id === folderId);
    if (!folderData || folderData === -1)
      return res.status(404).json({ message: "Folder doesnt exist" });

    const newFolderName = req.body.newFolderName;
    if (newFolderName === folderData.folderName) {
      return res.status(403).json({ message: "Folder name denied" });
    } else if (!newFolderName || !newFolderName.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    folderData.folderName = newFolderName;

    await writeFile("./foldersDB.json", JSON.stringify(foldersData, null, 2));
    return res.status(200).json({ message: "Folder renamed successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while renaming folder" });
  }
});

router.get("/{:folderId}", async (req, res) => {
  try {
    const { folderId } = req.params;
    const folderData = folderId
      ? foldersData.find((folder) => folder.id === folderId)
      : foldersData[0];
    if (!folderData || folderData === -1)
      return res.status(404).json({ message: "Folder doesnt exist" });

    const resolvedFiles = folderData.files?.map((id) =>
      filesData.find((file) => file.id === id),
    );

    const resolvedFolders = folderData.folders.map((id) =>
      foldersData.find((folder) => folder.id === id),
    );

    const hasResolvedFiles =
      !resolvedFiles || resolvedFiles.includes(undefined);
    const hasResolvedFolders =
      !resolvedFolders || resolvedFolders.includes(undefined);

    if (hasResolvedFiles || hasResolvedFolders)
      return res
        .status(404)
        .json({ message: "One or more files OR folders dont exist" });

    const files = resolvedFiles.map(({ id, fileName }) => ({
      id,
      fileName,
    }));
    const folders = resolvedFolders.map(({ id, folderName }) => ({
      id,
      folderName,
    }));

    return res.status(200).json({ ...folderData, files, folders });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while reading folder" });
  }
});

router.delete("/delete/:folderId", async (req, res) => {
  try {
    const { folderId } = req.params;
    const targetFolder = foldersData.find((folder) => folder.id === folderId);
    if (!targetFolder || targetFolder === -1)
      return res.status(404).json({ message: "Folder doesnt exist" });

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
          return res.status(500).json({
            message: "Error occured while deleting files from folder deletion",
          });
        }
      }
    }

    for (let i = filesData.length - 1; i >= 0; i--) {
      if (fileIds.includes(filesData[i]?.id)) {
        filesData.splice(i, 1);
      }
    }
    for (let i = foldersData.length - 1; i >= 0; i--) {
      if (folderIds.includes(foldersData[i]?.id)) {
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

    return res
      .status(200)
      .json({ message: "Folder and contents deleted successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while deleting folder" });
  }
});

export default router;
