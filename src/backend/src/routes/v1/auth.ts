import { Router } from "express";
import { createAuthTokens, verifyToken } from "../../auth/jwt.js";
import { findPrototypeUserById, validatePrototypeCredentials } from "../../auth/users.js";

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res, next) => {
  const username = req.body?.username?.toString() ?? "";
  const password = req.body?.password?.toString() ?? "";

  try {
    const user = await validatePrototypeCredentials(username, password);

    if (!user) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    res.json(createAuthTokens(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.body?.refreshToken?.toString();

  if (!refreshToken) {
    res.status(400).json({ message: "refreshToken is required." });
    return;
  }

  try {
    const payload = verifyToken(refreshToken, "Refresh");
    const user = await findPrototypeUserById(payload.sub);

    if (!user) {
      res.status(401).json({ message: "User no longer exists." });
      return;
    }

    res.json(createAuthTokens(user));
  } catch (error) {
    res.status(401).json({ message: error instanceof Error ? error.message : "Invalid refresh token." });
  }
});
