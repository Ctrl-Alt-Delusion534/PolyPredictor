import express from "express";
import {
  createCustomMarket,
  resolveMarket,
  getMarkets,
} from "../controllers/marketController.js";

const router = express.Router();
router.get("/", getMarkets);
router.post("/create", createCustomMarket);
router.post("/resolve", resolveMarket);

export default router;
