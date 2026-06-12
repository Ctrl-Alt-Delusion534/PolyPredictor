import express from "express";
import {
  createCustomMarket,
  resolveMarket,
  getMarkets,
} from "../controllers/marketController.js";
import { placeBet } from "../controllers/betController.js";

const router = express.Router();

router.get("/", getMarkets);
router.post("/create", createCustomMarket);
router.post("/resolve", resolveMarket);
router.post("/bets/place", placeBet);

export default router;
