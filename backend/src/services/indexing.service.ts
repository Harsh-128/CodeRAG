import { parseJavaScriptCode } from "./code-parser.service.js";
import { createCodeChunks } from "./chunking.service.js";
import { generateEmbedding } from "./embedding.service.js";
import { storeCodeChunk } from "./vector.service.js";

export async function indexJavaScriptFile(
  repositoryName: string,
  filePath: string,
  sourceCode: string
): Promise<number> {
  const nodes = parseJavaScriptCode(sourceCode);

  const chunks = createCodeChunks(
    repositoryName,
    filePath,
    "javascript",
    nodes
  );

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);

    await storeCodeChunk(
      chunk.id,
      embedding,
      {
        repository: chunk.repository,
        filePath: chunk.filePath,
        language: chunk.language,
        symbolName: chunk.symbolName,
        symbolType: chunk.symbolType,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
      }
    );
  }

  return chunks.length;
}