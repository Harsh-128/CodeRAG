import { indexRepository } from "./services/repository-indexer.service.js";

async function main() {
  const result = await indexRepository(
    "multilang-test",
    "./test-repositories/multilang"
  );

  console.log("\nIndexing complete:");
  console.log(result);
}

main().catch((error) => {
  console.error("Indexing failed:", error);
  process.exit(1);
});
