import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm, stat, writeFile } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import { isPathSafe, resolveSafePath } from "../utils/paths.js";
import filesData from "../filesDB.json" with { type: "json" };
import { extension } from "mime-types";
import crypto from "crypto";

const router = express.Router();

// file deleting logic
router.delete("/delete/{*filepath}", async (req, res) => {
  try {
    const rawPath = req.params.filepath;
    const relativePath = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;

    const decodedPath = decodeURIComponent(relativePath || "");
    if (!decodedPath) {
      return res.status(400).json({ msg: "No file path provided" });
    }

    const targetPath = resolveSafePath(decodedPath);

    if (!isPathSafe(targetPath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const fileData = filesData.find((file) => file.id === relativePath);
    await rm(targetPath + (fileData?.fileExtension || ""), { recursive: true });
    res.status(200).json({ msg: "file deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(404).json({ msg: "Error while deleting the file" });
  }
});

const getFiles = async (req, res) => {
  try {
    const rawpath = req.params.fileId;

    const fileData = filesData.find((file) => file.id === rawpath);

    const relativePath = Array.isArray(rawpath)
      ? rawpath.join("/")
      : rawpath || "";
    const decodedPath = decodeURIComponent(relativePath);
    const targetDir = resolveSafePath(
      decodedPath + (fileData?.fileExtension || ""),
    );

    if (!isPathSafe(targetDir)) {
      return res.status(403).json({ msg: "Access Denied" });
    }

    const stats = await stat(targetDir);

    // if its an folder send its content list
    if (stats.isDirectory()) {
      const dirents = await readdir(targetDir, { withFileTypes: true });
      const itemsList = dirents.map((d) => ({
        name: d.name,
        isDirectory: d.isDirectory(),
      }));

      return res.json(itemsList);
    }

    // if its an file send using .sendFile
    return res.sendFile(targetDir);
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error reading directory" });
  }
};
// getting files from path
router.get("/:fileId", getFiles);
router.get("/", getFiles);

// handling the posted files from the client
router.post("/upload/{*folderpath}", async (req, res) => {
  try {
    let rawPath = req.params.folderpath;
    const relativePath = Array.isArray(rawPath)
      ? rawPath.join("/")
      : rawPath || "/";

    const fileName = req.headers.filename;
    if (fileName === "/" || fileName === `\\` || fileName === "..") {
      return res.status(403).json({ msg: "Filename denied" });
    }

    const id = crypto.randomUUID();
    const fileExtension = path.extname(fileName);
    const fullFileName = id + fileExtension;
    const decodedPath = decodeURIComponent(
      path.join(relativePath, fullFileName),
    );

    const filePath = resolveSafePath(decodedPath);
    if (!isPathSafe(filePath)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const targetDir = path.dirname(filePath);
    await mkdir(targetDir, { recursive: true });

    const writeStream = createWriteStream(filePath);
    await pipeline(req, writeStream);

    const newRecord = {
      id,
      fileExtension,
      fileName,
    };

    filesData.push(newRecord);
    await writeFile("./filesDB.json", JSON.stringify(filesData));
    res
      .status(200)
      .json({ msg: "file created successfully", record: newRecord });
  } catch (err) {
    console.error(err);
    if (err.code === "ENOENT") {
      return res.status(404).json({ msg: "Directory not found" });
    }
    res.status(500).json({ msg: "Error writing directory" });
  }
});

export default router;
