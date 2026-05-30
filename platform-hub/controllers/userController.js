import { AccountUser } from "../models/AccountUser.js";
import bcrypt from "bcrypt";

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Missing required registration parameters." });
    }

    const existingUser = await AccountUser.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({
          error: "Conflict: Username or email identity already registered.",
        });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await AccountUser.create({
      username,
      email,
      passwordHash,
    });

    return res.status(201).json({
      message: "User registration and wallet initialization successful.",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error during user registration pipeline.",
      context: error.message,
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await AccountUser.findById(userId).select("-passwordHash");

    if (!user) {
      return res
        .status(404)
        .json({ error: "Target user profile resource not found." });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error during profile resource retrieval.",
      context: error.message,
    });
  }
};
