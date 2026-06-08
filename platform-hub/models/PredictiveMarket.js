import mongoose from "mongoose";

const PriceSnapshotSchema = new mongoose.Schema({
  priceOfYes: { type: Number, required: true },
  priceOfNo: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const predictiveMarketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, default: "General" },
    status: {
      type: String,
      enum: ["OPEN", "RESOLVED", "HALTED"],
      default: "OPEN",
    },
    winningOutcome: { type: String, enum: ["YES", "NO", null], default: null },
    yesShares: { type: Number, required: true },
    noShares: { type: Number, required: true },
    invariantK: { type: Number, required: true },
    totalVolumeSpent: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountUser",
      default: null,
    },
    priceHistory: [PriceSnapshotSchema],
  },
  { timestamps: true },
);

export const PredictiveMarket = mongoose.model(
  "PredictiveMarket",
  predictiveMarketSchema,
);
