import { CodeNode } from "./code-parser.service.js";
import { CodeChunk } from "../types/code-chunk.js";

const MAX_CHUNK_CHARACTERS = 6000;

function createChunkId(
  repositoryName: string,
  filePath: string,
  symbolName: string,
  index: number
): string {
  const safeFileName = filePath.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  );

  const safeSymbolName = symbolName.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  );

  return `${repositoryName}-${safeFileName}-${safeSymbolName}-${index}`;
}

function splitLargeCode(
  code: string,
  maxCharacters: number
): string[] {
  if (code.length <= maxCharacters) {
    return [code];
  }

  const lines = code.split("\n");
  const chunks: string[] = [];

  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const line of lines) {
    const lineLength = line.length + 1;

    if (
      currentChunk.length > 0 &&
      currentLength + lineLength > maxCharacters
    ) {
      chunks.push(currentChunk.join("\n"));
      currentChunk = [];
      currentLength = 0;
    }

    currentChunk.push(line);
    currentLength += lineLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n"));
  }

  return chunks;
}

export function createCodeChunks(
  repositoryName: string,
  filePath: string,
  language: string,
  nodes: CodeNode[]
): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  let globalIndex = 0;

  for (const node of nodes) {
    const symbolName =
      node.name ?? `anonymous-${globalIndex}`;

    const codeParts = splitLargeCode(
      node.code,
      MAX_CHUNK_CHARACTERS
    );

    if (codeParts.length === 1) {
      chunks.push({
        id: createChunkId(
          repositoryName,
          filePath,
          symbolName,
          globalIndex
        ),
        repository: repositoryName,
        filePath,
        language,
        symbolName: node.name,
        symbolType: node.type,
        startLine: node.startLine,
        endLine: node.endLine,
        content: codeParts[0],
      });

      globalIndex++;
      continue;
    }

    for (let partIndex = 0; partIndex < codeParts.length; partIndex++) {
      chunks.push({
        id: createChunkId(
          repositoryName,
          filePath,
          `${symbolName}-part-${partIndex + 1}`,
          globalIndex
        ),
        repository: repositoryName,
        filePath,
        language,
        symbolName: `${symbolName} (part ${partIndex + 1}/${codeParts.length})`,
        symbolType: node.type,
        startLine: node.startLine,
        endLine: node.endLine,
        content: codeParts[partIndex],
      });

      globalIndex++;
    }
  }

  return chunks;
}