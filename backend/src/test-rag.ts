import { hybridSearchCode } from "./services/search.service.js";
import { buildContext } from "./services/context.service.js";
import { generateAnswer } from "./services/llm.service.js";

async function main() {
  const question =
    "How does Express handle rendering errors?";

  console.log("Question:");
  console.log(question);
  console.log("\nSearching codebase...\n");

  const results = await hybridSearchCode(question, 5);

  console.log(`Retrieved ${results.length} results.`);

  const context = buildContext(results);

  console.log("\nGenerating answer with Qwen...\n");

  const answer = await generateAnswer(
    question,
    context
  );

  console.log("========== CodeRAG Answer ==========\n");
  console.log(answer);
  console.log("\n====================================");
}

main().catch((error) => {
  console.error("RAG test failed:", error);
  process.exit(1);
});