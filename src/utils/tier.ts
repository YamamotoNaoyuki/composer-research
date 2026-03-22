import * as fs from "fs";
import * as path from "path";
import { ComposerData, ComposerEntry, Tier } from "../lib/types";

const DATA_FILE = path.join(__dirname, "..", "..", "data", "composers.json");

function loadData(): ComposerData {
  if (!fs.existsSync(DATA_FILE)) {
    return { composers: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveData(data: ComposerData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function getComposer(id: string): ComposerEntry | undefined {
  return loadData().composers.find((c) => c.id === id);
}

export function upsertComposer(entry: ComposerEntry): void {
  const data = loadData();
  const idx = data.composers.findIndex((c) => c.id === entry.id);
  if (idx >= 0) {
    data.composers[idx] = entry;
  } else {
    data.composers.push(entry);
  }
  saveData(data);
}

export function listByTier(): Record<Tier, ComposerEntry[]> {
  const data = loadData();
  const result: Record<Tier, ComposerEntry[]> = { 1: [], 2: [], 3: [] };
  for (const c of data.composers) {
    result[c.tier].push(c);
  }
  return result;
}

export function setTier(id: string, tier: Tier): void {
  const data = loadData();
  const composer = data.composers.find((c) => c.id === id);
  if (!composer) {
    console.error(`作曲家 "${id}" が見つかりません。`);
    process.exit(1);
  }
  composer.tier = tier;
  saveData(data);
  console.log(`${composer.nameJa}（${composer.nameOriginal}）のティアを ${tier} に変更しました。`);
}

// CLI
if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === "list") {
    const byTier = listByTier();
    for (const tier of [1, 2, 3] as Tier[]) {
      console.log(`\n=== Tier ${tier} ===`);
      if (byTier[tier].length === 0) {
        console.log("  （なし）");
      }
      for (const c of byTier[tier]) {
        console.log(`  ${c.nameJa}（${c.nameOriginal}）— Skeleton: ${c.skeleton}, Articulation: ${c.articulation}`);
      }
    }
  } else if (cmd === "set" && args.length === 2) {
    const tier = parseInt(args[1]) as Tier;
    if (![1, 2, 3].includes(tier)) {
      console.error("ティアは 1, 2, 3 のいずれかを指定してください。");
      process.exit(1);
    }
    setTier(args[0], tier);
  } else {
    console.log("使い方:");
    console.log("  npx ts-node src/utils/tier.ts list");
    console.log("  npx ts-node src/utils/tier.ts set <composer-id> <1|2|3>");
  }
}
