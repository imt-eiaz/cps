import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

let hasLoadedEnv = false;

export function loadEnv() {
  if (hasLoadedEnv) {
    return;
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(currentDir, "../..");
  const envCandidates = [
    path.join(backendRoot, ".env"),
    path.join(backendRoot, "env"),
  ];

  let loaded = false;

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const result = config({ path: envPath });
    if (!result.error) {
      loaded = true;
      break;
    }
  }

  if (!loaded) {
    config();
  }

  hasLoadedEnv = true;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to backend/.env or backend/env.`,
    );
  }

  return value.trim();
}
