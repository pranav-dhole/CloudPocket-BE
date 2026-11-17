import express from "express";
import { checkAuth } from "../middlewares/authMiddleware.js";
import {
  allUsersInfo,
  deleteByAdmin,
  softDeleteByAdmin,
  loginUser,
  logoutByAdmin,
  logoutUser,
  logoutUsers,
  registerUser,
  userBasicInfo,
  recoverSoftDeletedUser,
} from "../controllers/userControllers.js";

const router = express.Router();

// handling the registeration of an new user
router.post("/register", registerUser);

// handling login of an registered user
router.post("/login", loginUser);

// handling logout of an registered user
router.post("/logout", logoutUser);

// handling logout from all registered users that who were logged in with that particular user id
router.post("/logoutAll", logoutUsers);

// getting basic user info i.e name and email to display on its profile
router.get("/", checkAuth, userBasicInfo);

// getting users info like name, email & logged in status
router.get("/users", checkAuth, allUsersInfo);

// handling logout of an user from admin & manager roles request for RBAC purposes
router.post("/logoutByAdmin", checkAuth, logoutByAdmin);

// handling permanent deletion of an user from only admin role request for RBAC purposes
router.delete("/deleteByAdmin", checkAuth, deleteByAdmin);

// handling soft deletion of an user from only admin role request for RBAC purposes
router.delete("/softDeleteByAdmin", checkAuth, softDeleteByAdmin);

// handling recovery of an user from only owner role request for RBAC purposes
router.post("/recoverUser", checkAuth, recoverSoftDeletedUser);

export default router;
