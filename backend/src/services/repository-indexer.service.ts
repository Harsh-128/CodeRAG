import fs from "fs/promises";
import path from "path";
import { indexJavaScriptFile } from "./indexing.service.js";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "coverage",
  "dist",
  "build",
  "vendor",
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
]);

async function collectSourceFiles(
  directory: string
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(
        ...(await collectSourceFiles(fullPath))
      );
      continue;
    }

    if (
      entry.isFile() &&
      SUPPORTED_EXTENSIONS.has(
        path.extname(entry.name).toLowerCase()
      )
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function indexRepository(
  repositoryName: string,
  repositoryPath: string
): Promise<{
  filesProcessed: number;
  chunksIndexed: number;
}> {
  const files = await collectSourceFiles(repositoryPath);

  let filesProcessed = 0;
  let chunksIndexed = 0;

  for (const filePath of files) {
    const sourceCode = await fs.readFile(
      filePath,
      "utf-8"
    );

    const relativePath = path
      .relative(repositoryPath, filePath)
      .split(path.sep)
      .join("/");

    try {
      const chunkCount = await indexJavaScriptFile(
        repositoryName,
        relativePath,
        sourceCode
      );

      filesProcessed++;
      chunksIndexed += chunkCount;

      console.log(
        `[Indexed] ${relativePath} → ${chunkCount} chunks`
      );
    } catch (error) {
      console.error(
        `[Skipped] ${relativePath}`,
        error
      );
    }
  }

  return {
    filesProcessed,
    chunksIndexed,
  };
}