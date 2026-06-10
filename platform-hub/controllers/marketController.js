import mongoose from "mongoose";
import { PredictiveMarket } from "../models/PredictiveMarket.js";
import { MarketBet } from "../models/MarketBet.js";
import { AccountUser } from "../models/AccountUser.js";
import { GoogleGenAI } from "@google/genai";

export const getMarkets = async (req, res) => {
  try {
    const markets = await PredictiveMarket.find({});
    return res.status(200).json(markets);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch market data feeds.",
      context: error.message,
    });
  }
};

export const createCustomMarket = async (req, res) => {
  const {
    title,
    description,
    initialPriceOfYes,
    initialFunding,
    userId,
    visibility,
    groupName,
  } = req.body;

  if (!title || !initialPriceOfYes || !initialFunding) {
    return res
      .status(400)
      .json({ error: "Missing required market parameters." });
  }

  try {
    let detectedCategory = "GENERAL";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Analyze this prediction market item and classify it into exactly one of these uppercase words: [TECH, FINANCE, GEOPOLITICS, SPORTS, ECONOMY, CRYPTO, GENERAL]. Return ONLY the single word. Question: "${title}"`,
      });

      const rawText = aiResponse.text ? aiResponse.text() : "";
      const parsedText = rawText.trim().toUpperCase();

      if (
        parsedText &&
        [
          "TECH",
          "FINANCE",
          "GEOPOLITICS",
          "SPORTS",
          "ECONOMY",
          "CRYPTO",
          "GENERAL",
        ].includes(parsedText)
      ) {
        detectedCategory = parsedText;
      } else {
        console.warn("⚠️ AI returned an unmapped category token:", parsedText);
      }
    } catch (aiError) {
      console.error("❌ Gemini API Pipeline Exception:", aiError.message);
    }

    const priceYes = parseFloat(initialPriceOfYes);
    const priceNo = 1 - priceYes;

    const totalShares = parseFloat(initialFunding);
    const yesShares = totalShares * priceNo;
    const noShares = totalShares * priceYes;
    const invariantK = yesShares * noShares;

    const newMarket = new PredictiveMarket({
      title,
      description,
      category: detectedCategory,
      yesShares,
      noShares,
      invariantK,
      totalVolumeSpent: totalShares,
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : null,
      visibility: visibility || "PUBLIC",
      groupName: visibility === "GROUP" ? groupName : "",
      priceHistory: [
        {
          priceOfYes: priceYes,
          priceOfNo: priceNo,
          timestamp: new Date(),
        },
      ],
    });

    await newMarket.save();

    return res.status(201).json({
      message: "Custom friend-group market initialized successfully.",
      market: newMarket,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to initialize custom market.",
      context: error.message,
    });
  }
};

export const resolveMarket = async (req, res) => {
  const { marketId, outcome } = req.body;

  if (!marketId || (outcome !== "YES" && outcome !== "NO")) {
    return res.status(400).json({
      error: "Invalid market identification or outcome resolution parameters.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const marketObjId = new mongoose.Types.ObjectId(marketId);
    const market =
      await PredictiveMarket.findById(marketObjId).session(session);

    if (!market) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ error: "Target prediction market resource not found." });
    }

    if (market.status !== "OPEN") {
      await session.abortTransaction();
      return res.status(400).json({
        error:
          "Conflict: This market environment has already been settled or halted.",
      });
    }

    market.status = "RESOLVED";
    market.winningOutcome = outcome;
    await market.save({ session });

    const rawPositions = await MarketBet.find({
      marketId: marketObjId,
    }).session(session);

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

    for (const [userStrId, positions] of Object.entries(userNetPositions)) {
      const winningShares = outcome === "YES" ? positions.YES : positions.NO;

      if (winningShares > 0) {
        const payoutAmount = parseFloat((winningShares * 1.0).toFixed(4));

        const updatedUser = await AccountUser.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(userStrId) },
          { $inc: { balance: payoutAmount } },
          { session, new: true },
        );

        if (updatedUser) {
          payoutReceipts.push({
            userId: userStrId,
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
    console.error("MARKET RESOLUTION CRITICAL EXCEPTION:", error);
    return res.status(500).json({
      error:
        "Critical failure during the market settlement clearing process. Transaction safely aborted.",
      context: error.message,
    });
  }
};
