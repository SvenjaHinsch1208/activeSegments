import { type TargetSegmentItem } from "./activeTargetSegmentLoader";
import { type SegmentMetadata } from "./segmentMetadataService";

type SegmentStatusTone = "active" | "draft" | "error";

export interface SegmentTableRow {
  shortId: string;
  name: string;
  description: string;
  type: string;
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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return EMPTY_VALUE;
  }

  return parsed.toISOString().split("T")[0];
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
      used: segment.count,
      endDate: formatEndDate(segment.endTime),
      author: metadata?.author ?? EMPTY_VALUE,
      modifier: metadata?.modifier ?? EMPTY_VALUE,
      statusTone: mapStatusToTone(metadata?.status),
      isShortIdWarning: segment.targetSegment.length > 5,
    };
  });
}

