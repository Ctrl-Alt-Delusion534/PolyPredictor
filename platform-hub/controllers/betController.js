import mongoose from "mongoose";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { MarketBet } from "../models/MarketBet.js";
import { AccountUser } from "../models/AccountUser.js";

export const placeBet = async (req, res) => {
  const { marketId, userId, prediction, amountSpent } = req.body;
  const tradeAmount = parseFloat(amountSpent);

  if (!marketId || !userId || !prediction || !tradeAmount || tradeAmount <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid input parameters for trade execution." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const market = await PredictiveMarket.findById(marketId).session(session);
    const user = await AccountUser.findById(userId).session(session);

    if (!market) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Market environment not found." });
    }

    if (market.status !== "OPEN") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Trading is closed or resolved for this market." });
    }

const currentBalance = parseFloat(user?.balance) || 0;

if (!user || currentBalance < tradeAmount) {
  await session.abortTransaction();
  session.endSession();
  return res
    .status(400)
    .json({
      error: "Inbound trade rejected due to insufficient account balance.",
    });
}
    const bYes = parseFloat(market.yesShares) || 1000;
    const bNo = parseFloat(market.noShares) || 1000;
    const invariantK = parseFloat(market.invariantK) || bYes * bNo;

    let sharesMinted = 0;
    let newYesPool = bYes;
    let newNoPool = bNo;

    if (prediction === "YES") {
      newNoPool = bNo + tradeAmount;
      newYesPool = invariantK / newNoPool;
      sharesMinted = bYes - newYesPool;
    } else if (prediction === "NO") {
      newYesPool = bYes + tradeAmount;
      newNoPool = invariantK / newYesPool;
      sharesMinted = bNo - newNoPool;
    } else {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Invalid prediction side. Must be YES or NO." });
    }

    if (
      sharesMinted <= 0 ||
      newYesPool <= 0 ||
      newNoPool <= 0 ||
      isNaN(sharesMinted)
    ) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({
          error:
            "Transaction aborted due to critical liquidity pool exhaustion.",
        });
    }

    const averageSharePrice = parseFloat(
      (tradeAmount / sharesMinted).toFixed(4),
    );

    user.balance = parseFloat((user.balance - tradeAmount).toFixed(4));
    market.totalVolumeSpent = parseFloat(
      ((parseFloat(market.totalVolumeSpent) || 0) + tradeAmount).toFixed(4),
    );
    market.yesShares = newYesPool;
    market.noShares = newNoPool;
    market.invariantK = invariantK;

    const denominator = newYesPool + newNoPool;
    const currentPriceYes = parseFloat((newNoPool / denominator).toFixed(4));
    const currentPriceNo = parseFloat((newYesPool / denominator).toFixed(4));

    if (!market.priceHistory || !Array.isArray(market.priceHistory)) {
      market.priceHistory = [];
    }

    market.priceHistory.push({
      priceOfYes: currentPriceYes,
      priceOfNo: currentPriceNo,
      timestamp: new Date(),
    });

    await user.save({ session });
    await market.save({ session });

    const [betReceipt] = await MarketBet.create(
      [
        {
          userId: user._id,
          marketId: market._id,
          side: prediction,
          amount: tradeAmount,
          shares: sharesMinted,
          priceAtBet: averageSharePrice,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message:
        "Order executed successfully. Wallet debited via atomic AMM transaction.",
      executedOrder: {
        sharesMinted: sharesMinted.toFixed(4),
        averageSharePrice: averageSharePrice.toFixed(4),
        updatedWalletBalance: user.balance.toFixed(4),
        poolStatus: {
          currentYesPoolShares: newYesPool.toFixed(4),
          currentNoPoolShares: newNoPool.toFixed(4),
          totalLiquidityDepth: market.totalVolumeSpent.toFixed(4),
        },
        receipt: betReceipt,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ AMM ENGINE TRADE TRANSACTION COLLISION:", error.message);
    return res.status(500).json({
      error:
        "Transaction processing pipeline failure due to concurrency lock competition.",
      context: error.message,
    });
  }
};

export const getUserPositions = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json({ error: "Missing required userId parameter." });
  }

  try {
    const userBets = await MarketBet.find({
      userId: new mongoose.Types.ObjectId(userId),
    });
    const netPositions = {};

    userBets.forEach((bet) => {
      const mId = bet.marketId.toString();
      if (!netPositions[mId]) {
        netPositions[mId] = { YES: 0, NO: 0 };
      }

      if (bet.side === "YES") {
        netPositions[mId].YES += bet.shares;
      } else if (bet.side === "NO") {
        netPositions[mId].NO += bet.shares;
      }
    });

    return res.status(200).json({
      message: "User open asset positions compiled successfully.",
      userId,
      positions: netPositions,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to retrieve user portfolio positions.",
      context: error.message,
    });
  }
};
