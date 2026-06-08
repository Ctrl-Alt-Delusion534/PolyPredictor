import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import userRouter from "./routes/userRoutes.js";
import marketRouter from "./routes/marketRoutes.js";
import betRoutes from "./routes/betRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import cors from "cors";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: "../.env" });

const app = express();
const PORT = 8000;
const MONGO_URI = process.env.MONGODB_CONNECTION_URI;

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

app.use("/api/users", userRouter);
app.use("/api/markets", marketRouter);
app.use("/api/bets", betRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "The server works fine.",
    version: "1.0.0",
    status: "ACTIVE",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "GREEN",
    uptime: process.uptime(),
  });
});

async function initializeServerEngine() {
  try {
    if (!MONGO_URI) {
      throw new Error(
        "MONGODB_CONNECTION_URI environment variable is undefined.",
      );
    }

    await mongoose.connect(MONGO_URI);
    console.log(
      "Database connection established successfully with MongoDB Atlas.",
    );

    app.listen(PORT, () => {
      console.log(`Application server is operational on port ${PORT}.`);
    });
  } catch (error) {
    console.error(
      "Critical initialization error during database connection setup:",
    );
    console.error(`Exception context: ${error.message}`);
    process.exit(1);
  }
}

initializeServerEngine();
