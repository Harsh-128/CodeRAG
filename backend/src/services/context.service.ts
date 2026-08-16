import { SearchResult } from "./search.service.js";

const MIN_RELEVANCE_SCORE = 0.70;
const MAX_CONTEXTS = 3;

export function buildContext(
  results: SearchResult[]
): string {
  if (results.length === 0) {
    return "No relevant code was found.";
  }

  // Keep only reasonably relevant results.
  let filteredResults = results.filter(
    (result) => result.score >= MIN_RELEVANCE_SCORE
  );

  // Always keep the best result if filtering removed everything.
  if (filteredResults.length === 0) {
    filteredResults = [results[0]];
  }

  // Limit the amount of code sent to the LLM.
  filteredResults = filteredResults
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXTS);

  return filteredResults
    .map((result, index) => {
      const payload = result.payload;

      return [
        `--- Code Context ${index + 1} ---`,
        `Repository: ${payload.repository}`,
        `File: ${payload.filePath}`,
        `Symbol: ${payload.symbolName ?? "anonymous"}`,
        `Type: ${payload.symbolType}`,
        `Lines: ${payload.startLine}-${payload.endLine}`,
        `Relevance Score: ${result.score.toFixed(4)}`,
        "",
        payload.content,
        "",
        "--- End Context ---",
      ].join("\n");
    })
    .join("\n\n");
}