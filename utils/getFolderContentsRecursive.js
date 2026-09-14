import { ObjectId } from "mongodb";

// getting all the files(id & fileExtension) and folders(id) info of an given targetFolderId recursively
export async function getFolderContentsRecursive(db, targetFolderId, userId) {
  let allFolderIds = [new ObjectId(targetFolderId)];
  let allFileIds = [];

  const files = await db
    .collection("files")
    .find({
      parentFolderId: targetFolderId,
    })
    .project({ _id: 1, fileExtension: 1 })
    .toArray();

  allFileIds.push(...files);

  const subFolders = await db
    .collection("folders")
    .find({
      parentFolderId: targetFolderId,
      userId: userId,
    })
    .project({ _id: 1 })
    .toArray();

  for (const subFolder of subFolders) {
    const contents = await getFolderContentsRecursive(
      db,
      subFolder._id,
      userId,
    );

    allFolderIds.push(...contents.folderIds);
    allFileIds.push(...contents.fileIds);
  }

  return { folderIds: allFolderIds, fileIds: allFileIds };
}
