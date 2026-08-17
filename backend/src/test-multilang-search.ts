import { hybridSearchCode } from "./services/search.service.js";

async function runSearch(question: string) {
  console.log("\n================================");
  console.log(`Question: ${question}`);
  console.log("================================");

  const results = await hybridSearchCode(
    question,
    3,
    "multilang-test"
  );

  for (const [index, result] of results.entries()) {
    console.log(`\nResult #${index + 1}`);
    console.log("Score:", result.score);
    console.log("File:", result.payload.filePath);
    console.log("Language:", result.payload.language);
    console.log("Symbol:", result.payload.symbolName);
    console.log(
      "Lines:",
      `${result.payload.startLine}-${result.payload.endLine}`
    );
    console.log("Code:");
    console.log(result.payload.content);
  }
}

async function main() {
  await runSearch(
    "How does calculate_total work?"
  );

  await runSearch(
    "How does calculateTotal work?"
  );
}

main().catch((error) => {
  console.error(
    "Multilingual search failed:",
    error
  );

  process.exit(1);
});
