import { Router } from "express";
import { ZipArchive, Archiver } from "archiver";
import path from "path";
import fs from "fs";

const router = Router();

const ROOT = path.resolve(import.meta.dirname, "../../..");

function addDirFiltered(archive: Archiver, srcDir: string, destPrefix: string, ignoreNames: string[] = []) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreNames.includes(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destPrefix, entry.name);
    if (entry.isDirectory()) {
      addDirFiltered(archive, srcPath, destPath, ignoreNames);
    } else {
      archive.file(srcPath, { name: destPath });
    }
  }
}

const IGNORE = ["node_modules", "dist", ".tsbuildinfo", ".turbo", "release", "out"];

router.get("/source", (_req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="sortify-desktop.zip"');

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err: Error) => { res.destroy(err); });
  archive.pipe(res);

  const installMd = [
    "# Sortify Desktop — Build Instructions",
    "",
    "## Requirements",
    "- Node.js 20+ (https://nodejs.org)",
    "- pnpm  →  `npm install -g pnpm`",
    "- **macOS**: Xcode Command Line Tools  →  `xcode-select --install`",
    "- **Windows**: Visual Studio Build Tools (for native module compilation)",
    "",
    "## Build steps",
    "",
    "```bash",
    "# 1. Install dependencies (compiles better-sqlite3 for your platform)",
    "pnpm install",
    "",
    "# 2a. Package for macOS (.dmg)",
    "pnpm --filter @workspace/desktop run package",
    "",
    "# 2b. Package for Windows (.exe)",
    "pnpm --filter @workspace/desktop run package",
    "```",
    "",
    "The installer is written to `artifacts/desktop/release/`.",
    "",
    "## OpenAI API key",
    "After installing, go to Settings → AI Categorization and paste your OpenAI key.",
    "Get one at https://platform.openai.com/api-keys",
  ].join("\n");

  archive.append(installMd, { name: "INSTALL.md" });

  const rootFiles = ["package.json", "pnpm-workspace.yaml", "tsconfig.base.json", "tsconfig.json"];
  for (const f of rootFiles) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) archive.file(p, { name: f });
  }

  addDirFiltered(archive, path.join(ROOT, "artifacts/desktop"), "artifacts/desktop", IGNORE);
  addDirFiltered(archive, path.join(ROOT, "artifacts/email-organizer"), "artifacts/email-organizer", IGNORE);
  addDirFiltered(archive, path.join(ROOT, "lib/api-client-react"), "lib/api-client-react", IGNORE);
  addDirFiltered(archive, path.join(ROOT, "lib/api-zod"), "lib/api-zod", IGNORE);

  archive.finalize();
});

export default router;
