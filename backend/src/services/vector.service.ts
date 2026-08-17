import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "node:crypto";

const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

export const COLLECTION_NAME = "coderag_code_chunks";

export interface VectorPayload {
  [key: string]: unknown;

  repository: string;
  filePath: string;
  language: string;
  symbolName?: string;
parentName?: string;
symbolType: string;
  startLine: number;
  endLine: number;
  content: string;
}

function toQdrantId(id: string): string {
  const hash = createHash("sha256")
    .update(id)
    .digest("hex");

  const uuid = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0") + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");

  return uuid;
}

export async function storeCodeChunk(
  id: string,
  embedding: number[],
  payload: VectorPayload
): Promise<void> {
  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: toQdrantId(id),
        vector: embedding,
        payload: {
          ...payload,
          chunkId: id,
        },
      },
    ],
  });
}

export async function getCollectionInfo() {
  return await qdrant.getCollection(COLLECTION_NAME);
}