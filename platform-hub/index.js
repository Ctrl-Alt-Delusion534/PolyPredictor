import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import userRouter from './routes/userRoutes.js';
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: "../.env" });
const app = express();
const PORT = process.env.PORT_PLATFORM_HUB || 8000;
const MONGO_URI = process.env.MONGODB_CONNECTION_URI;
app.use(express.json());
app.use("/api/users", userRouter);
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