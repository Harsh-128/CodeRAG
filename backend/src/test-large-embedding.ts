import fs from "fs/promises";
import { parseJavaScriptCode } from "./services/code-parser.service.js";
import { createCodeChunks } from "./services/chunking.service.js";
import { generateEmbedding } from "./services/embedding.service.js";

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

  console.log(`Testing ${chunks.length} chunks...\n`);

  for (const [index, chunk] of chunks.entries()) {
    console.log(
      `Embedding chunk ${index + 1}/${chunks.length}: ${chunk.symbolName} (${chunk.content.length} chars)`
    );

    const embedding = await generateEmbedding(
      chunk.content
    );

    console.log(
      `  ✓ Generated ${embedding.length}D embedding`
    );
  }

  console.log("\nAll response.js chunks embedded successfully!");
}

main().catch((error) => {
  console.error("Large embedding test failed:", error);
  process.exit(1);
});