import express from "express";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getLeaderboard,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile/:id", getUserProfile);
router.get("/leaderboard", getLeaderboard);

export default router;
