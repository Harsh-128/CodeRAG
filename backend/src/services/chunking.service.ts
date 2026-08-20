import { CodeNode } from "./code-parser.service.js";
import { CodeChunk } from "../types/code-chunk.js";

const MAX_CHUNK_CHARACTERS = 6000;

function createChunkId(
  repositoryName: string,
  filePath: string,
  symbolName: string,
  startLine: number,
  partIndex: number
): string {
  const safeFileName = filePath.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  );

  const safeSymbolName = symbolName.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  );

  return `${repositoryName}-${safeFileName}-${safeSymbolName}-${startLine}-${partIndex}`;
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

  for (const node of nodes) {
    const symbolName =
      node.name ?? `anonymous-${node.startLine}`;

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
          node.startLine,
          0
        ),
        repository: repositoryName,
        filePath,
        language,
        symbolName: node.name,
        parentName: node.parentName,
        symbolType: node.type,
        startLine: node.startLine,
        endLine: node.endLine,
        content: codeParts[0],
      });

      continue;
    }

    for (
      let partIndex = 0;
      partIndex < codeParts.length;
      partIndex++
    ) {
      chunks.push({
        id: createChunkId(
          repositoryName,
          filePath,
          `${symbolName}-part-${partIndex + 1}`,
          node.startLine,
          partIndex
        ),
        repository: repositoryName,
        filePath,
        language,
        symbolName:
          `${symbolName} (part ${partIndex + 1}/${codeParts.length})`,
        parentName: node.parentName,
        symbolType: node.type,
        startLine: node.startLine,
        endLine: node.endLine,
        content: codeParts[partIndex],
      });
    }
  }

  return chunks;
}