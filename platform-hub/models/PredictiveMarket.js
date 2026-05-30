import mongoose from "mongoose";

const predictiveMarketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "RESOLVED"],
      default: "OPEN",
      index: true,
    },
    liquidity: { type: Number, default: 100.0 }, 
    yesShares: { type: Number, default: 0 },
    noShares: { type: Number, default: 0 },
    closeDate: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountUser",
      required: true,
    },
  },
  { timestamps: true },
);

export const PredictiveMarket = mongoose.model(
  "PredictiveMarket",
  predictiveMarketSchema,
);
