import { SearchResult } from "./search.service.js";

export function rerankResults(
  query: string,
  results: SearchResult[],
  limit = 5
): SearchResult[] {
  const normalizedQuery = query.toLowerCase();

  const reranked = results.map((result) => {
    const content =
      result.payload.content?.toLowerCase() ?? "";

    const symbolName =
      result.payload.symbolName?.toLowerCase() ?? "";

    const filePath =
      result.payload.filePath?.toLowerCase() ?? "";

    let bonus = 0;

    // Prefer actual library/source code over tests.
    if (!filePath.startsWith("test/")) {
      bonus += 0.03;
    }

    // Strong signal for rendering-related questions.
    const renderingQuery =
      normalizedQuery.includes("render") ||
      normalizedQuery.includes("rendering");

    if (renderingQuery) {
      if (symbolName === "tryrender") {
        bonus += 0.15;
      }

      if (symbolName.includes("render")) {
        bonus += 0.08;
      }

      if (content.includes(".render(")) {
        bonus += 0.08;
      }
    }

    // Small bonus when the query explicitly mentions
    // error handling and the code actually contains
    // an error-related construct.
    const errorQuery =
      normalizedQuery.includes("error") ||
      normalizedQuery.includes("errors");

    if (errorQuery) {
      if (
        content.includes("catch (err)") ||
        content.includes("catch (e)") ||
        content.includes("callback(err)") ||
        symbolName.includes("error")
      ) {
        bonus += 0.05;
      }
    }

    return {
      ...result,
      score: result.score + bonus,
    };
  });

  return reranked
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}