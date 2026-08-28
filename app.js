import express from "express";
import { createWriteStream } from "fs";
import { mkdir, readdir, rename, rm } from "fs/promises";
import { pipeline } from "stream/promises";
import path, { join } from "path";
import filesRoutes from "./routes/filesRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import { STORAGE_PATH } from "./utils/paths.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { checkAuth } from "./middlewares/authMiddleware.js";

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());

// response header setter
app.use((req, res, next) => {
  if (req.query.action === "download") {
    res.setHeader("Content-Disposition", "attachment");
  }
  next();
});

app.use(express.static(STORAGE_PATH));
app.use("/files", checkAuth, filesRoutes);
app.use("/folder", checkAuth, folderRoutes);
app.use("/users", usersRoutes);

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
