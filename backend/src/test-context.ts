import { hybridSearchCode } from "./services/search.service.js";
import { buildContext } from "./services/context.service.js";

async function main() {
  const query =
    "How does Express handle rendering errors?";

  const results = await hybridSearchCode(query, 5);

  const context = buildContext(results);

  console.log("Generated Context:\n");
  console.log(context);
}

main().catch((error) => {
  console.error("Context test failed:", error);
  process.exit(1);
});