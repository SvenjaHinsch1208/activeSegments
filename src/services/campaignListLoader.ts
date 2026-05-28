import fs from "fs";
import path from "path";
import readline from "readline";

export interface CampaignListItem {
  campaignId: number;
  campaignName: string;
  orderName: string;
  advertiserName: string;
  type: string;
  biddingStrategy: string;
  startTime: string;
  endTime: string;
  profileTargeting: string;
  profileTargetingReadable: string;
}

const resolveFilePath = (): string =>
  path.join(
    process.cwd(),
    process.env.CAMPAIGN_LIST_FILE ?? "data/activeagent/campaignList.dev.jsonl"
  );

export async function loadCampaignList(): Promise<CampaignListItem[]> {
  const filePath = resolveFilePath();

  if (!fs.existsSync(filePath)) {
    console.warn(`[campaignListLoader] Data file not found: ${filePath}`);
    return [];
  }

  const fileStream = fs.createReadStream(filePath, "utf-8");
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  const items: CampaignListItem[] = [];

  for await (const line of rl) {
    if (line.trim()) {
      items.push(JSON.parse(line) as CampaignListItem);
    }
  }

  return items;
}

