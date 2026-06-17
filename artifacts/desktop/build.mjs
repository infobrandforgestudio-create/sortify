import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const EXTERNAL = [
  "electron",
  "better-sqlite3",
  "*.node",
  "imapflow",
  "mailparser",
  "nodemailer",
];

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/main.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(distDir, "main.js"),
    external: EXTERNAL,
    logLevel: "info",
    sourcemap: true,
  });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/preload.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(distDir, "preload.js"),
    external: ["electron"],
    logLevel: "info",
    sourcemap: true,
  });

  console.log("✅ Build complete → dist/main.js + dist/preload.js");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
