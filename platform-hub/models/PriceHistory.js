import mongoose from "mongoose";

const priceHistorySchema = new mongoose.Schema({
  marketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PredictiveMarket",
    required: true,
    index: true,
  },
  probability: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

export const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema);
