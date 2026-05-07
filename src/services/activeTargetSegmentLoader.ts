import fs from "fs";
import readline from "readline";
import path from "path";
import { type TargetSegmentCount } from "./activeAgentApiService";

// Re-export under the loader-facing alias
export type TargetSegmentItem = TargetSegmentCount;

const resolveFilePath = (): string =>
  path.join(
    process.cwd(),
    process.env.TARGET_SEGMENT_FILE ?? "data/activeagent/targetSegmentList.dev.jsonl"
  );

export async function loadTargetSegments(): Promise<TargetSegmentCount[]> {
  const filePath = resolveFilePath();

  if (!fs.existsSync(filePath)) {
    console.warn(`[activeTargetSegmentLoader] Data file not found: ${filePath}`);
    return [];
  }

  const fileStream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const items: TargetSegmentCount[] = [];
  for await (const line of rl) {
    if (line.trim()) {
      items.push(JSON.parse(line) as TargetSegmentCount);
    }
  }
  return items;
}
