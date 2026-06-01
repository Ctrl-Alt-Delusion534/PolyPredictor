import mongoose from "mongoose";
import { MarketBet } from "../models/MarketBet.js";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { AccountUser } from "../models/AccountUser.js";

export const placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { marketId, userId, prediction, amountSpent } = req.body;

    if (!marketId || !userId || !prediction || !amountSpent) {
      return res
        .status(400)
        .json({ error: "Missing required core transaction parameters." });
    }

    const tradeAmount = parseFloat(Number(amountSpent).toFixed(4));
    if (tradeAmount <= 0 || isNaN(tradeAmount)) {
      return res
        .status(400)
        .json({
          error:
            "Calateral investment amount must be a positive non-zero value.",
        });
    }

    if (prediction !== "YES" && prediction !== "NO") {
      return res
        .status(400)
        .json({ error: "Invalid market outcome prediction tokens." });
    }

    const user = await AccountUser.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: "User account record not found." });
    }

    if (user.balance < tradeAmount) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          error: `Insufficient funds. Balance: ₹${user.balance.toFixed(2)}, Required: ₹${tradeAmount.toFixed(2)}`,
        });
    }

    const market = await PredictiveMarket.findById(marketId).session(session);
    if (!market) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Target prediction market not found." });
    }
    if (market.status !== "OPEN") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Trading operations are closed for this market." });
    }

    let bYes = market.yesShares || market.liquidity;
    let bNo = market.noShares || market.liquidity;
    const invariantK = bYes * bNo;
    let sharesPurchased = 0;

    if (prediction === "YES") {
      const newNoPool = bNo + tradeAmount;
      const newYesPool = invariantK / newNoPool;
      sharesPurchased = bYes - newYesPool;
      market.yesShares = newYesPool;
      market.noShares = newNoPool;
    } else {
      const newYesPool = bYes + tradeAmount;
      const newNoPool = invariantK / newYesPool;
      sharesPurchased = bNo - newNoPool;
      market.yesShares = newYesPool;
      market.noShares = newNoPool;
    }

    if (sharesPurchased <= 0 || isNaN(sharesPurchased)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          error:
            "Slippage tolerance exceeded. Insufficient pool liquidity for order volume.",
        });
    }

    const avgPricePaid = tradeAmount / sharesPurchased;
    market.liquidity += tradeAmount;

    await market.save({ session });

    const walletUpdateResult = await AccountUser.findOneAndUpdate(
      { _id: userId, balance: { $gte: tradeAmount } },
      { $inc: { balance: -tradeAmount } },
      { session, new: true, runValidators: true },
    );

    if (!walletUpdateResult) {
      throw new Error(
        "Wallet concurrency race condition detected. Transaction aborted to preserve asset integrity.",
      );
    }

    const [newBet] = await MarketBet.create(
      [
        {
          marketId,
          userId,
          side: prediction,
          amount: tradeAmount,
          shares: sharesPurchased,
          priceAtBet: avgPricePaid,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message:
        "Order executed successfully. Wallet debited via atomic AMM transaction.",
      executedOrder: {
        sharesMinted: sharesPurchased.toFixed(4),
        averageSharePrice: avgPricePaid.toFixed(4),
        updatedWalletBalance: walletUpdateResult.balance.toFixed(2),
        poolStatus: {
          currentYesPoolShares: market.yesShares.toFixed(2),
          currentNoPoolShares: market.noShares.toFixed(2),
          totalLiquidityDepth: market.liquidity.toFixed(2),
        },
        receipt: newBet,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error:
        "Critical failure within the AMM execution pipeline. Transaction rolled back safely.",
      context: error.message,
    });
  }
};

export const getUserPositions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "Missing required userId parameter in request path." });
    }

    const positions = await MarketBet.find({ userId })
      .populate("marketId", "title category status closeDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: positions.length,
      positions,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error while fetching user portfolio positions.",
      context: error.message,
    });
  }
};
