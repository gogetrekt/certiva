const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { defineConfig } = require("prisma/config");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const fileContents = readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(__dirname, ".env"));
loadEnvFile(resolve(__dirname, "../../.env"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be defined before running Prisma commands.");
}

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --project tsconfig.json prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
