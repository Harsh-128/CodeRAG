import fs from "fs/promises";

export async function readCodeFile(
  filePath: string
): Promise<string> {
  return await fs.readFile(filePath, "utf-8");
}