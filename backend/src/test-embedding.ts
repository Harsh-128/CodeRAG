import { generateEmbedding } from "./services/embedding.service.js";

async function main() {
  const code = `
function tryRender(view, options, callback) {
  try {
    view.render(options, callback);
  } catch (err) {
    callback(err);
  }
}
`;

  const embedding = await generateEmbedding(code);

  console.log("Embedding generated successfully!");
  console.log("Dimensions:", embedding.length);
  console.log("First 10 values:", embedding.slice(0, 10));
}

main().catch((error) => {
  console.error("Embedding test failed:", error);
  process.exit(1);
});