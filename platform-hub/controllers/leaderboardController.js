import { AccountUser } from "../models/AccountUser.js";
import { MarketBet } from "../models/MarketBet.js";
import { PredictiveMarket } from "../models/PredictiveMarket.js";

export const getLeaderboard = async (req, res) => {
  try {
    const users = await AccountUser.find({}, "username balance");
    const bets = await MarketBet.find({});
    const markets = await PredictiveMarket.find({ status: "RESOLVED" });

    const marketMap = new Map(
      markets.map((m) => [m._id.toString(), m.winningOutcome]),
    );

    const leaderboardData = users.map((user) => {
      const uId = user._id.toString();
      const userBets = bets.filter((b) => b.userId.toString() === uId);

      let totalBetsPlaced = userBets.length;
      let totalWon = 0;
      let totalLost = 0;
      let totalVolumeRisked = 0;
      let netReturnDelta = 0;

      userBets.forEach((bet) => {
        const mId = bet.marketId.toString();
        totalVolumeRisked += bet.amount;

        if (marketMap.has(mId)) {
          const winningOutcome = marketMap.get(mId);
          if (bet.side === winningOutcome) {
            totalWon += 1;
            netReturnDelta += bet.shares - bet.amount;
          } else {
            totalLost += 1;
            netReturnDelta -= bet.amount;
          }
        }
      });

      const totalResolvedBets = totalWon + totalLost;
      const successRate =
        totalResolvedBets > 0
          ? parseFloat(((totalWon / totalResolvedBets) * 100).toFixed(2))
          : 0;

      const tradingPerformanceIndex =
        totalVolumeRisked > 0
          ? parseFloat((netReturnDelta / totalVolumeRisked).toFixed(4))
          : 0;

      return {
        userId: uId,
        username: user.username,
        walletBalance: user.balance,
        totalBetsPlaced,
        totalWon,
        totalLost,
        successRate,
        tpi: tradingPerformanceIndex,
      };
    });

    leaderboardData.sort(
      (a, b) => b.tpi - a.tpi || b.successRate - a.successRate,
    );

    return res.status(200).json({
      message: "Global exchange leaderboard compiled successfully.",
      leaderboard: leaderboardData,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to generate standings.", context: error.message });
  }
};
