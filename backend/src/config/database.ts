import pg from "pg";
import { getRequiredEnv, loadEnv } from "./env.js";

loadEnv();

const { Pool } = pg;

function parseDbPort(value: string | undefined): number {
  if (!value || value.trim() === "") {
    return 5432;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid DB_PORT value: ${value}`);
  }

  return parsed;
}

function parseEnvBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function isSslEnabled(databaseUrl?: string): boolean {
  const defaultFromUrl =
    typeof databaseUrl === "string" &&
    /sslmode=(require|verify-ca|verify-full|no-verify)/i.test(databaseUrl);

  return parseEnvBoolean(process.env.DB_SSL, defaultFromUrl);
}

function normalizeConnectionString(
  databaseUrl: string,
  allowSelfSigned: boolean,
): string {
  if (!allowSelfSigned) {
    return databaseUrl;
  }

  if (/sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)) {
    return databaseUrl.replace(
      /sslmode=(require|verify-ca|verify-full)/i,
      "sslmode=no-verify",
    );
  }

  if (!/sslmode=/i.test(databaseUrl)) {
    const separator = databaseUrl.includes("?") ? "&" : "?";
    return `${databaseUrl}${separator}sslmode=no-verify`;
  }

  return databaseUrl;
}

const rawConnectionString =
  typeof process.env.DATABASE_URL === "string"
    ? process.env.DATABASE_URL.trim()
    : "";

const allowSelfSigned = parseEnvBoolean(
  process.env.DB_SSL_ALLOW_SELF_SIGNED,
  process.env.NODE_ENV !== "production",
);

const connectionString = rawConnectionString
  ? normalizeConnectionString(rawConnectionString, allowSelfSigned)
  : "";

const ssl = isSslEnabled(connectionString)
  ? { rejectUnauthorized: !allowSelfSigned }
  : false;

export const pool = new Pool({
  ...(connectionString
    ? {
        connectionString,
      }
    : {
        user: getRequiredEnv("DB_USER"),
        password: getRequiredEnv("DB_PASSWORD"),
        host: getRequiredEnv("DB_HOST"),
        port: parseDbPort(process.env.DB_PORT),
        database: getRequiredEnv("DB_NAME"),
      }),
  ssl,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query:", {
      text,
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getConnection() {
  return pool.connect();
}

export async function closePool() {
  return pool.end();
}

export default pool;
