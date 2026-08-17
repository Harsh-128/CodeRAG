import { scanRepository } from "./services/file-scanner.service.js";

async function main() {
  const files = await scanRepository(
    "./test-repositories/multilang"
  );

  console.log("Files found:");
  console.log(files);
}

main().catch((error) => {
  console.error("Scan failed:", error);
  process.exit(1);
});
