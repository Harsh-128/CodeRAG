import { hybridSearchCode } from "./services/search.service.js";
import { detectQueryIntent } from "./services/query-intent.service.js";

async function main() {
  const query = "How does Express handle a request?";

  console.log(`Hybrid search: "${query}"\n`);

  const queryIntent = detectQueryIntent(query);

  const results = await hybridSearchCode(
    query,
    5,
    undefined,
    undefined,
    false,
    queryIntent,
  );

  for (const [index, result] of results.entries()) {
    console.log(`Result #${index + 1}`);
    console.log("Hybrid score:", result.score);
    console.log("File:", result.payload.filePath);
    console.log("Symbol:", result.payload.symbolName);
    console.log(
      `Lines: ${result.payload.startLine}-${result.payload.endLine}`
    );
    console.log("Code:");
    console.log(result.payload.content);
    console.log("-----------------------------------");
  }
}

main().catch((error) => {
  console.error("Hybrid search failed:", error);
  process.exit(1);
});