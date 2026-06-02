import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "..", "src");
const distDir = join(__dirname, "..", "dist");

if (existsSync(distDir)) {
  for (const entry of readdirSync(distDir)) {
    rmSync(join(distDir, entry), { recursive: true, force: true });
  }
} else {
  mkdirSync(distDir, { recursive: true });
}

const files = ["struct.js", "index.js", "struct.d.ts", "index.d.ts"];
for (const file of files) {
  const src = join(srcDir, file);
  const dest = join(distDir, file);
  if (existsSync(src)) {
    writeFileSync(dest, readFileSync(src));
  }
}

console.log("Build complete: dist/");
