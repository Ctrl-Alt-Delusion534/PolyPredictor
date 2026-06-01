import mongoose from "mongoose";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { MarketBet } from "../models/MarketBet.js";
import { AccountUser } from "../models/AccountUser.js";

export const resolveMarket = async (req, res) => {
  const { marketId, outcome } = req.body;

  if (!marketId || (outcome !== "YES" && outcome !== "NO")) {
    return res
      .status(400)
      .json({
        error:
          "Invalid market identification or outcome resolution parameters.",
      });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const market = await PredictiveMarket.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Target prediction market resource not found." });
    }

    if (market.status !== "OPEN") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          error:
            "Conflict: This market environment has already been settled or halted.",
        });
    }

    market.status = "RESOLVED";
    market.winningOutcome = outcome;
    await market.save({ session });

    const rawPositions = await MarketBet.find({ marketId }).session(session);

    const userNetPositions = {};
    rawPositions.forEach((bet) => {
      const uId = bet.userId.toString();
      if (!userNetPositions[uId]) {
        userNetPositions[uId] = { YES: 0, NO: 0 };
      }

      if (bet.side === "YES") {
        userNetPositions[uId].YES += bet.shares;
      } else if (bet.side === "NO") {
        userNetPositions[uId].NO += bet.shares;
      }
    });

    const payoutReceipts = [];

    for (const [userId, positions] of Object.entries(userNetPositions)) {
      const winningShares = outcome === "YES" ? positions.YES : positions.NO;

      if (winningShares > 0) {
        const payoutAmount = parseFloat((winningShares * 1.0).toFixed(4));

        const updatedUser = await AccountUser.findOneAndUpdate(
          { _id: userId },
          { $inc: { balance: payoutAmount } },
          { session, new: true },
        );

        if (updatedUser) {
          payoutReceipts.push({
            userId,
            sharesSettled: winningShares.toFixed(4),
            payoutCredited: payoutAmount.toFixed(2),
            newBalance: updatedUser.balance.toFixed(2),
          });
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: `Market successfully resolved to ${outcome}. Clearing house settlement complete.`,
      resolutionSummary: {
        marketTitle: market.title,
        finalOutcome: outcome,
        totalAccountsSettled: payoutReceipts.length,
        payoutLedger: payoutReceipts,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error:
        "Critical failure during the market settlement clearing process. Transaction safely aborted.",
      context: error.message,
    });
  }
};
