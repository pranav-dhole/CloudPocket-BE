import { rm } from "fs/promises";
import path, { join } from "path";
import { STORAGE_PATH } from "../utils/paths.js";
import { getFolderContentsRecursive } from "../utils/getFolderContentsRecursive.js";
import { ObjectId } from "mongodb";
import { Folder } from "../models/folderModel.js";
import { File } from "../models/fileModel.js";

export async function postFolder(req, res) {
  try {
    const parentFolderId = req.params.parentFolderId || req.user.rootFolderId;
    const parentFolderObjectId = new ObjectId(parentFolderId);
    if (!parentFolderId)
      return res
        .status(400)
        .json({ message: "No default parent folder available" });

    const folderName =
      (req.headers.foldername && req.headers.foldername.trim()) || "New Folder";

    const parentFolder = await Folder.findOne({
      _id: parentFolderObjectId,
    })
      .lean()
      .select("userId");

    if (!parentFolder.userId.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to create this folder" });
    }

    await Folder.create({
      name: folderName,
      parentFolderId: parentFolderObjectId,
      userId: req.user._id,
    });

    return res.status(201).json({ message: "Folder created successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while creating an folder" });
  }
}

export async function editFolder(req, res) {
  try {
    const folderId = req.params.folderId;
    const folderObjectId = new ObjectId(folderId);
    const user = req.user;
    const folderData = await Folder.findOne({ _id: folderObjectId })
      .lean()
      .select("name userId");

    if (!folderData)
      return res.status(404).json({ message: "Folder doesnt exist" });

    if (!folderData.userId.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "You are authorized to edit this folder" });
    }

    const newFolderName = req.body.newFolderName;
    if (newFolderName === folderData.name) {
      return res.status(403).json({ message: "Folder name denied" });
    } else if (!newFolderName || !newFolderName.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    await Folder.updateOne(
      { _id: folderObjectId, userId: user._id },
      { $set: { name: newFolderName } },
    );

    return res.status(200).json({ message: "Folder renamed successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while renaming folder" });
  }
}

export async function getFolderData(req, res) {
  try {
    const folderId = req.params.folderId || req.user.rootFolderId;
    const folderObjectId = new ObjectId(folderId);
    const folderData = await Folder.findOne({ _id: folderObjectId })
      .lean()
      .select("userId");

    if (!folderData)
      return res.status(404).json({ message: "Folder doesnt exist" });

    if (!folderData.userId.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to access this folder" });
    }

    const files = await File.find({ parentFolderId: folderObjectId }).lean();
    const folders = await Folder.find({
      parentFolderId: folderObjectId,
    }).lean();

    const formatDoc = ({ _id, ...doc }) => ({ id: _id, ...doc });
    return res.status(200).json({
      ...formatDoc(folderData),
      files: files.map(formatDoc),
      folders: folders.map(formatDoc),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Error occured while reading folder" });
  }
}

export async function deleteFolder(req, res) {
  try {
    const { folderId } = req.params;
    const folderObjectId = new ObjectId(folderId);
    const userId = req.user._id;

    const targetFolder = await Folder.findOne({ _id: folderObjectId })
      .lean()
      .select("userId");

    if (!targetFolder)
      return res.status(404).json({ message: "Folder doesnt exist" });

    if (!targetFolder.userId.equals(userId)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this folder" });
    }

    const { folderIds, fileIds } = await getFolderContentsRecursive(
      folderObjectId,
      userId,
    );

    for (const file of fileIds) {
      try {
        const filePath = `${STORAGE_PATH}/${file._id}${file.fileExtension}`;
        await rm(filePath, { force: true, recursive: true });
      } catch (err) {
        console.warn(err);
        return res.status(500).json({
          message: "Error occured while deleting files from folder deletion",
        });
      }
    }

    const extractedFileIds = fileIds.map((file) => file._id);
    await Promise.all([
      File.deleteMany({ _id: { $in: extractedFileIds } }),
      Folder.deleteMany({ _id: { $in: folderIds } }),
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
}
