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
import { connectDB } from "./database.js";

const cookieSecret = "CLOUDPOCKETDADA";
try {
  const db = await connectDB();
  const app = express();
  const PORT = 3000;
  app.use(express.json());
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  app.use(cookieParser(cookieSecret));

  // response header setter
  app.use((req, res, next) => {
    if (req.query.action === "download") {
      res.setHeader("Content-Disposition", "attachment");
    }
    next();
  });

  app.use(express.static(STORAGE_PATH));

  app.use((req, res, next) => {
    next();
  });
  app.use("/files", checkAuth, filesRoutes);
  app.use("/folder", checkAuth, folderRoutes);
  app.use("/users", usersRoutes);

  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
} catch (err) {
  console.log("Couldn't connect to database!");
  console.error(err);
}
