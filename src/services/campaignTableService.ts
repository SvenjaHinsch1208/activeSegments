import { type CampaignListItem } from "./campaignListLoader";
import { type TargetSegmentItem } from "./activeTargetSegmentLoader";
import { type SegmentMetadata } from "./segmentMetadataService";

export interface CampaignSegmentRef {
  shortId: string;
  name: string;
}

export interface CampaignTableRow {
  campaignId: string;
  campaignName: string;
  orderName: string;
  advertiserName: string;
  type: string;
  biddingStrategy: string;
  startDate: string;
  endDate: string;
  segments: CampaignSegmentRef[];
  segmentCount: number;
  profileTargeting: string;
  profileTargetingReadable: string;
}

const EMPTY_VALUE = "-";

const formatDate = (value: string): string => {
  if (!value || value === EMPTY_VALUE) {
    return EMPTY_VALUE;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return EMPTY_VALUE;
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
};

const toDisplayValue = (value: string): string => {
  const trimmed = value?.trim();
  return trimmed || EMPTY_VALUE;
};

export function buildSegmentsByCampaignLookup(
  segments: TargetSegmentItem[],
  metadataLookup: Map<string, SegmentMetadata>
): Map<string, CampaignSegmentRef[]> {
  const lookup = new Map<string, CampaignSegmentRef[]>();

  segments.forEach((segment) => {
    const ids = (segment.campaignIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return;
    }

    const ref: CampaignSegmentRef = {
      shortId: segment.targetSegment,
      name: metadataLookup.get(segment.targetSegment)?.name ?? EMPTY_VALUE,
    };

    ids.forEach((id) => {
      const list = lookup.get(id);
      if (list) {
        list.push(ref);
      } else {
        lookup.set(id, [ref]);
      }
    });
  });

  return lookup;
}

export function buildCampaignTableRows(
  items: CampaignListItem[],
  segmentsByCampaign: Map<string, CampaignSegmentRef[]> = new Map()
): CampaignTableRow[] {
  return items.map((item) => {
    const campaignId = `${item.campaignId}`;
    const segments = segmentsByCampaign.get(campaignId) ?? [];
    return {
      campaignId,
      campaignName: toDisplayValue(item.campaignName),
      orderName: toDisplayValue(item.orderName),
      advertiserName: toDisplayValue(item.advertiserName),
      type: toDisplayValue(item.type),
      biddingStrategy: toDisplayValue(item.biddingStrategy),
      startDate: formatDate(item.startTime),
      endDate: formatDate(item.endTime),
      segments,
      segmentCount: segments.length,
      profileTargeting: item.profileTargeting?.trim() ?? "",
      profileTargetingReadable: item.profileTargetingReadable?.trim() ?? "",
    };
  });
}
