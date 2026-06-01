import { PredictiveMarket } from "../models/PredictiveMarket.js";

export const createMarket = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      status,
      liquidity,
      yesShares,
      noShares,
      closeDate,
      createdBy,
    } = req.body;
    if (!title || !description || !category || !closeDate || !createdBy) {
      return res.status(400).json({
        error:
          "Missing required core market parameters: title, description, category, closeDate, or createdBy.",
      });
    }

    const newMarket = await PredictiveMarket.create({
      title,
      description,
      category,
      status: status || "OPEN",
      liquidity: liquidity || 100.0,
      yesShares: yesShares || 0,
      noShares: noShares || 0,
      closeDate,
      createdBy,
    });

    return res.status(201).json({
      message: "Predictive market created successfully.",
      market: newMarket,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error during market creation pipeline.",
      context: error.message,
    });
  }
};

export const getActiveMarkets = async (req, res) => {
  try {
    const markets = await PredictiveMarket.find({ status: "OPEN" }).sort({
      liquidity: -1,
      closeDate: 1,
    });

    return res.status(200).json({
      count: markets.length,
      markets,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error during active market retrieval.",
      context: error.message,
    });
  }
};
