#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "apps", "web");
const major = Number(process.versions.node.split(".")[0]);

if (Number.isNaN(major) || major < 20) {
  console.error(`PermitPilot needs Node.js 20 or newer. You have ${process.version}.`);
  console.error("Install it from https://nodejs.org and run this again.");
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Installing PermitPilot…");
run("npm", ["install"], root);
run("npm", ["install"], web);

console.log("");
console.log("Ready. Start it with:");
console.log("  npm run dev");
console.log("");
console.log("Then open http://127.0.0.1:3000");
