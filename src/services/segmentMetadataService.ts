import fs from "fs";
import path from "path";

export interface SegmentMetadata {
  name: string;
  description: string;
  author: string;
  modifier: string;
  status: string;
  type: "SEG" | "LAL" | "LS";
}

interface BaseSeedRecord {
  export_id?: string;
  display_name?: string;
  description?: string;
  original_author?: string;
  version_author?: string;
  status?: string;
}

interface SegmentSeedRecord extends BaseSeedRecord {
  segment_id?: string;
}

interface LookalikeSeedRecord extends BaseSeedRecord {
  lookalike_id?: string;
}

interface LifestyleSeedRecord extends BaseSeedRecord {
  lifestyle_segment_id?: string;
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

const EMPTY_VALUE = "-";

let cachedLookup: Map<string, SegmentMetadata> | null = null;

const readSeedFile = <T>(fileName: string): T | null => {
  const filePath = path.join(process.cwd(), "data", "seeds", fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

const toKeyList = (...keys: Array<string | undefined>): string[] =>
  keys
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

// Mapping policy:
// AUTHOR   -> original_author
// MODIFIER -> version_author
// Missing values remain '-'
const toMetadata = (record: BaseSeedRecord, type: SegmentMetadata["type"]): SegmentMetadata => ({
  name: record.display_name?.trim() || EMPTY_VALUE,
  description: record.description?.trim() || EMPTY_VALUE,
  author: record.original_author?.trim() || EMPTY_VALUE,
  modifier: record.version_author?.trim() || EMPTY_VALUE,
  status: record.status?.trim().toUpperCase() || "UNKNOWN",
  type,
});

const mergeRecords = <T extends BaseSeedRecord>(
  lookup: Map<string, SegmentMetadata>,
  records: T[],
  type: SegmentMetadata["type"],
  keySelector: (record: T) => string[]
): void => {
  for (const record of records) {
    const keys = keySelector(record);
    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, toMetadata(record, type));
      }
    }
  }
};

export function getSegmentMetadataLookup(): Map<string, SegmentMetadata> {
  if (cachedLookup) {
    return cachedLookup;
  }

  const lookup = new Map<string, SegmentMetadata>();

  const segments = readSeedFile<SegmentsSeedFile>("segments.json");
  const lookalikes = readSeedFile<LookalikesSeedFile>("lookalikes.json");
  const lifestyle = readSeedFile<LifestyleSeedFile>("lifestyle_segments.json");

  // Collision priority (first match wins):
  // segments -> lookalikes -> lifestyle_segments
  // Fallback key policy per source: export_id first, then long *_id.
  mergeRecords(lookup, segments?.segments ?? [], "SEG", (record) =>
    toKeyList(record.export_id, record.segment_id)
  );
  mergeRecords(lookup, lookalikes?.lookalikes ?? [], "LAL", (record) =>
    toKeyList(record.export_id, record.lookalike_id)
  );
  mergeRecords(lookup, lifestyle?.lifestyle_segments ?? [], "LS", (record) =>
    toKeyList(record.export_id, record.lifestyle_segment_id)
  );

  cachedLookup = lookup;
  return lookup;
}

