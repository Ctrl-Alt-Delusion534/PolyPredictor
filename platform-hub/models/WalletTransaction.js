import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountUser",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "PAYOUT_WIN", "PAYOUT_LOSS"],
      required: true,
    },
    amount: { type: Number, required: true },
    referenceId: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

//WILL BE KEEPING THIS IMMUTABLE AS THIS IS THE TRANSACTION HISTORY OF THE USER.

walletTransactionSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "findByIdAndUpdate"],
  function (next) {
    const error = new Error(
      "Security Violation: Wallet transaction ledgers are strictly immutable and cannot be modified.",
    );
    next(error);
  },
);
walletTransactionSchema.pre(
  [
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
    "findByIdAndDelete",
    "remove",
  ],
  function (next) {
    const error = new Error(
      "Security Violation: Wallet transaction ledgers are frozen and cannot be deleted.",
    );
    next(error);
  },
);

export const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema,
);
