import { getSession as getAuthJsSession } from "@auth/express";
import { Request, Response, NextFunction } from "express";
import { authConfig } from "../auth"; // <-- CHANGE HERE: Import the config object

declare module "express-serve-static-core" {
  interface Request {
    session?: any;
  }
}

// Middleware to attach the session to the request object
export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies["auth_token"];

  if (token == null) {
    return res.status(401).json({ message: "Unauthorized: No session found." });
  }
  req.session = await getAuthJsSession(req, authConfig);
  next();
};

// Middleware to protect routes
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies["auth_token"];

  if (token == null) {
    return res.status(401).json({ message: "Unauthorized: No session found." });
  }

  if (!req.session) {
    return res
      .status(401)
      .json({ message: "You must be logged in to access this resource." });
  }
  next();
};
