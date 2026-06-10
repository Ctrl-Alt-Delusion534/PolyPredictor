import mongoose from "mongoose";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { MarketBet } from "../models/MarketBet.js";
import { AccountUser } from "../models/AccountUser.js";

export const placeBet = async (req, res) => {
  const { marketId, userId, prediction, amountSpent } = req.body;

  if (!marketId || !userId || !prediction || !amountSpent || amountSpent <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid input parameters for trade execution." });
  }

  const tradeAmount = parseFloat(amountSpent);
  const session = await mongoose.startSession();
  let useTransaction = true;

  try {
    if (
      mongoose.connection.baseUrl &&
      (mongoose.connection.baseUrl.includes("127.0.0.1") ||
        mongoose.connection.baseUrl?.includes("localhost"))
    ) {
      useTransaction = false;
    }

    if (useTransaction) {
      session.startTransaction();
    }

    const marketObjId = new mongoose.Types.ObjectId(marketId);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const market = useTransaction
      ? await PredictiveMarket.findById(marketObjId).session(session)
      : await PredictiveMarket.findById(marketObjId);

    if (!market) {
      if (useTransaction && session.inTransaction())
        await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: "Market environment not found." });
    }

    if (market.status !== "OPEN") {
      if (useTransaction && session.inTransaction())
        await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ error: "Trading is closed or resolved for this market." });
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
      if (useTransaction && session.inTransaction())
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
      if (useTransaction && session.inTransaction())
        await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Transaction aborted due to critical liquidity pool exhaustion.",
      });
    }

    const averageSharePrice = parseFloat(
      (tradeAmount / sharesMinted).toFixed(4),
    );

    const walletUpdateResult = await AccountUser.findOneAndUpdate(
      { _id: userObjId, balance: { $gte: tradeAmount } },
      { $inc: { balance: -tradeAmount } },
      {
        ...(useTransaction ? { session } : {}),
        new: true,
        runValidators: true,
      },
    );

    if (!walletUpdateResult) {
      if (useTransaction && session.inTransaction())
        await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        error: "Inbound trade rejected due to insufficient account balance.",
      });
    }

    const currentVolume = parseFloat(market.totalVolumeSpent) || 0;
    market.totalVolumeSpent = currentVolume + tradeAmount;
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

    if (useTransaction) {
      await market.save({ session });
    } else {
      await market.save();
    }

    const createOptions = useTransaction ? { session } : {};
    const [betReceipt] = await MarketBet.create(
      [
        {
          userId: userObjId,
          marketId: marketObjId,
          side: prediction,
          amount: tradeAmount,
          shares: sharesMinted,
          priceAtBet: averageSharePrice,
        },
      ],
      createOptions,
    );

    if (useTransaction) {
      await session.commitTransaction();
    }
    session.endSession();

    return res.status(200).json({
      message:
        "Order executed successfully. Wallet debited via atomic AMM transaction.",
      executedOrder: {
        sharesMinted: sharesMinted.toFixed(4),
        averageSharePrice: averageSharePrice.toFixed(4),
        updatedWalletBalance: walletUpdateResult.balance.toFixed(2),
        poolStatus: {
          currentYesPoolShares: newYesPool.toFixed(2),
          currentNoPoolShares: newNoPool.toFixed(2),
          totalLiquidityDepth: market.totalVolumeSpent.toFixed(2),
        },
        receipt: betReceipt,
      },
    });
  } catch (error) {
    try {
      if (useTransaction && session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch (abortError) {}
    session.endSession();

    return res.status(500).json({
      error: "Transaction processing pipeline failure.",
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
