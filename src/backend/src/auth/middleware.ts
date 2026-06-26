import type { RequestHandler } from "express";
import type { UserRole } from "./users.js";
import { verifyToken } from "./jwt.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  try {
    req.user = verifyToken(token, "Access");
    next();
  } catch (error) {
    res.status(401).json({ message: error instanceof Error ? error.message : "Invalid bearer token." });
  }
};

export function requireRole(roles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "You do not have permission to perform this action." });
      return;
    }

    next();
  };
}
