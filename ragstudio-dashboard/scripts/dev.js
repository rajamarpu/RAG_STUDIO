#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const backendUrl = "http://localhost:8000/";
const frontendPort = process.env.FRONTEND_PORT || "5176";
const children = [];
let ollamaProcess;
let stopping = false;

function commandName(command) {
  return process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
}

function clearDevelopmentPorts() {
  try {
    execFileSync(process.execPath, [path.join(root, "scripts", "kill-ports.js"), "8000", "5176"], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    throw new Error("Could not clear ports 8000 and 5176. Close the existing development services and try again.");
  }
}

async function isReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitFor(url, name, attempts = 30) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await isReady(url)) {
      console.log(`[dev] ${name} is ready`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} did not become ready at ${url}`);
}

function startProcess(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...options,
  });
  child.on("error", (error) => {
    if (!stopping) console.error(`[${label}] ${error.message}`);
  });
  children.push({ label, child });
  return child;
}

function stopProcess(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function ensureOllama() {
  if (await isReady(`${ollamaUrl}/api/tags`)) {
    console.log(`[dev] Ollama is already running at ${ollamaUrl}`);
    return;
  }

  console.log("[dev] Ollama is not running; starting `ollama serve`...");
  ollamaProcess = startProcess("ollama", commandName("ollama"), ["serve"]);
  try {
    await waitFor(`${ollamaUrl}/api/tags`, "Ollama", 30);
  } catch (error) {
    stopProcess(ollamaProcess);
    throw new Error(`${error.message}. Install Ollama from https://ollama.com/download or start it manually.`);
  }
}

async function main() {
  clearDevelopmentPorts();
  await ensureOllama();

  const backend = startProcess("backend", process.execPath, [path.join("scripts", "run-backend.js")]);
  await waitFor(backendUrl, "Backend API");

  const frontendCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const frontendArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npm run dev"] : ["run", "dev"];
  const frontend = startProcess("frontend", frontendCommand, frontendArgs, {
    cwd: path.join(root, "frontend"),
  });

  console.log(`[dev] Frontend: http://localhost:${frontendPort}`);
  console.log("[dev] Backend:  http://localhost:8000/docs");
  console.log("[dev] Press Ctrl+C to stop the development stack.");

  await new Promise((resolve) => {
    backend.once("exit", resolve);
    frontend.once("exit", resolve);
  });
  if (!stopping) {
    await shutdown();
    process.exitCode = 1;
  }
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const { child } of children.reverse()) stopProcess(child);
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

main().catch(async (error) => {
  console.error(`[dev] ${error.message}`);
  await shutdown();
  process.exit(1);
});