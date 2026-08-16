import { indexRepository } from "./services/repository-indexer.service.js";

async function main() {
  const repositoryName = "express";
  const repositoryPath = "./repositories/express";

  console.log(`Starting indexing for: ${repositoryName}`);
  console.log(`Repository path: ${repositoryPath}\n`);

  const result = await indexRepository(
    repositoryName,
    repositoryPath
  );

  console.log("\n========== INDEXING COMPLETE ==========");
  console.log("Files processed:", result.filesProcessed);
  console.log("Chunks indexed:", result.chunksIndexed);
}

main().catch((error) => {
  console.error("Repository indexing failed:", error);
  process.exit(1);
});