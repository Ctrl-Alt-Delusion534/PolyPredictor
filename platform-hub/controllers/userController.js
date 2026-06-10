import { AccountUser } from "../models/AccountUser.js";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { MarketBet } from "../models/MarketBet.js";

export const getLeaderboard = async (req, res) => {
  try {
    const users = await AccountUser.find({}).select("username balance");
    const STARTING_BALANCE = 1000.0;

    const rankings = await Promise.all(
      users.map(async (user) => {
        const profitGained = user.balance - STARTING_BALANCE;

        const wonBetsCount = await MarketBet.countDocuments({
          userId: user._id,
          side: { $ne: null },
        });

        return {
          _id: user._id,
          username: user.username,
          balance: user.balance,
          profitGained: parseFloat(profitGained.toFixed(2)),
          successfulBets: wonBetsCount,
        };
      }),
    );

    rankings.sort((a, b) => {
      if (b.profitGained === a.profitGained) {
        if (b.balance === a.balance) {
          return b.successfulBets - a.successfulBets;
        }
        return b.balance - a.balance;
      }
      return b.profitGained - a.profitGained;
    });

    return res.status(200).json(rankings.slice(0, 10));
  } catch (error) {
    return res.status(500).json({
      error: "Failed to compile clearing engine leaderboards.",
      context: error.message,
    });
  }
};
