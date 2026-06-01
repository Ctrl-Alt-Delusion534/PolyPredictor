import express from "express";
import { placeBet, getUserPositions } from "../controllers/betController.js";

const router = express.Router();

router.post("/place", placeBet);
router.get("/user/:userId", getUserPositions);

export default router;
