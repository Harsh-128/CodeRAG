import fs from "fs/promises";
import { indexJavaScriptFile } from "./services/indexing.service.js";

async function main() {
  const repositoryName = "express";
  const filePath = "lib/application.js";

  const fullPath =
    `./repositories/${repositoryName}/${filePath}`;

  const sourceCode = await fs.readFile(
    fullPath,
    "utf-8"
  );

  console.log(`Indexing ${filePath}...`);

  const count = await indexJavaScriptFile(
    repositoryName,
    filePath,
    sourceCode
  );

  console.log(`Indexed ${count} code chunks successfully!`);
}

main().catch((error) => {
  console.error("Indexing failed:", error);
  process.exit(1);
});