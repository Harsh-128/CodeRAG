import fs from "fs/promises";

import { parseJavaScriptCode } from "./services/code-parser.service.js";
import { createCodeChunks } from "./services/chunking.service.js";

async function main() {
  const repositoryName = "express";
  const filePath = "lib/application.js";

  const fullPath =
    `./repositories/${repositoryName}/${filePath}`;

  const sourceCode = await fs.readFile(
    fullPath,
    "utf-8"
  );

  const nodes = parseJavaScriptCode(sourceCode);

  const chunks = createCodeChunks(
    repositoryName,
    filePath,
    "javascript",
    nodes
  );

  console.log("Created code chunks:");
  console.log(JSON.stringify(chunks, null, 2));
}

main().catch((error) => {
  console.error("Chunking test failed:", error);
  process.exit(1);
});