import { QdrantClient } from "@qdrant/js-client-rest";
import {
  COLLECTION_NAME,
  VectorPayload,
} from "./vector.service.js";

const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

export interface SymbolSearchResult {
  id: string | number;
  payload: VectorPayload & {
    chunkId?: string;
  };
}

export async function findSymbol(
  symbolName: string,
  repositoryName?: string,
  language?: string,
  limit = 10
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [
    {
      key: "symbolName",
      match: {
        value: symbolName,
      },
    },
  ];

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

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    }
  );

  return response.points.map((point) => ({
    id: point.id,
    payload: point.payload as SymbolSearchResult["payload"],
  }));
}

export async function findSymbolsByParent(
  parentName: string,
  repositoryName?: string,
  language?: string,
  limit = 20
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [
    {
      key: "parentName",
      match: {
        value: parentName,
      },
    },
  ];

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

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    }
  );

  return response.points.map((point) => ({
    id: point.id,
    payload: point.payload as SymbolSearchResult["payload"],
  }));
}

export async function findSymbolsByFile(
  filePath: string,
  repositoryName?: string,
  limit = 50
): Promise<SymbolSearchResult[]> {
  const must: Array<Record<string, unknown>> = [
    {
      key: "filePath",
      match: {
        value: filePath,
      },
    },
  ];

  if (repositoryName) {
    must.push({
      key: "repository",
      match: {
        value: repositoryName,
      },
    });
  }

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    },
  );

  return response.points.map((point) => ({
    id: point.id,
    payload: point.payload as SymbolSearchResult["payload"],
  }));
}

async function findSymbolUsages(
  symbolName: string,
  repositoryName?: string,
  language?: string
): Promise<SymbolSearchResult[]> {
  const must: any[] = [];

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

  const response = await qdrant.scroll(
    COLLECTION_NAME,
    {
      limit: 100,
      with_payload: true,
      with_vector: false,
      filter: {
        must,
      },
    },
  );

  const escaped = symbolName.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const usageRegex = new RegExp(
    `\\b${escaped}\\b`
  );

  return response.points
    .map((point) => ({
      id: point.id,
      payload: point.payload as SymbolSearchResult["payload"],
    }))
    .filter((result) => {
      const payload = result.payload;

      if (!payload.content) {
        return false;
      }

      return usageRegex.test(payload.content);
    });
}

export async function lookupSymbolsForQuestion(
  question: string,
  repositoryName?: string,
  language?: string
): Promise<SymbolSearchResult[]> {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .trim();

  /*
   * Questions asking what methods/functions belong
   * to a class should search by parentName.
   *
   * Example:
   *   What methods belong to UserService?
   */
  const parentMatch = question.match(
    /(?:methods?|functions?)\s+(?:belong\s+to|of)\s+([A-Za-z_$][A-Za-z0-9_$]*)/i
  );

  if (parentMatch) {
    return findSymbolsByParent(
      parentMatch[1],
      repositoryName,
      language
    );
  }

  /*
   * Questions asking where something is defined,
   * constructed, created, instantiated, or located
   * should prefer exact symbol lookup.
   */
  const usageQuestion =
  /\b(used|usage|usages|referenced|references|reference|called|calls|invoked|invocations|instantiated|instantiation)\b/
    .test(normalized);

const navigationQuestion =
  /\b(where|defined|definition|constructed|constructor|created|located|show|used|usage|usages|referenced|references|reference|called|calls|invoked|invocations|instantiated|instantiation)\b/
    .test(normalized);
  if (!navigationQuestion) {
    return [];
  }

  /*
   * Extract an identifier from the question.
   *
   * Prefer a backtick-wrapped symbol:
   *   Where is `UserService` defined?
   */
  const backtickMatch = question.match(
    /`([A-Za-z_$][A-Za-z0-9_$]*)`/
  );

  if (backtickMatch) {
  const symbolName = backtickMatch[1];

  if (usageQuestion) {
    return findSymbolUsages(
      symbolName,
      repositoryName,
      language
    );
  }

  return findSymbol(
    symbolName,
    repositoryName,
    language
  );
}

  /*
   * Otherwise look for code-like identifiers.
   */
  const identifiers = question.match(
  /\b[A-Z][A-Za-z0-9_$]*\b/g
);

if (!identifiers || identifiers.length === 0) {
  return [];
}

const ignoredWords = new Set([
  "Where",
  "What",
  "Which",
  "Who",
  "How",
  "When",
  "Why",
  "Show",
  "Tell",
]);

const symbolName =
  identifiers.find((identifier) => !ignoredWords.has(identifier)) ??
  identifiers[0];

if (usageQuestion) {
  return findSymbolUsages(
    symbolName,
    repositoryName,
    language
  );
}

return findSymbol(
  symbolName,
  repositoryName,
  language
);
}
