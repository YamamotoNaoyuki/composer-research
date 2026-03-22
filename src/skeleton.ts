import { getClient, MODEL, MAX_TOKENS } from "./lib/claude";
import { SKELETON_SYSTEM, skeletonUserPrompt } from "./lib/prompts";
import { writeMd } from "./utils/markdown";
import { upsertComposer, getComposer } from "./utils/tier";
import { ComposerEntry } from "./lib/types";

async function generateSkeleton(composerArg: string): Promise<void> {
  const composerId = composerArg.toLowerCase().replace(/\s+/g, "-");
  console.log(`\n骨格リサーチを開始: ${composerArg}\n`);

  const client = getClient();

  console.log("Claude API + web_search で情報を収集中...\n");

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
        content: skeletonUserPrompt(composerArg),
      },
    ],
  });

  // テキストブロックを結合
  const textBlocks = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text);

  const skeletonContent = textBlocks.join("\n\n");

  // ファイル保存
  const filepath = writeMd(composerId, "skeleton.md", skeletonContent);
  console.log(`\n骨格ノートを保存しました: ${filepath}`);

  // composers.json 更新
  const existing = getComposer(composerId);
  const entry: ComposerEntry = existing
    ? { ...existing, skeleton: "draft", lastUpdated: new Date().toISOString().split("T")[0] }
    : {
        id: composerId,
        nameJa: composerArg,
        nameOriginal: composerArg,
        tier: 2,
        skeleton: "draft",
        articulation: "none",
        gaps: 0,
        lastUpdated: new Date().toISOString().split("T")[0],
      };
  upsertComposer(entry);
  console.log("composers.json を更新しました。");

  console.log("\n⚠️  AI生成内容です。レビューステータスを確認し、信頼できるソースで裏取りしてください。");
}

// CLI
const composerName = process.argv[2];
if (!composerName) {
  console.error("使い方: npx ts-node src/skeleton.ts <作曲家名>");
  console.error("例: npx ts-node src/skeleton.ts Debussy");
  process.exit(1);
}

generateSkeleton(composerName).catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
