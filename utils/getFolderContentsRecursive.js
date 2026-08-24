export function getFolderContentsRecursive(targetFolderId, allFolders) {
  const folder = allFolders.find((f) => f.id === targetFolderId);
  if (!folder) {
    return { folderIds: [], fileIds: [] };
  }

  let folderIds = [targetFolderId];
  let fileIds = (folder.files || []).map((id) => id);

  for (const childFolderId of folder.folders || []) {
    const contents = getFolderContentsRecursive(childFolderId, allFolders);
    folderIds = folderIds.concat(contents.folderIds);
    fileIds = fileIds.concat(contents.fileIds);
  }

  return { folderIds, fileIds };
}
