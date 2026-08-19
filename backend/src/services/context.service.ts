import { SearchResult } from "./search.service.js";

const MIN_RELEVANCE_SCORE = 0.70;
const BROAD_CONTEXT_SCORE = 0.45;
const MAX_CONTEXTS = 3;

export function buildContext(
  results: SearchResult[],
  broad = false
): string {
  if (results.length === 0) {
    return "No relevant code was found.";
  }

  // Keep only reasonably relevant results.
  const minimumScore = broad
  ? BROAD_CONTEXT_SCORE
  : MIN_RELEVANCE_SCORE;

let filteredResults = results.filter(
  (result) => result.score >= minimumScore
);

  // Always keep the best result if filtering removed everything.
  if (filteredResults.length === 0) {
    filteredResults = [results[0]];
  }

  // Limit the amount of code sent to the LLM.
  filteredResults = filteredResults
  .sort((a, b) => b.score - a.score);

const seen = new Set<string>();

filteredResults = filteredResults.filter((result) => {
  const key = [
    result.payload.filePath,
    result.payload.symbolName ?? "",
    result.payload.startLine,
    result.payload.endLine,
  ].join(":");

  if (seen.has(key)) {
    return false;
  }

  seen.add(key);
  return true;
});

filteredResults = filteredResults.slice(0, MAX_CONTEXTS);

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