#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { platform } from "node:os";

const ports = process.argv.slice(2).map(Number).filter(Boolean);

if (platform() !== "win32") {
  for (const port of ports) {
    try {
      const pids = execFileSync("sh", ["-c", `lsof -ti :${port} || true`], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean);
      for (const pid of pids) execFileSync("kill", ["-9", pid]);
    } catch {}
  }
  process.exit(0);
}

for (const port of ports) {
  try {
    const output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING") || !line.match(new RegExp(`:${port}\\s`))) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try { execFileSync("taskkill", ["/T", "/F", "/PID", pid], { stdio: "ignore" }); } catch {}
    }
  } catch {}
}
