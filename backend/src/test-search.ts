import { searchCode } from "./services/search.service.js";

async function main() {
  const query = "How does Express handle rendering errors?";

  console.log(`Searching for: "${query}"\n`);

  const results = await searchCode(query, 5);

  for (const [index, result] of results.entries()) {
    console.log(`Result #${index + 1}`);
    console.log("Score:", result.score);
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
  console.error("Search failed:", error);
  process.exit(1);
});