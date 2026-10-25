import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

// Keep these three paths aligned with PermitPilotLogo.tsx. All install sizes
// derive from the same vector; no bitmap is stretched or used as a source.
const mark = `<path d="M7 2h13l8 8v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="#153a56"/><path d="M20 2v6a2 2 0 0 0 2 2h6L20 2Z" fill="#ad4f20"/><path d="M10 24v-5a5 5 0 0 1 5-5h7m-4-4 4 4-4 4" fill="none" stroke="#fffcf6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
const svg = (content, viewBox = "0 0 32 32") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">PermitPilot</title>${content}</svg>\n`;
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
await mkdir(path.join(publicDir, "brand"), { recursive: true });
await mkdir(path.join(publicDir, "icons"), { recursive: true });
const icon = svg(`<rect width="32" height="32" rx="7" fill="#f5f3ec"/><g transform="translate(2 2) scale(.875)">${mark}</g>`);
const maskable = svg(`<rect width="32" height="32" fill="#f5f3ec"/><g transform="translate(6.5 6.5) scale(.59375)">${mark}</g>`);
const socialCard = svg(`<rect width="1200" height="630" fill="#f5f3ec"/><g transform="translate(80 70) scale(2)">${mark}</g><g fill="#153a56" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><text x="162" y="119" font-size="44" font-weight="650" letter-spacing="-1.8">PermitPilot</text><text x="88" y="284" font-size="72" font-weight="600" letter-spacing="-3.6">Your project.</text><text x="88" y="371" font-size="72" font-weight="600" letter-spacing="-3.6">A clearer path forward.</text><text x="88" y="492" fill="#5c574e" font-size="27" letter-spacing="-.4">Roadmaps · Documents · Fee estimates</text><text x="88" y="561" fill="#5c574e" font-size="18">Demonstration planning guidance</text></g><path d="M88 420h1024" stroke="#d4cec0" stroke-width="1"/>`, "0 0 1200 630");
await writeFile(path.join(publicDir, "icon.svg"), icon);
await writeFile(path.join(publicDir, "brand/permitpilot-mark.svg"), svg(mark));
await writeFile(path.join(publicDir, "brand/permitpilot-wordmark.svg"), svg(`<g transform="scale(1.5)">${mark}</g><text x="59" y="34" fill="#153a56" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="29" font-weight="650" letter-spacing="-1.1">PermitPilot</text>`, "0 0 236 48"));
await Promise.all([
  sharp(Buffer.from(icon)).resize(192, 192).png().toFile(path.join(publicDir, "icons/icon-192.png")),
  sharp(Buffer.from(icon)).resize(512, 512).png().toFile(path.join(publicDir, "icons/icon-512.png")),
  sharp(Buffer.from(icon)).resize(180, 180).png().toFile(path.join(publicDir, "icons/apple-touch-icon.png")),
  sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(path.join(publicDir, "icons/maskable-512.png")),
  sharp(Buffer.from(socialCard)).resize(1200, 630).png().toFile(path.join(publicDir, "brand/social-card.png")),
]);
console.log("Generated PermitPilot SVG, install icons and 1200x630 social card from the shared vector mark.");
