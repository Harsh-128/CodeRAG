import {
  parseCode,
  type SupportedLanguage,
} from "./code-parser.service.js";
import { createCodeChunks } from "./chunking.service.js";
import { generateEmbedding } from "./embedding.service.js";
import { storeCodeChunk } from "./vector.service.js";

export async function indexSourceFile(
  repositoryName: string,
  filePath: string,
  sourceCode: string,
  language: SupportedLanguage
): Promise<number> {
  const nodes = parseCode(
    sourceCode,
    language
  );

  const chunks = createCodeChunks(
    repositoryName,
    filePath,
    language,
    nodes
  );

  for (const chunk of chunks) {
    const embedding =
      await generateEmbedding(
        chunk.content
      );

    await storeCodeChunk(
      chunk.id,
      embedding,
      {
        repository:
          chunk.repository,
        filePath:
          chunk.filePath,
        language:
          chunk.language,
        symbolName:
          chunk.symbolName,
        parentName:
          chunk.parentName,
        symbolType:
          chunk.symbolType,
        startLine:
          chunk.startLine,
        endLine:
          chunk.endLine,
        content:
          chunk.content,
      }
    );
  }

  return chunks.length;
}

/**
 * Backwards-compatible wrapper.
 */
export async function indexJavaScriptFile(
  repositoryName: string,
  filePath: string,
  sourceCode: string
): Promise<number> {
  return indexSourceFile(
    repositoryName,
    filePath,
    sourceCode,
    "javascript"
  );
}
