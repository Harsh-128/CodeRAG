import { getCollectionInfo } from "./services/vector.service.js";

async function main() {
  const collection = await getCollectionInfo();

  console.log("Qdrant connection successful!");
  console.log("Collection status:", collection.status);

  const vectors = collection.config.params.vectors;

  if (
    vectors &&
    typeof vectors === "object" &&
    !Array.isArray(vectors) &&
    "size" in vectors &&
    typeof vectors.size === "number"
  ) {
    console.log("Vector size:", vectors.size);
  } else {
    console.log("Vector configuration:", vectors);
  }
}

main().catch((error) => {
  console.error("Qdrant test failed:", error);
  process.exit(1);
});