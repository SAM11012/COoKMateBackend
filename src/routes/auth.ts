import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { generateApiToken } from "../utils/jwt";
const router = Router();

const COOKIE_NAME = "auth_token";

// Helper function to set the cookie
const setTokenCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // The cookie is not accessible via client-side JavaScript
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "strict", // Helps mitigate CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches token expiration
    path: "/",
  });
};

router.post("/register", async (req: Request, res: Response) => {
  console.log(req, "the request 🔴 ");
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        hashedPassword,
        name,
      })
      .returning();
    console.log(newUser);
    const apiToken = generateApiToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    // ==========================================================
    // KEY CHANGE: Set the cookie instead of returning the token in JSON
    // ==========================================================
    setTokenCookie(res, apiToken);
    return res
      .status(201)
      .json({ message: "User registered successfully", id: newUser.id });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (!existingUser || !existingUser.hashedPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.hashedPassword
    );

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    console.log(existingUser, "the existing user");
    const apiToken = generateApiToken({
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
    });

    // ==========================================================
    // KEY CHANGE: Set the cookie instead of returning the token in JSON
    // ==========================================================
    setTokenCookie(res, apiToken);
    return res
      .status(200)
      .json({ message: "User Logged In successfully", id: existingUser.id });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
