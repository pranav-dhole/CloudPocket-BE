import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import filesRoutes from "./routes/filesRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import { STORAGE_PATH } from "./utils/paths.js";

const app = express();
const PORT = 3000;
app.use(express.json());

// response header setter
app.use((req, res, next) => {
  if (req.query.action === "download") {
    res.setHeader("Content-Disposition", "attachment");
  }
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
  });
  next();
});

app.use(express.static(STORAGE_PATH));
app.use("/files", filesRoutes);
app.use("/folder", folderRoutes);

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
