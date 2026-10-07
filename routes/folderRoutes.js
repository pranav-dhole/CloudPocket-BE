import express from "express";
import idAuth from "../middlewares/idAuthMiddleware.js";
import {
  deleteFolder,
  editFolder,
  getFolderData,
  postFolder,
} from "../controllers/folderControllers.js";

const router = express.Router();

router.param("parentFolderId", idAuth);
router.param("folderId", idAuth);

// handling new folder creation logic
router.post("/{:parentFolderId}", postFolder);

// handling folder rename stuff
router.patch("/:folderId", editFolder);

// getting folder files/folders of an requested folder
router.get("/{:folderId}", getFolderData);

// deleting files and folders of an requested folder from all levels using recursive method
router.delete("/:folderId", deleteFolder);

export default router;
