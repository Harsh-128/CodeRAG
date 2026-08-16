import fs from "fs/promises";
import { parseJavaScriptCode } from "./services/code-parser.service.js";
import { createCodeChunks } from "./services/chunking.service.js";

async function main() {
  const filePath = "./repositories/express/lib/response.js";

  const sourceCode = await fs.readFile(
    filePath,
    "utf-8"
  );

  const nodes = parseJavaScriptCode(sourceCode);

  const chunks = createCodeChunks(
    "express",
    "lib/response.js",
    "javascript",
    nodes
  );

  console.log("File size:", sourceCode.length);
  console.log("Parsed nodes:", nodes.length);
  console.log("Created chunks:", chunks.length);

  console.log("\nChunk sizes:");

  for (const [index, chunk] of chunks.entries()) {
    console.log(
      `Chunk ${index + 1}: ${chunk.content.length} characters | ${chunk.symbolName}`
    );
  }
}

main().catch((error) => {
  console.error("Large chunking test failed:", error);
  process.exit(1);
});