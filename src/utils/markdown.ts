import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data", "composers");
const TEMPLATE_DIR = path.join(__dirname, "..", "..", "templates");

export function ensureComposerDir(composerId: string): string {
  const dir = path.join(DATA_DIR, composerId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readTemplate(name: string): string {
  return fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.md`), "utf-8");
}

export function writeMd(composerId: string, filename: string, content: string): string {
  const dir = ensureComposerDir(composerId);
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, content, "utf-8");
  return filepath;
}

export function readMd(composerId: string, filename: string): string | null {
  const filepath = path.join(DATA_DIR, composerId, filename);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, "utf-8");
}

export function composerExists(composerId: string): boolean {
  return fs.existsSync(path.join(DATA_DIR, composerId));
}
