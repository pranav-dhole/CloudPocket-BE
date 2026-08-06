import path from "path";

export const STORAGE_PATH = path.join(import.meta.dirname, "../storage");
const safeStoragePath = STORAGE_PATH.endsWith(path.sep)
  ? STORAGE_PATH
  : STORAGE_PATH + path.sep;
export function isPathSafe(targetPath) {
  return targetPath === STORAGE_PATH || targetPath.startsWith(safeStoragePath);
}

export function resolveSafePath(relativePath) {
  const decoded = decodeURIComponent(relativePath || "");
  const targetPath = path.join(STORAGE_PATH, decoded);
  if (!isPathSafe(targetPath)) {
    return null;
  }

  return targetPath;
}
