#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Repo root, then the Next app
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "apps", "web");
// Where `next build` drops the standalone server
const standalone = path.join(web, ".next", "standalone");
const server = path.join(standalone, "server.js");
// PORT and HOSTNAME can be overridden in the environment
const port = process.env.PORT?.trim() || "3000";
const hostname = process.env.HOSTNAME?.trim() || "127.0.0.1";

// Reject a bad port before we touch the build
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("PORT must be a whole number from 1 to 65535.");
  process.exit(1);
}
// HOSTNAME has to be a simple host or IP
if (!/^[a-zA-Z0-9.:_-]{1,253}$/.test(hostname)) {
  console.error("HOSTNAME must be a hostname or IP address, such as 127.0.0.1 or 0.0.0.0.");
  process.exit(1);
}
// The standalone server and the static build both have to be there
if (!existsSync(server) || !existsSync(path.join(web, ".next", "static"))) {
  console.error("The production build is missing. Run npm run build before npm start.");
  process.exit(1);
}

// Next's standalone output deliberately omits these public/static assets.
// Copy them into the package expected by its supported server entry point.
try {
  mkdirSync(path.join(standalone, ".next"), { recursive: true });
  cpSync(path.join(web, "public"), path.join(standalone, "public"), { recursive: true, force: true });
  cpSync(path.join(web, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true, force: true });
  // legal-sources is optional. Copy it when the folder exists.
  const sources = path.join(web, "legal-sources");
  if (existsSync(sources)) cpSync(sources, path.join(standalone, "legal-sources"), { recursive: true, force: true });
} catch {
  // A failed copy should stop us from starting a half-built server
  console.error("Could not prepare the standalone assets. Check permissions for apps/web/.next and rebuild.");
  process.exit(1);
}

// Start Next's standalone server with the port and host we just checked
const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env: { ...process.env, NODE_ENV: "production", PORT: port, HOSTNAME: hostname },
  stdio: "inherit",
  windowsHide: true,
});
// Ctrl-C and kill should stop the child too
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
// The process itself failed to start
child.once("error", (error) => {
  console.error(`Could not start PermitPilot: ${error.message}`);
  process.exitCode = 1;
});
// Pass the child's exit code back to the shell
child.once("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
