import { hybridSearchCode } from "./services/search.service.js";

async function main() {
  const results = await hybridSearchCode(
    "How does Express handle rendering errors?",
    5,
    "express"
  );

  for (const [i, result] of results.entries()) {
    console.log(`Result #${i + 1}`);
    console.log("Score:", result.score);
    console.log("File:", result.payload.filePath);
    console.log("Symbol:", result.payload.symbolName);
    console.log(
      "Lines:",
      `${result.payload.startLine}-${result.payload.endLine}`
    );
    console.log("-----------------------------------");
  }
}

main().catch((error) => {
  console.error("Hybrid search failed:", error);
  process.exit(1);
});
