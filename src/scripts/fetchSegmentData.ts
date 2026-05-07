import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

import * as date from "date-and-time";
import path from "path";
import { mkdirSync } from "fs";
import { ActiveAgentApiService } from "../services/activeAgentApiService";
import { writeJsonLines } from "../services/jsonlWriter";

const TARGET_FILE = path.join(
  process.cwd(),
  process.env.TARGET_SEGMENT_FILE ?? "data/activeagent/targetSegmentList.dev.jsonl"
);
const OUTPUT_DIR  = path.dirname(TARGET_FILE);
const ADD_DAYS    = Number(process.env.TIMESPANINDAYS ?? "0");
const DATE_OFFSET = Number(process.env.DATEOFFSET     ?? "0");

const buildDebugFilePath = (filePath: string): string => {
  const directory = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const match = fileName.match(/^(.*?)(\.[^.]+)?\.jsonl$/);

  if (!match) {
    return path.join(directory, `${fileName}.debug.jsonl`);
  }

  const [, baseName, variant] = match;
  return path.join(directory, `${baseName}Debug${variant ?? ""}.jsonl`);
};

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const now         = new Date();
  const oDateFrom   = date.addDays(now, DATE_OFFSET);
  const dateFrom    = date.format(oDateFrom, "YYYY-MM-DD") + "T00:00";
  const dateTo      = date.format(date.addDays(oDateFrom, ADD_DAYS), "YYYY-MM-DD") + "T23:59";
  const currentDateTime = date.format(now, "YYYYMMDDHHmmss");

  console.table({ currentDateTime, dateFrom, dateTo });

  const api = ActiveAgentApiService.getInstance();
  await api.authentication();

  const targetData = await api.getTargetSegmentsActiveCampaigns({ from: dateFrom, to: dateTo });
  const debugFilePath = buildDebugFilePath(TARGET_FILE);

  console.log(`→ target file: ${TARGET_FILE}`);
  console.log(`→ debug file: ${debugFilePath}`);

  await writeJsonLines(TARGET_FILE, targetData.targetSegmentCampaignCount);
  await writeJsonLines(debugFilePath, targetData.targetSegmentCampaignCountDetails);

  console.log(`✓  ${targetData.targetSegmentCampaignCount.length} segments → ${path.basename(TARGET_FILE)}`);
  console.log(`✓  ${targetData.targetSegmentCampaignCountDetails.length} details → ${path.basename(debugFilePath)}`);
}

main().catch(err => {
  console.error("fetchSegmentData failed:", (err as Error).message);
  process.exit(1);
});

