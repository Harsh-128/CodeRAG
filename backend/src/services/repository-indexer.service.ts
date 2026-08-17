import fs from "fs/promises";
import path from "path";
import {
  indexSourceFile,
} from "./indexing.service.js";
import {
  detectLanguage,
} from "./language-detection.service.js";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "coverage",
  "dist",
  "build",
  "vendor",
  ".next",
  ".nuxt",
  "target",
  "out",
  "bin",
  "obj",
  "venv",
  ".venv",
  "__pycache__",
  ".gradle",
  ".idea",
  ".vscode",
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".go",
  ".java",
]);

const MAX_FILE_SIZE = 1_000_000;

async function collectSourceFiles(
  directory: string
): Promise<string[]> {
  const entries = await fs.readdir(
    directory,
    {
      withFileTypes: true,
    }
  );

  const files: string[] = [];

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      files.push(
        ...(await collectSourceFiles(fullPath))
      );
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path
      .extname(entry.name)
      .toLowerCase();

    if (
      !SUPPORTED_EXTENSIONS.has(
        extension
      )
    ) {
      continue;
    }

    const stats = await fs.stat(fullPath);

    if (stats.size > MAX_FILE_SIZE) {
      console.log(
        `[Skipped] ${fullPath} → file too large`
      );
      continue;
    }

    files.push(fullPath);
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
  const files =
    await collectSourceFiles(
      repositoryPath
    );

  let filesProcessed = 0;
  let chunksIndexed = 0;

  for (const filePath of files) {
    const relativePath = path
      .relative(
        repositoryPath,
        filePath
      )
      .split(path.sep)
      .join("/");

    const language =
      detectLanguage(relativePath);

    if (!language) {
      continue;
    }

    try {
      const sourceCode =
        await fs.readFile(
          filePath,
          "utf-8"
        );

      const chunkCount =
        await indexSourceFile(
          repositoryName,
          relativePath,
          sourceCode,
          language
        );

      filesProcessed++;
      chunksIndexed +=
        chunkCount;

      console.log(
        `[Indexed] ${relativePath} ` +
        `(${language}) → ` +
        `${chunkCount} chunks`
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
