import { type TargetSegmentItem } from "./activeTargetSegmentLoader";
import { type SegmentMetadata } from "./segmentMetadataService";

type SegmentStatusTone = "active" | "draft" | "error";

export interface SegmentTableRow {
  shortId: string;
  name: string;
  description: string;
  type: string;
  reach: string;
  used: number;
  endDate: string;
  author: string;
  modifier: string;
  statusTone: SegmentStatusTone;
  isShortIdWarning: boolean;
}

const EMPTY_VALUE = "-";

const formatEndDate = (value: string | null): string => {
  if (!value) {
    return EMPTY_VALUE;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return EMPTY_VALUE;
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
};

const mapStatusToTone = (status: string | undefined): SegmentStatusTone => {
  if (status === "ACTIVE") {
    return "active";
  }
  if (status === "DRAFT") {
    return "draft";
  }
  return "error";
};

export function buildSegmentTableRows(
  segments: TargetSegmentItem[],
  metadataLookup: Map<string, SegmentMetadata>
): SegmentTableRow[] {
  return segments.map((segment) => {
    const metadata = metadataLookup.get(segment.targetSegment);
    return {
      shortId: segment.targetSegment,
      name: metadata?.name ?? EMPTY_VALUE,
      description: metadata?.description ?? EMPTY_VALUE,
      type: metadata?.type ?? EMPTY_VALUE,
      reach: metadata?.reach ?? EMPTY_VALUE,
      used: segment.count,
      endDate: formatEndDate(segment.endTime),
      author: metadata?.author ?? EMPTY_VALUE,
      modifier: metadata?.modifier ?? EMPTY_VALUE,
      statusTone: mapStatusToTone(metadata?.status),
      isShortIdWarning: segment.targetSegment.length > 5,
    };
  });
}
