import type { SymbolSearchResult } from "./symbol.service.js";

export interface SymbolNavigationSource {
  file: string;
  symbol: string | null;
  parent: string | null;
  language: string;
  startLine: number;
  endLine: number;
  usageLine: unknown | null;
  usageContent: unknown | null;
}

export interface SymbolNavigationResponse {
  answer: string;
  sources: SymbolNavigationSource[];
  mode: "symbol-navigation";
}

export function buildSymbolNavigationResponse(
  question: string,
  symbolResults: SymbolSearchResult[],
): SymbolNavigationResponse {
  const fileScopedSymbolQuestion =
    /\b(?:inside|within|in)\s+[A-Za-z0-9_./-]+\.[A-Za-z0-9]+\b/i.test(
      question,
    ) && /\b(functions?|methods?|symbols?|classes?)\b/i.test(question);

  if (fileScopedSymbolQuestion) {
    const filteredSymbolResults = /\b(functions?)\b/i.test(question)
      ? symbolResults.filter((result) =>
          [
            "function_declaration",
            "function",
            "arrow_function",
            "function_definition",
            "method_definition",
            "method_declaration",
          ].includes(result.payload.symbolType),
        )
      : /\b(classes?)\b/i.test(question)
        ? symbolResults.filter((result) =>
            ["class_declaration", "class_definition"].includes(
              result.payload.symbolType,
            ),
          )
        : symbolResults;

    const label = /\bclass(es)?\b/i.test(question)
      ? "Classes"
      : /\b(methods?)\b/i.test(question)
        ? "Methods"
        : /\b(functions?)\b/i.test(question)
          ? "Functions"
          : "Symbols";

    const answer = [
      `${label} in the requested file:`,
      ...filteredSymbolResults.map((result) => {
        const payload = result.payload;

        return `- ${payload.symbolName ?? "anonymous"} — ${payload.startLine}-${payload.endLine}`;
      }),
    ].join("\n");

    const sources = filteredSymbolResults.slice(0, 10).map((result) => ({
      file: result.payload.filePath,
      symbol: result.payload.symbolName ?? null,
      parent: result.payload.parentName ?? null,
      language: result.payload.language,
      startLine: result.payload.startLine,
      endLine: result.payload.endLine,
      usageLine: result.payload.usageLine ?? null,
      usageContent: result.payload.usageContent ?? null,
    }));

    return {
      answer,
      sources,
      mode: "symbol-navigation",
    };
  }

  const symbolExtractionPatterns = [
    /`([A-Za-z_$][A-Za-z0-9_$]*)`/,
    /\b(?:where\s+is|where\s+are|find|locate)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/i,
    /(?:belong\s+to|of)\s+([A-Za-z_$][A-Za-z0-9_$]*)/i,
  ];

  const requestedSymbol =
    symbolExtractionPatterns
      .map((pattern) => question.match(pattern)?.[1])
      .find(
        (symbol) =>
          symbol !== undefined &&
          !["the", "a", "an"].includes(symbol.toLowerCase()),
      ) ?? "symbol";

  const isParentMethodQuestion =
    /\b(?:methods?|functions?)\s+(?:belong\s+to|of)\b/i.test(question);

  const answer = [
    isParentMethodQuestion
      ? `Methods belonging to \`${requestedSymbol}\`:`
      : `The \`${requestedSymbol}\` is used in:`,
    ...symbolResults.slice(0, 10).map((result) => {
      const payload = result.payload;

      if (payload.usageContent) {
        const usageLocation =
          `${payload.filePath}:${payload.usageLine ?? payload.startLine}`;

        return `- ${usageLocation} — ${payload.usageContent}`;
      }

      const location =
        `${payload.filePath}:${payload.startLine}-${payload.endLine}`;

      return `- ${payload.symbolName ?? "anonymous"} — ${location}`;
    }),
  ].join("\n");

  const sources = symbolResults.slice(0, 5).map((result) => ({
    file: result.payload.filePath,
    symbol: result.payload.symbolName ?? null,
    parent: result.payload.parentName ?? null,
    language: result.payload.language,
    startLine: result.payload.startLine,
    endLine: result.payload.endLine,
    usageLine: result.payload.usageLine ?? null,
    usageContent: result.payload.usageContent ?? null,
  }));

  return {
    answer,
    sources,
    mode: "symbol-navigation",
  };
}
