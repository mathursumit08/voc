import crypto from "node:crypto";
import { env } from "../config/env.js";
import type { PrototypeUser, UserRole } from "./users.js";

export interface AuthTokenPayload {
  sub: string;
  username: string;
  displayName: string;
  role: UserRole;
  dealerCode?: string;
  tokenType: "Access" | "Refresh";
  exp: number;
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

function sign(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

function createToken(user: PrototypeUser, tokenType: "Access" | "Refresh", ttlSeconds: number, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: AuthTokenPayload = {
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    dealerCode: user.dealerCode,
    tokenType,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const unsignedToken = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;

  return `${unsignedToken}.${sign(unsignedToken, secret)}`;
}

export function createAuthTokens(user: PrototypeUser) {
  return {
    accessToken: createToken(user, "Access", env.JWT_ACCESS_TOKEN_TTL_SECONDS, env.JWT_ACCESS_SECRET),
    refreshToken: createToken(user, "Refresh", env.JWT_REFRESH_TOKEN_TTL_SECONDS, env.JWT_REFRESH_SECRET),
    expiresIn: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
    user
  };
}

export function verifyToken(token: string, tokenType: "Access" | "Refresh") {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error("Invalid token format.");
  }

  const secret = tokenType === "Access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(unsignedToken, secret);

  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthTokenPayload;

  if (payload.tokenType !== tokenType) {
    throw new Error("Invalid token type.");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired.");
  }

  return payload;
}
