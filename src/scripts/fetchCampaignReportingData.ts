import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

import * as date from "date-and-time";
import path from "path";
import { mkdirSync } from "fs";
import { ActiveAgentApiService } from "../services/activeAgentApiService";
import { type CampaignProfileRow } from "../services/activeAgentApiService";
import { type CampaignListItem } from "../services/campaignListLoader";
import {
  buildCampaignExportRows,
  buildReachExportRows,
  buildSegmentNameLookup,
  replaceSegmentsWithNames,
  type CampaignExportRow,
  type ReachExportRow,
} from "../services/reportingExportService";
import { writeCsvFile } from "../services/csvWriter";
import { writeJsonLines } from "../services/jsonlWriter";

const CAMPAIGN_OUTPUT_FILE = path.join(
  process.cwd(),
  process.env.CAMPAIGN_OUTPUT_FILE ?? "data/output/Campaign_data_python.csv"
);

const REACH_OUTPUT_FILE = path.join(
  process.cwd(),
  process.env.REACH_OUTPUT_FILE ?? "data/output/reichweite_python.csv"
);

const CAMPAIGN_LIST_FILE = path.join(
  process.cwd(),
  process.env.CAMPAIGN_LIST_FILE ?? "data/activeagent/campaignList.dev.jsonl"
);

const ADD_DAYS = Number(process.env.TIMESPANINDAYS ?? "0");
const DATE_OFFSET = Number(process.env.DATEOFFSET ?? "0");

const CAMPAIGN_HEADERS: ReadonlyArray<keyof CampaignExportRow> = [
  "campaignId",
  "campaignName",
  "orderName",
  "advertiserName",
  "type",
  "biddingStrategy",
  "deliveryTechnique",
  "maxCpm",
  "optimization",
  "startTime",
  "endTime",
  "totalBudget",
  "calculatedDailyBudget",
  "pace",
  "targetSegment",
  "profileTargeting",
  "profileTargetingReadable",
];

interface ReachExportCsvRow {
  "Long ID": string;
  "Short ID": string;
  Name: string;
  Reach: string;
}

const REACH_HEADERS: ReadonlyArray<keyof ReachExportCsvRow> = [
  "Long ID",
  "Short ID",
  "Name",
  "Reach",
];

const toReachExportCsvRows = (rows: ReachExportRow[]): ReachExportCsvRow[] =>
  rows.map((row) => ({
    "Long ID": row.longId,
    "Short ID": row.shortId,
    Name: row.name,
    Reach: row.reach,
  }));

const toCampaignListItems = (
  rows: CampaignProfileRow[],
  segmentNameLookup: Map<string, string>
): CampaignListItem[] => {
  const uniqueByCampaignId = new Map<number, CampaignListItem>();

  for (const row of rows) {
    if (uniqueByCampaignId.has(row.campaignId)) {
      continue;
    }

    uniqueByCampaignId.set(row.campaignId, {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      orderName: row.orderName,
      advertiserName: row.advertiserName,
      type: row.type,
      biddingStrategy: row.biddingStrategy,
      startTime: row.startTime,
      endTime: row.endTime,
      profileTargeting: row.profileTargeting,
      profileTargetingReadable: replaceSegmentsWithNames(row.profileTargeting, segmentNameLookup),
    });
  }

  return Array.from(uniqueByCampaignId.values());
};

async function main(): Promise<void> {
  mkdirSync(path.dirname(CAMPAIGN_OUTPUT_FILE), { recursive: true });
  mkdirSync(path.dirname(REACH_OUTPUT_FILE), { recursive: true });
  mkdirSync(path.dirname(CAMPAIGN_LIST_FILE), { recursive: true });

  const now = new Date();
  const dateFrom = date.format(date.addDays(now, DATE_OFFSET), "YYYY-MM-DD") + "T00:00";
  const dateTo = date.format(date.addDays(now, DATE_OFFSET + ADD_DAYS), "YYYY-MM-DD") + "T23:59";

  const api = ActiveAgentApiService.getInstance();
  await api.authentication();

  const campaignRows = await api.getCampaignProfileRows({ from: dateFrom, to: dateTo });
  const reachRows = buildReachExportRows();

  const segmentNameLookup = buildSegmentNameLookup(reachRows);
  const campaignExportRows = buildCampaignExportRows(campaignRows, segmentNameLookup);

  await writeCsvFile(CAMPAIGN_OUTPUT_FILE, CAMPAIGN_HEADERS, campaignExportRows);
  await writeCsvFile(REACH_OUTPUT_FILE, REACH_HEADERS, toReachExportCsvRows(reachRows));

  const campaignListItems = toCampaignListItems(campaignRows, segmentNameLookup);
  await writeJsonLines(CAMPAIGN_LIST_FILE, campaignListItems);

  console.log(`✓  ${campaignExportRows.length} rows → ${path.basename(CAMPAIGN_OUTPUT_FILE)}`);
  console.log(`✓  ${reachRows.length} rows → ${path.basename(REACH_OUTPUT_FILE)}`);
  console.log(`✓  ${campaignListItems.length} campaigns → ${path.basename(CAMPAIGN_LIST_FILE)}`);
}

main().catch((err) => {
  console.error("fetchCampaignReportingData failed:", (err as Error).message);
  process.exit(1);
});
