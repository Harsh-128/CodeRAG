import {
  findSymbol,
  findSymbolsByParent,
  findSymbolsByFile,
} from "./services/symbol.service.js";

async function main() {
  console.log("\n===== FIND SYMBOL: UserService =====");

  const userServices = await findSymbol(
    "UserService",
    "multilang"
  );

  for (const result of userServices) {
    console.log({
      symbol: result.payload.symbolName,
      language: result.payload.language,
      type: result.payload.symbolType,
      file: result.payload.filePath,
      lines: `${result.payload.startLine}-${result.payload.endLine}`,
    });
  }

  console.log("\n===== FIND SYMBOL: getName =====");

  const getNames = await findSymbol(
    "getName",
    "multilang"
  );

  for (const result of getNames) {
    console.log({
      symbol: result.payload.symbolName,
      parent: result.payload.parentName,
      language: result.payload.language,
      type: result.payload.symbolType,
      file: result.payload.filePath,
      lines: `${result.payload.startLine}-${result.payload.endLine}`,
    });
  }

  console.log("\n===== FIND BY PARENT: UserService =====");

  const children = await findSymbolsByParent(
    "UserService",
    "multilang"
  );

  for (const result of children) {
    console.log({
      symbol: result.payload.symbolName,
      parent: result.payload.parentName,
      language: result.payload.language,
      type: result.payload.symbolType,
      file: result.payload.filePath,
      lines: `${result.payload.startLine}-${result.payload.endLine}`,
    });
  }

  console.log("\n===== FIND BY FILE: UserService.java =====");

  const javaFile = await findSymbolsByFile(
    "UserService.java",
    "multilang"
  );

  for (const result of javaFile) {
    console.log({
      symbol: result.payload.symbolName,
      parent: result.payload.parentName,
      language: result.payload.language,
      type: result.payload.symbolType,
      file: result.payload.filePath,
      lines: `${result.payload.startLine}-${result.payload.endLine}`,
    });
  }
}

main().catch((error) => {
  console.error("Symbol service test failed:", error);
  process.exit(1);
});
