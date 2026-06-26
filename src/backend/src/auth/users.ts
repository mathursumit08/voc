import crypto from "node:crypto";
import { pool } from "../db/pool.js";

export type UserRole = "Admin" | "OemUser" | "DealerUser" | "Reviewer";

export interface PrototypeUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  dealerCode?: string;
}

interface AppUserRow {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  dealerCode: string | null;
  passwordHash: string;
}

function hashPassword(password: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function verifyPassword(password: string, storedPasswordHash: string) {
  const firstSeparatorIndex = storedPasswordHash.indexOf(":");
  const lastSeparatorIndex = storedPasswordHash.lastIndexOf(":");

  if (firstSeparatorIndex <= 0 || lastSeparatorIndex <= firstSeparatorIndex) {
    return false;
  }

  const algorithm = storedPasswordHash.slice(0, firstSeparatorIndex);
  const salt = storedPasswordHash.slice(firstSeparatorIndex + 1, lastSeparatorIndex);
  const hash = storedPasswordHash.slice(lastSeparatorIndex + 1);

  if (algorithm !== "sha256" || !salt || !hash) {
    return false;
  }

  const candidateHash = hashPassword(password, salt);
  return candidateHash.length === hash.length && crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(hash));
}

function mapUser(row: AppUserRow): PrototypeUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    dealerCode: row.dealerCode ?? undefined
  };
}

async function findUserByUsername(username: string) {
  const result = await pool.query<AppUserRow>(
    `
      SELECT
        au.id,
        au.username,
        au.display_name AS "displayName",
        au.role::text AS role,
        d.code AS "dealerCode",
        au.password_hash AS "passwordHash"
      FROM app_users au
      LEFT JOIN dealers d ON d.id = au.dealer_id
      WHERE lower(au.username) = lower($1)
        AND au.is_active = true
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] ?? null;
}

export async function validatePrototypeCredentials(username: string, password: string) {
  const user = await findUserByUsername(username);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  await pool.query("UPDATE app_users SET last_login_at = now(), updated_at = now() WHERE id = $1::uuid", [user.id]);
  return mapUser(user);
}

export async function findPrototypeUserById(userId: string) {
  const result = await pool.query<AppUserRow>(
    `
      SELECT
        au.id,
        au.username,
        au.display_name AS "displayName",
        au.role::text AS role,
        d.code AS "dealerCode",
        au.password_hash AS "passwordHash"
      FROM app_users au
      LEFT JOIN dealers d ON d.id = au.dealer_id
      WHERE au.id = $1::uuid
        AND au.is_active = true
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}
