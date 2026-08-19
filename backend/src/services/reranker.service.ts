import { SearchResult } from "./search.service.js";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, " ")
    .trim();
}

function getQueryTerms(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((term) => term.length > 1);
}
function detectQueryLanguage(
  query: string
): string | null {
  const normalizedQuery = normalize(query);

  const languageAliases: Record<
    string,
    string
  > = {
    javascript: "javascript",
    js: "javascript",

    typescript: "typescript",
    ts: "typescript",

    python: "python",
    py: "python",

    golang: "go",
    go: "go",

    java: "java",
  };

  const terms = normalizedQuery.split(/\s+/);

  for (const term of terms) {
    const language = languageAliases[term];

    if (language) {
      return language;
    }
  }

  return null;
}

export function rerankResults(
  query: string,
  results: SearchResult[],
  limit = 5,
  broadRepositoryQuestion = false
): SearchResult[] {
  const normalizedQuery = normalize(query);
  const queryTerms = getQueryTerms(query);
  const queryLanguage = detectQueryLanguage(query);

  const reranked = results.map((result) => {
    const content =
      result.payload.content?.toLowerCase() ?? "";

    const symbolName =
      result.payload.symbolName?.toLowerCase() ?? "";

    const parentName =
      result.payload.parentName?.toLowerCase() ?? "";

    const filePath =
      result.payload.filePath?.toLowerCase() ?? "";

    const symbolType =
      result.payload.symbolType?.toLowerCase() ?? "";

    let bonus = 0;
    if (broadRepositoryQuestion) {
  const structuralType =
    symbolType === "class_declaration" ||
    symbolType === "class_definition" ||
    symbolType === "interface_declaration" ||
    symbolType === "enum_declaration" ||
    symbolType === "record_declaration" ||
    symbolType === "type_declaration" ||
    symbolType === "function_declaration" ||
    symbolType === "function_definition";

  if (structuralType) {
    bonus += 0.12;
  }

  const implementationDetail =
    symbolType === "method_declaration" ||
    symbolType === "method_definition" ||
    symbolType === "constructor_declaration";

  if (implementationDetail) {
    bonus -= 0.04;
  }
}

    /*
 * ---------------------------------------------------------
 * Explicit language matching
 * ---------------------------------------------------------
 *
 * Only boost a language when the user explicitly
 * mentions it in the question.
 */

if (
  queryLanguage &&
  result.payload.language.toLowerCase() ===
    queryLanguage
) {
  bonus += 0.20;
}

    /*
     * ---------------------------------------------------------
     * Generic source-code quality signal
     * ---------------------------------------------------------
     */

    // Prefer actual source files over common test directories.
    if (
      !filePath.startsWith("test/") &&
      !filePath.includes("/test/") &&
      !filePath.includes("__tests__")
    ) {
      bonus += 0.03;
    }

    /*
     * ---------------------------------------------------------
     * Explicit symbol-name matching
     * ---------------------------------------------------------
     */

    for (const term of queryTerms) {
      if (
        symbolName === term ||
        symbolName.includes(term)
      ) {
        bonus += 0.12;
      }

      if (
        parentName === term ||
        parentName.includes(term)
      ) {
        bonus += 0.04;
      }

      if (filePath.includes(term)) {
        bonus += 0.03;
      }
    }

    /*
     * ---------------------------------------------------------
     * Method-oriented questions
     * ---------------------------------------------------------
     *
     * Examples:
     *   How does X return...
     *   How does X get...
     *   Where does X fetch...
     *   Which method...
     */

    const methodQuery =
      /\b(return|returns|get|gets|fetch|fetches|retrieve|retrieves|find|finds|calculate|calculates|handle|handles|process|processes|call|calls|method|function)\b/
        .test(normalizedQuery);

    if (methodQuery) {
      const isMethod =
        symbolType === "method_declaration" ||
        symbolType === "method_definition" ||
        symbolType === "function_declaration" ||
        symbolType === "function_definition";

      if (isMethod) {
        bonus += 0.08;
      }

      // Strongly prefer methods/functions whose implementation
      // contains the operation explicitly requested by the user.
      if (
        isMethod &&
        /\breturn\b/.test(normalizedQuery) &&
        /\breturn\b/.test(content)
      ) {
        bonus += 0.18;
      }

      // Queries asking to "get" something should favor methods
      // whose symbol itself starts with "get".
      if (
        isMethod &&
        /\bget\b/.test(normalizedQuery) &&
        symbolName.startsWith("get")
      ) {
        bonus += 0.12;
      }

      // Queries asking to fetch/retrieve/find something should
      // favor methods containing those operations.
      if (
        isMethod &&
        /\b(fetch|retrieve|find)\b/.test(normalizedQuery) &&
        /(fetch|retrieve|find)/.test(content)
      ) {
        bonus += 0.12;
      }
    }

    /*
     * ---------------------------------------------------------
     * Constructor-oriented questions
     * ---------------------------------------------------------
     *
     * Examples:
     *   Where is X constructed?
     *   How is X instantiated?
     *   Where is X created?
     */

    const constructorQuery =
      /\b(construct|constructed|constructor|instantiate|instantiated|instance|create|created|new)\b/
        .test(normalizedQuery);

    if (constructorQuery) {
      if (
        symbolType === "constructor_declaration" ||
        symbolName === "constructor"
      ) {
        bonus += 0.15;
      }

      // Java constructors normally have the class name
      // as their symbol name.
      if (
        symbolType === "constructor_declaration" &&
        symbolName &&
        symbolName === parentName
      ) {
        bonus += 0.05;
      }
    }

    /*
     * ---------------------------------------------------------
     * Declaration-oriented questions
     * ---------------------------------------------------------
     */

    const declarationQuery =
      /\b(class|interface|enum|record|type|struct|definition|defined)\b/
        .test(normalizedQuery);

    if (declarationQuery) {
      if (
        symbolType === "class_declaration" ||
        symbolType === "interface_declaration" ||
        symbolType === "enum_declaration" ||
        symbolType === "record_declaration" ||
        symbolType === "type_declaration" ||
        symbolType === "class_definition"
      ) {
        bonus += 0.07;
      }
    }

    /*
     * ---------------------------------------------------------
     * Java-specific method/constructor signals
     * ---------------------------------------------------------
     */

    if (symbolType === "constructor_declaration") {
      if (constructorQuery) {
        bonus += 0.10;
      }

      if (methodQuery && !constructorQuery) {
        bonus -= 0.03;
      }
    }

    if (
      symbolType === "method_declaration" &&
      methodQuery
    ) {
      bonus += 0.05;
    }

    /*
     * ---------------------------------------------------------
     * Rendering-specific behavior
     *
     * Preserve the existing Express retrieval behavior.
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * Error-handling behavior
     * ---------------------------------------------------------
     */

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

  const sortedResults = reranked
  .sort((a, b) => b.score - a.score);

const selected: SearchResult[] = [];
const seenSymbols = new Set<string>();

for (const result of sortedResults) {
  const symbolKey = [
    result.payload.filePath,
    result.payload.symbolName ?? "",
    result.payload.startLine,
    result.payload.endLine,
  ].join(":");

  if (seenSymbols.has(symbolKey)) {
    continue;
  }

  seenSymbols.add(symbolKey);
  selected.push(result);

  if (selected.length >= limit) {
    break;
  }
}

return selected;
}
