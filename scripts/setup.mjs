#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Repo root is the parent of this scripts folder
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The Next app lives here
const web = path.join(root, "apps", "web");
// Supabase's current client requires Node.js 22 or newer.
const [major, minor] = process.versions.node.split(".").map(Number);

// Stop here if Node is too old for the Supabase client
if (Number.isNaN(major) || major < 22 || (major === 22 && minor < 12)) {
  console.error(`PermitPilot needs Node.js 22.12 or newer. You have ${process.version}.`);
  console.error("Install it from https://nodejs.org and run this again.");
  process.exit(1);
}

// Run a command in a folder and stop the script if it fails
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  // A non-zero status means the install failed
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Installing PermitPilot…");
// root first then the actual next app
run("npm", ["install"], root);
run("npm", ["install"], web);

// Tell the student how to start the app
console.log("");
console.log("Ready. Start it with:");
console.log("  npm run dev");
console.log("");
console.log("Then open http://127.0.0.1:3000");
