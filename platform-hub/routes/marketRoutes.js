import express from "express";
import {
  createMarket,
  getActiveMarkets,
} from "../controllers/marketController.js";

const router = express.Router();

router.post("/create", createMarket);
router.get("/active", getActiveMarkets);

export default router;
