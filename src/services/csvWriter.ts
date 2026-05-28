import fs from "fs/promises";

const escapeCsvValue = (value: string): string => {
  if (value.includes("\"") || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
};

const toCsvString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  return `${value}`.replace(/\r?\n/g, " ");
};

export async function writeCsvFile<T extends object>(
  filePath: string,
  headers: readonly (keyof T)[],
  rows: T[]
): Promise<void> {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((header) => escapeCsvValue(toCsvString(row[header])))
      .join(",")
  );
  const content = [headerLine, ...dataLines].join("\n") + "\n";
  await fs.writeFile(filePath, content, "utf-8");
}
