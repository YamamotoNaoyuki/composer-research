import * as fs from "fs";
import * as path from "path";
import { getClient, MODEL, MAX_TOKENS } from "./lib/claude";
import { SKELETON_SYSTEM } from "./lib/prompts";
import { readMd, writeMd } from "./utils/markdown";

const DATA_DIR = path.join(__dirname, "..", "data", "composers");

function listAllGaps(): void {
  if (!fs.existsSync(DATA_DIR)) {
    console.log("データがありません。");
    return;
  }

  const composers = fs.readdirSync(DATA_DIR).filter((d) =>
    fs.statSync(path.join(DATA_DIR, d)).isDirectory()
  );

  let totalGaps = 0;

  for (const composerId of composers) {
    const articulation = readMd(composerId, "articulation.md");
    const gaps = readMd(composerId, "gaps.md");

    const gapItems: string[] = [];

    if (articulation) {
      const lines = articulation.split("\n");
      for (const line of lines) {
        if (line.match(/^- \[ \]/)) {
          gapItems.push(line);
        }
      }
    }

    if (gaps) {
      const lines = gaps.split("\n");
      for (const line of lines) {
        if (line.match(/^- \[ \]/)) {
          gapItems.push(line);
        }
      }
    }

    if (gapItems.length > 0) {
      console.log(`\n=== ${composerId} (${gapItems.length}件) ===`);
      for (const item of gapItems) {
        console.log(`  ${item}`);
      }
      totalGaps += gapItems.length;
    }
  }

  if (totalGaps === 0) {
    console.log("未解消のギャップはありません。");
  } else {
    console.log(`\n合計: ${totalGaps}件の未解消ギャップ`);
  }
}

async function resolveGaps(composerArg: string): Promise<void> {
  const composerId = composerArg.toLowerCase().replace(/\s+/g, "-");
  const articulation = readMd(composerId, "articulation.md");
  const existingGaps = readMd(composerId, "gaps.md");

  const gapItems: string[] = [];

  for (const content of [articulation, existingGaps]) {
    if (content) {
      for (const line of content.split("\n")) {
        if (line.match(/^- \[ \]/)) {
          gapItems.push(line.replace(/^- \[ \]\s*/, ""));
        }
      }
    }
  }

  if (gapItems.length === 0) {
    console.log(`${composerArg} に未解消のギャップはありません。`);
    return;
  }

  console.log(`\n${composerArg} の未解消ギャップ (${gapItems.length}件):`);
  gapItems.forEach((g, i) => console.log(`  ${i + 1}. ${g}`));

  const skeleton = readMd(composerId, "skeleton.md") || "";

  console.log("\nClaude API + web_search でギャップを調査中...\n");

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SKELETON_SYSTEM,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 10,
      },
    ],
    messages: [
      {
        role: "user",
        content: `作曲家「${composerArg}」について、以下のギャップ（知識の穴）を埋める追加リサーチをしてください。

既存の骨格ノート:
${skeleton}

調査すべきギャップ:
${gapItems.map((g, i) => `${i + 1}. ${g}`).join("\n")}

各ギャップに対して、信頼できるソースに基づいた回答を提供してください。`,
      },
    ],
  });

  const researchResult = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("\n\n");

  const today = new Date().toISOString().split("T")[0];
  const gapsContent = `# ${composerArg} — ギャップ追加リサーチ\n\n## 調査日: ${today}\n\n${researchResult}\n\n## 元のギャップ項目\n${gapItems.map((g) => `- [x] ${g}`).join("\n")}\n`;

  const filepath = writeMd(composerId, "gaps.md", gapsContent);
  console.log(`\nギャップリサーチを保存しました: ${filepath}`);
}

// CLI
const [cmd, ...args] = process.argv.slice(2);

if (cmd === "list") {
  listAllGaps();
} else if (cmd === "resolve" && args[0]) {
  resolveGaps(args[0]).catch((err) => {
    console.error("エラー:", err.message);
    process.exit(1);
  });
} else {
  console.log("使い方:");
  console.log("  npx ts-node src/gap-tracker.ts list");
  console.log("  npx ts-node src/gap-tracker.ts resolve <作曲家名>");
}
