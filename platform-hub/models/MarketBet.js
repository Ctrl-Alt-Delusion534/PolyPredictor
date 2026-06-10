import mongoose from "mongoose";

const marketBetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountUser",
      required: true,
      index: true,
    },
    marketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PredictiveMarket",
      required: true,
      index: true,
    },
    side: { type: String, enum: ["YES", "NO"], required: true },
    amount: { type: Number, required: true },
    shares: { type: Number, required: true },
    priceAtBet: { type: Number, required: true 
    },
    visibility: {
      type: String,
      enum: ["PUBLIC", "GROUP"],
      default: "PUBLIC"
    },
    groupName:{
      type: String,
      default: ""
    },
  },
  { timestamps: true },
);

export const MarketBet = mongoose.model("MarketBet", marketBetSchema);
