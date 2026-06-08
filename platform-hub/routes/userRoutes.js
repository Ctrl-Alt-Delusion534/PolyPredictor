import express from "express";
import { registerUser, getUserProfile,loginUser } from "../controllers/userController.js";
import { getUserPositions } from "../controllers/betController.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/profile/:userId", getUserProfile);
router.get("/positions/:userId", getUserPositions);
router.post("/login",loginUser);

export default router;
