#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenRootFiles = ["vite.config.ts", "tsconfig.json", "tsconfig.node.json"];
const errors = [];

for (const file of forbiddenRootFiles) {
  if (existsSync(path.join(root, file))) errors.push(`Move ${file} into frontend/`);
}
if (existsSync(path.join(root, "server", "index.ts"))) errors.push("Remove the legacy root server/index.ts");
if (!existsSync(path.join(root, "frontend", "package.json"))) errors.push("frontend/package.json is missing");
if (!existsSync(path.join(root, "frontend", "vite.config.ts"))) errors.push("frontend/vite.config.ts is missing");
if (!existsSync(path.join(root, "backend", "requirements.txt"))) errors.push("backend/requirements.txt is missing");

const rootPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
if (rootPackage.scripts?.dev !== "node scripts/dev.js") {
  errors.push("root npm run dev must delegate to scripts/dev.js");
}
if (!rootPackage.scripts?.backend?.includes("scripts/run-backend.js")) {
  errors.push("root npm run backend must delegate to scripts/run-backend.js");
}

if (errors.length) {
  console.error("Project structure check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Project structure check passed.");
