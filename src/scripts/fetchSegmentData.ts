import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

import * as date from "date-and-time";
import path from "path";
import { mkdirSync } from "fs";
import { ActiveAgentApiService } from "../services/activeAgentApiService";
import { writeJsonLines } from "../services/jsonlWriter";

const OUTPUT_DIR  = path.join(process.cwd(), "data", "activeagent");
const ADD_DAYS    = Number(process.env.TIMESPANINDAYS ?? "0");
const DATE_OFFSET = Number(process.env.DATEOFFSET     ?? "0");

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

  await writeJsonLines(
    path.join(OUTPUT_DIR, "targetSegmentList.dev.jsonl"),
    targetData.targetSegmentCampaignCount
  );
  await writeJsonLines(
    path.join(OUTPUT_DIR, "targetSegmentListDebug.dev.jsonl"),
    targetData.targetSegmentCampaignCountDetails
  );

  console.log(`✓  ${targetData.targetSegmentCampaignCount.length} segments → targetSegmentList.dev.jsonl`);
  console.log(`✓  ${targetData.targetSegmentCampaignCountDetails.length} details → targetSegmentListDebug.dev.jsonl`);
}

main().catch(err => {
  console.error("fetchSegmentData failed:", (err as Error).message);
  process.exit(1);
});

