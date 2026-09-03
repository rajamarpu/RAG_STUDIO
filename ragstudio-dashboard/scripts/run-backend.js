#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const windowsPython = path.join(backend, "venv", "Scripts", "python.exe");
const unixPython = path.join(backend, "venv", "bin", "python");
const python = existsSync(windowsPython) ? windowsPython : existsSync(unixPython) ? unixPython : "python";
const args = ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"];

console.log(`[backend] using python: ${python}`);
console.log(`[backend] starting uvicorn on http://localhost:8000 (cwd: ${backend}) ...`);
const child = spawn(python, args, {
  cwd: backend,
  stdio: "inherit",
  env: { ...process.env, LLM_PROVIDER: "ollama", NO_PROXY: "localhost,127.0.0.1,::1,ollama,host.docker.internal", no_proxy: "localhost,127.0.0.1,::1,ollama,host.docker.internal" },
});

child.on("error", (error) => {
  console.error(`[backend] failed to start: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
