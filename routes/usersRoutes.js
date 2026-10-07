import express from "express";
import { checkAuth } from "../middlewares/authMiddleware.js";
import {
  loginUser,
  logoutUser,
  registerUser,
  userBasicInfo,
} from "../controllers/userControllers.js";

const router = express.Router();

// handling the registeration of an new user
router.post("/register", registerUser);

// handling login of an registered user
router.post("/login", loginUser);

// handling logout of an registered user
router.post("/logout", logoutUser);

// getting basic user info i.e name and email to display on its profile
router.get("/", checkAuth, userBasicInfo);

export default router;
