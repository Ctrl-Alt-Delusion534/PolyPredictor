import { MarketBet } from "../models/MarketBet.js";
import { PredictiveMarket } from "../models/PredictiveMarket.js";

export const placeBet = async (req, res) => {
  try {
    const { marketId, userId, prediction, amountSpent } = req.body;

    if (!marketId || !userId || !prediction || !amountSpent) {
      return res
        .status(400)
        .json({ error: "Missing required core transaction parameters." });
    }
    if (amountSpent <= 0) {
      return res.status(400).json({
        error: "Collateral investment amount must be greater than zero.",
      });
    }
    if (prediction !== "YES" && prediction !== "NO") {
      return res
        .status(400)
        .json({ error: "Invalid market outcome prediction tokens." });
    }

    const market = await PredictiveMarket.findById(marketId);
    if (!market) {
      return res
        .status(404)
        .json({ error: "Target prediction market not found." });
    }
    if (market.status !== "OPEN") {
      return res
        .status(400)
        .json({ error: "Trading operations are closed for this market." });
    }

    let bYes = market.yesShares || market.liquidity;
    let bNo = market.noShares || market.liquidity;

    const invariantK = bYes * bNo;
    let sharesPurchased = 0;

    if (prediction === "YES") {
      const newNoPool = bNo + amountSpent;
      const newYesPool = invariantK / newNoPool;
      sharesPurchased = bYes - newYesPool;
      market.yesShares = newYesPool;
      market.noShares = newNoPool;
    } else {
      const newYesPool = bYes + amountSpent;
      const newNoPool = invariantK / newYesPool;
      sharesPurchased = bNo - newNoPool;
      market.yesShares = newYesPool;
      market.noShares = newNoPool;
    }

    if (sharesPurchased <= 0 || isNaN(sharesPurchased)) {
      return res.status(400).json({
        error:
          "Slippage tolerance exceeded. Insufficient pool liquidity for order volume.",
      });
    }

    const avgPricePaid = amountSpent / sharesPurchased;
    market.liquidity += amountSpent;
    await market.save();

    const newBet = await MarketBet.create({
      marketId,
      userId,
      side: prediction,
      amount: amountSpent,
      shares: sharesPurchased,
      priceAtBet: avgPricePaid,
    });

    return res.status(201).json({
      message: "Order executed successfully via Automated Market Maker.",
      executedOrder: {
        sharesMinted: sharesPurchased.toFixed(4),
        averageSharePrice: avgPricePaid.toFixed(4),
        poolStatus: {
          currentYesPoolShares: market.yesShares.toFixed(2),
          currentNoPoolShares: market.noShares.toFixed(2),
          totalLiquidityDepth: market.liquidity.toFixed(2),
        },
        receipt: newBet,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Critical failure within the AMM execution pipeline.",
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
