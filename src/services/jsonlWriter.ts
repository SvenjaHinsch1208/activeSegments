import fs from "fs";
import { once } from "events";
import { finished } from "stream/promises";

export async function writeJsonLines<T>(filePath: string, items: T[], append = false): Promise<void> {
  const writer = fs.createWriteStream(filePath, { encoding: "utf8", flags: append ? "a" : "w" });
  for (const item of items) {
    if (!writer.write(JSON.stringify(item) + "\n")) {
      await once(writer, "drain");
    }
  }
  writer.end();
  await finished(writer);
}

