import { QdrantClient } from "@qdrant/js-client-rest";
import { rerankResults } from "./reranker.service.js";
import { generateEmbedding } from "./embedding.service.js";
import { COLLECTION_NAME, VectorPayload } from "./vector.service.js";

const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

export interface SearchResult {
  id: string | number;
  score: number;
  payload: VectorPayload & {
    chunkId?: string;
  };
}

export async function searchCode(
  query: string,
  limit = 5,
  repositoryName?: string,
  language?: string,
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);

  const must: Array<Record<string, unknown>> = [];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  if (language) {
    must.push({
      key: "language",
      match: {
        value: language,
      },
    });
  }

  const filter = must.length > 0 ? { must } : undefined;

  const response = await qdrant.query(COLLECTION_NAME, {
    query: embedding,
    limit,
    filter,
    with_payload: true,
    with_vector: false,
  });

  return response.points.map((result) => ({
    id: result.id,
    score: result.score,
    payload: result.payload as SearchResult["payload"],
  }));
}

async function searchLexicalCandidates(
  query: string,
  repositoryName?: string,
  language?: string,
): Promise<SearchResult[]> {
  const normalized = query.toLowerCase();

  const terms = normalized
    .split(/[^a-zA-Z0-9_$]+/)
    .filter((term) => term.length > 1);

  const requestFlow =
    /\b(handle|handles|handling|request|requests|middleware|response|responses|dispatch|route|routing)\b/.test(
      normalized,
    );

  if (requestFlow) {
    terms.push("handle", "req", "res", "next");
  }

  const uniqueTerms = [...new Set(terms)];

  const must: Array<Record<string, unknown>> = [];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  if (language) {
    must.push({
      key: "language",
      match: {
        value: language,
      },
    });
  }

  const filter = must.length > 0 ? { must } : undefined;

  const response = await qdrant.scroll(COLLECTION_NAME, {
    limit: 1000,
    filter,
    with_payload: true,
    with_vector: false,
  });

  const candidates = response.points
    .map((point) => ({
      id: point.id,
      score: 0,
      payload: point.payload as SearchResult["payload"],
    }))
    .filter((result) => {
      const content = result.payload.content?.toLowerCase() ?? "";
      const symbol = result.payload.symbolName?.toLowerCase() ?? "";
      const file = result.payload.filePath?.toLowerCase() ?? "";

      return uniqueTerms.some(
        (term) =>
          content.includes(term) || symbol === term || file.includes(term),
      );
    });

  return candidates;
}

export async function hybridSearchCode(
  query: string,
  limit = 5,
  repositoryName?: string,
  language?: string,
  broadRepositoryQuestion = false,
  queryIntent?: string,
): Promise<SearchResult[]> {
  // First get a larger semantic candidate set.
  const semanticResults = await searchCode(
    query,
    50,
    repositoryName,
    language,
  );

  const lexicalResults = await searchLexicalCandidates(
    query,
    repositoryName,
    language,
  );

  const mergedResults = [...semanticResults, ...lexicalResults].filter(
    (result, index, array) =>
      array.findIndex(
        (other) =>
          other.payload.filePath === result.payload.filePath &&
          other.payload.startLine === result.payload.startLine &&
          other.payload.endLine === result.payload.endLine,
      ) === index,
  );

  // Normalize the user's query into searchable terms.
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-zA-Z0-9_]+/)
    .filter((term) => term.length > 1);

  const rankedResults = mergedResults.map((result) => {
    const content = result.payload.content.toLowerCase();
    const symbolName = result.payload.symbolName?.toLowerCase() ?? "";
    const filePath = result.payload.filePath.toLowerCase();

    let lexicalScore = 0;

    for (const term of queryTerms) {
      if (content.includes(term)) {
        lexicalScore += 0.15;
      }

      if (symbolName.includes(term)) {
        lexicalScore += 0.25;
      }

      if (filePath.includes(term)) {
        lexicalScore += 0.1;
      }
    }

    const hybridScore =
      result.score * 0.75 + Math.min(lexicalScore, 1) * 0.25;

    return {
      ...result,
      score: hybridScore,
    };
  });

  return rerankResults(
    query,
    rankedResults,
    limit,
    broadRepositoryQuestion,
    queryIntent,
  );
}
