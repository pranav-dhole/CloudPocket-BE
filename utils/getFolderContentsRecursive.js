import { ObjectId } from "mongodb";
import { Folder } from "../models/folderModel.js";
import { File } from "../models/fileModel.js";

// getting all the files(id & fileExtension) and folders(id) info of an given targetFolderId recursively
export async function getFolderContentsRecursive(targetFolderId, userId) {
  let allFolderIds = [new ObjectId(targetFolderId)];
  let allFileIds = [];

  const files = await File.find({
    parentFolderId: targetFolderId,
  })
    .select({ _id: 1, fileExtension: 1 })
    .lean();

  allFileIds.push(...files);

  const subFolders = await Folder.find({
    parentFolderId: targetFolderId,
    userId: userId,
  })
    .select({ _id: 1 })
    .lean();

  for (const subFolder of subFolders) {
    const contents = await getFolderContentsRecursive(subFolder._id, userId);

    allFolderIds.push(...contents.folderIds);
    allFileIds.push(...contents.fileIds);
  }

  return { folderIds: allFolderIds, fileIds: allFileIds };
}
