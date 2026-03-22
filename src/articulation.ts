import * as readline from "readline";
import { getClient, MODEL, MAX_TOKENS } from "./lib/claude";
import { ARTICULATION_SYSTEM, articulationQuestions } from "./lib/prompts";
import { writeMd, readMd } from "./utils/markdown";
import { getComposer, upsertComposer } from "./utils/tier";

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function runArticulation(composerArg: string): Promise<void> {
  const composerId = composerArg.toLowerCase().replace(/\s+/g, "-");

  // skeleton が存在するか確認
  const skeleton = readMd(composerId, "skeleton.md");
  if (!skeleton) {
    console.error(`${composerArg} の skeleton.md が見つかりません。先に skeleton.ts を実行してください。`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const client = getClient();
  const questions = articulationQuestions(composerArg);
  const today = new Date().toISOString().split("T")[0];

  let output = `# ${composerArg} — Articulation Record\n\n## テスト日: ${today}\n`;
  const gaps: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const qNum = i + 1;
    const qLabel = ["この作曲家の音楽を一言で言うと？", "同時代の作曲家と何が違う？", "初めて聴く人に最初の1曲を薦めるなら？"][i];

    console.log(`\n--- Q${qNum}: ${qLabel} ---`);
    console.log(questions[i]);

    const userAnswer = await ask(rl, "\nあなたの回答: ");

    console.log("\nAIがフィードバックを生成中...");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: ARTICULATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: `作曲家: ${composerArg}\n\n以下は骨格リサーチの内容です:\n${skeleton}\n\n質問: ${questions[i]}\n\nユーザーの回答: ${userAnswer}\n\nこの回答を評価し、フィードバックとギャップ（知識の穴）を指摘してください。`,
        },
      ],
    });

    const feedback = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    console.log(`\n${feedback}`);

    output += `\n### Q${qNum}: ${qLabel}\n`;
    output += `**自分の回答:** ${userAnswer}\n\n`;
    output += `**AIフィードバック:** ${feedback}\n\n`;

    // ギャップ抽出（簡易: "ギャップ" を含む行を収集）
    const gapLines = feedback.split("\n").filter((l) => l.includes("ギャップ") || l.includes("- [ ]"));
    if (gapLines.length > 0) {
      output += `**ギャップ:** ${gapLines.join("\n")}\n`;
      gaps.push(...gapLines);
    }
  }

  output += "\n## 追加リサーチ項目\n";
  if (gaps.length > 0) {
    for (const gap of gaps) {
      output += `- [ ] ${gap.replace(/^[-*]\s*(\[.\]\s*)?/, "")}\n`;
    }
  } else {
    output += "- （なし）\n";
  }

  rl.close();

  // 保存
  const filepath = writeMd(composerId, "articulation.md", output);
  console.log(`\nArticulation記録を保存しました: ${filepath}`);

  // composers.json 更新
  const existing = getComposer(composerId);
  if (existing) {
    upsertComposer({
      ...existing,
      articulation: "done",
      gaps: gaps.length,
      lastUpdated: today,
    });
    console.log("composers.json を更新しました。");
  }
}

// CLI
const composerName = process.argv[2];
if (!composerName) {
  console.error("使い方: npx ts-node src/articulation.ts <作曲家名>");
  process.exit(1);
}

runArticulation(composerName).catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
