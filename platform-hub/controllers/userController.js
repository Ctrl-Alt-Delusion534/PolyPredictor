import { AccountUser } from "../models/AccountUser.js";
import { MarketBet } from "../models/MarketBet.js";

export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Missing registration credentials parameters." });
    }
    const existingUser = await AccountUser.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Identity profile handle or email already allocated." });
    }
    const newUser = new AccountUser({
      username,
      email,
      passwordHash: password,
      balance: 1000.0,
    });
    await newUser.save();
    return res.status(201).json({
      message: "Trader account provisioned successfully.",
      user: newUser.toObject(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal registry transaction failure.",
      context: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password verification requirements unfulfilled.",
      });
    }
    const user = await AccountUser.findOne({ email });
    if (!user || user.passwordHash !== password) {
      return res
        .status(401)
        .json({ error: "Invalid operational credential matrix matching." });
    }
    return res
      .status(200)
      .json({ message: "Terminal authentication successful.", user });
  } catch (error) {
    return res.status(500).json({
      error: "Internal login verification engine pipeline failure.",
      context: error.message,
    });
  }
};

export const getUserProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await AccountUser.findById(id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({
        error:
          "Trader portfolio record not located inside current clearing layer.",
      });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to compile requested portfolio context.",
      context: error.message,
    });
  }
};

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

    return res.status(200).json({ rankings: rankings.slice(0, 10) });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to compile clearing engine leaderboards.",
      context: error.message,
    });
  }
};
