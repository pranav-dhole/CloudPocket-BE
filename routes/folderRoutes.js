import express from "express";
import { mkdir, rename } from "fs/promises";
import path, { join } from "path";
import { isPathSafe, STORAGE_PATH } from "../utils/paths.js";

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
router.patch("/edit/{*folderpath}", async (req, res) => {
  try {
    const rawPath = req.params.folderpath;
    const relativePath = Array.isArray(rawPath)
      ? rawPath.join("/")
      : rawPath || "";
    const decodedPath = decodeURIComponent(relativePath);

    const oldFullPath = path.join(STORAGE_PATH, decodedPath);

    const dir = path.dirname(oldFullPath);
    const newFileName = req.body.newFileName;
    if (newFileName === "/" || newFileName === `\\` || newFileName === "..") {
      return res.status(403).json({ msg: "Filename denied" });
    }
    const newFullPath = path.join(dir, newFileName);

    if (!isPathSafe(oldFullPath) || !isPathSafe(newFullPath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    await rename(oldFullPath, newFullPath);
    res.status(200).json({ msg: "file renamed successfully" });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error renaming directory" });
  }
});

export default router;
