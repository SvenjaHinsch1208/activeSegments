import fs from "fs";
import path from "path";
import { type CampaignProfileRow } from "./activeAgentApiService";

interface ReachByChannel {
  component_id?: number;
}

interface SegmentSeedRecord {
  segment_id?: string;
  export_id?: string;
  display_name?: string;
  reach?: ReachByChannel;
}

interface LookalikeSeedRecord {
  lookalike_id?: string;
  export_id?: string;
  display_name?: string;
  kpis?: {
    source_audience_reach?: ReachByChannel;
  } | null;
}

interface LifestyleSeedRecord {
  lifestyle_segment_id?: string;
  export_id?: string;
  display_name?: string;
  reach?: number;
}

interface SegmentsSeedFile {
  segments: SegmentSeedRecord[];
}

interface LookalikesSeedFile {
  lookalikes: LookalikeSeedRecord[];
}

interface LifestyleSeedFile {
  lifestyle_segments: LifestyleSeedRecord[];
}

export interface ReachExportRow {
  longId: string;
  shortId: string;
  name: string;
  reach: string;
}

export interface CampaignExportRow {
  campaignId: string;
  campaignName: string;
  orderName: string;
  advertiserName: string;
  type: string;
  biddingStrategy: string;
  deliveryTechnique: string;
  maxCpm: string;
  optimization: string;
  startTime: string;
  endTime: string;
  totalBudget: string;
  calculatedDailyBudget: string;
  pace: string;
  targetSegment: string;
  profileTargeting: string;
  profileTargetingReadable: string;
}

const readSeedFile = <T>(fileName: string): T | null => {
  const filePath = path.join(process.cwd(), "data", "seeds", fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

const toTextValue = (value: string | undefined): string => {
  return value?.trim() ?? "";
};

const toReachValue = (value: number | undefined): string => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "";
  }
  return `${value}`;
};

const addReachRow = (
  rows: Map<string, ReachExportRow>,
  longId: string | undefined,
  shortId: string | undefined,
  name: string | undefined,
  reach: number | undefined
): void => {
  const normalizedLongId = longId?.trim();
  if (!normalizedLongId || rows.has(normalizedLongId)) {
    return;
  }

  rows.set(normalizedLongId, {
    longId: normalizedLongId,
    shortId: toTextValue(shortId),
    name: toTextValue(name),
    reach: toReachValue(reach),
  });
};

export function buildReachExportRows(): ReachExportRow[] {
  const rows = new Map<string, ReachExportRow>();

  const segments = readSeedFile<SegmentsSeedFile>("segments.json")?.segments ?? [];
  const lookalikes = readSeedFile<LookalikesSeedFile>("lookalikes.json")?.lookalikes ?? [];
  const lifestyle = readSeedFile<LifestyleSeedFile>("lifestyle_segments.json")?.lifestyle_segments ?? [];

  for (const record of segments) {
    addReachRow(
      rows,
      record.segment_id,
      record.export_id,
      record.display_name,
      record.reach?.component_id
    );
  }

  for (const record of lookalikes) {
    addReachRow(
      rows,
      record.lookalike_id,
      record.export_id,
      record.display_name,
      record.kpis?.source_audience_reach?.component_id
    );
  }

  for (const record of lifestyle) {
    addReachRow(
      rows,
      record.lifestyle_segment_id,
      record.export_id,
      record.display_name,
      record.reach
    );
  }

  return Array.from(rows.values());
}

export function buildSegmentNameLookup(rows: ReachExportRow[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const row of rows) {
    lookup.set(row.longId, row.name);
  }

  return lookup;
}

export function replaceSegmentsWithNames(expression: string, segmentNameLookup: Map<string, string>): string {
  if (!expression.trim()) {
    return expression;
  }

  return expression.replace(/'([^']+)'/g, (_match, segmentId: string) => {
    const cleanedSegmentId = segmentId.replace(/^_+|_+$/g, "");
    const replacement = segmentNameLookup.get(cleanedSegmentId) ?? segmentNameLookup.get(segmentId);
    return replacement ? `'${replacement}'` : `'${segmentId}'`;
  });
}

export function buildCampaignExportRows(
  campaignRows: CampaignProfileRow[],
  segmentNameLookup: Map<string, string>
): CampaignExportRow[] {
  return campaignRows.map((campaign) => ({
    campaignId: `${campaign.campaignId}`,
    campaignName: campaign.campaignName,
    orderName: campaign.orderName,
    advertiserName: campaign.advertiserName,
    type: campaign.type,
    biddingStrategy: campaign.biddingStrategy,
    deliveryTechnique: campaign.deliveryTechnique,
    maxCpm: campaign.maxCpm,
    optimization: campaign.optimization,
    startTime: campaign.startTime,
    endTime: campaign.endTime,
    totalBudget: campaign.totalBudget,
    calculatedDailyBudget: campaign.calculatedDailyBudget,
    pace: campaign.pace,
    targetSegment: campaign.targetSegment,
    profileTargeting: campaign.profileTargeting,
    profileTargetingReadable: replaceSegmentsWithNames(campaign.profileTargeting, segmentNameLookup),
  }));
}

