import express from "express";
import idAuth from "../middlewares/idAuthMiddleware.js";
import {
  deleteFile,
  editFile,
  getFile,
  postFile,
} from "../controllers/fileControllers.js";

const router = express.Router();

router.param("parentFolderId", idAuth);
router.param("fileId", idAuth);

// deleting the file using given fileId
router.delete("/:fileId", deleteFile);

// getting files from given fileId
router.get("/:fileId", getFile);

// handling the posted files from the client using its parentFolderId
router.post("/{:parentFolderId}", postFile);

// handling file rename using given fileId
router.patch("/:fileId", editFile);

export default router;
