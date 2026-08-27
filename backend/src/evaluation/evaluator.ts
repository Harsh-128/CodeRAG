import { hybridSearchCode } from "../services/search.service.js";
import { detectQueryIntent } from "../services/query-intent.service.js";
import {
  isSymbolNavigationQuestion,
  lookupSymbolsForQuestion,
} from "../services/symbol.service.js";
import { evaluationCases } from "./dataset.js";

const TOP_K = 5;

type RetrievedResult = {
  file: string;
  symbol?: string | null;
};

async function retrieveForEvaluation(
  evaluationCase: (typeof evaluationCases)[number],
): Promise<{
  path: "symbol-navigation" | "rag";
  results: RetrievedResult[];
}> {
  const { question, repository, language } = evaluationCase;
  const queryIntent = detectQueryIntent(question);

  /*
   * Mirror /api/ask:
   * lookup symbol/navigation candidates FIRST.
   */
  const symbolResults = await lookupSymbolsForQuestion(
    question,
    repository,
    language,
  );

  /*
   * /api/ask enters the symbol-navigation response path
   * when the query is classified as symbol-navigation
   * and symbol results exist.
   */
  if (
    queryIntent === "symbol-navigation" &&
    symbolResults.length > 0
  ) {
    return {
      path: "symbol-navigation",
      results: symbolResults.slice(0, TOP_K).map((result) => ({
        file: result.payload.filePath,
        symbol: result.payload.symbolName ?? null,
      })),
    };
  }

  /*
   * lookupSymbolsForQuestion() also handles specialized
   * symbol questions such as:
   *   "What does X do?"
   *   "Where is X called?"
   *   "Which methods belong to X?"
   *
   * These can have a non-symbol-navigation queryIntent,
   * but the production route still uses their symbol results
   * in the appropriate specialized flow.
   */
  if (
    symbolResults.length > 0 &&
    isSymbolNavigationQuestion(question)
  ) {
    return {
      path: "symbol-navigation",
      results: symbolResults.slice(0, TOP_K).map((result) => ({
        file: result.payload.filePath,
        symbol: result.payload.symbolName ?? null,
      })),
    };
  }

  /*
   * Otherwise use the normal hybrid RAG retrieval path.
   */
  const results = await hybridSearchCode(
    question,
    TOP_K,
    repository,
    language,
    false,
    queryIntent,
  );

  return {
    path: "rag",
    results: results.map((result) => ({
      file: result.payload.filePath,
      symbol: result.payload.symbolName ?? null,
    })),
  };
}

function isMatch(
  result: RetrievedResult,
  evaluationCase: (typeof evaluationCases)[number],
): boolean {
  if (!evaluationCase.expectedResults?.length) {
    return false;
  }

  return evaluationCase.expectedResults.some((expected) => {
    const fileMatches =
      !expected.file || result.file === expected.file;

    const symbolMatches =
      !expected.symbol || result.symbol === expected.symbol;

    return fileMatches && symbolMatches;
  });
}

async function main() {
  let intentCorrect = 0;
  let routingCorrect = 0;
  let top1Hits = 0;
  let top3Hits = 0;
  let top5Hits = 0;
  let reciprocalRankTotal = 0;

  console.log(`Running ${evaluationCases.length} evaluation cases...\n`);

  for (const evaluationCase of evaluationCases) {
    const predictedIntent = detectQueryIntent(evaluationCase.question);
    if (
      evaluationCase.expectedIntent &&
      predictedIntent !== evaluationCase.expectedIntent
    ) {
      console.log(
        `  INTENT MISMATCH: expected ${evaluationCase.expectedIntent}, got ${predictedIntent}`,
      );
    }

    if (
      evaluationCase.expectedIntent &&
      predictedIntent === evaluationCase.expectedIntent
    ) {
      intentCorrect++;
    }

    const { path, results } =
      await retrieveForEvaluation(evaluationCase);

    const expectedPath = evaluationCase.expectedPath;

    if (expectedPath && path === expectedPath) {
      routingCorrect++;
    } else {
      console.log(
        `  ROUTING MISMATCH: expected ${expectedPath}, got ${path}`,
      );
    }

    const rank = results.findIndex((result) =>
      isMatch(result, evaluationCase),
    );

    const top1 = rank === 0;
    const top3 = rank >= 0 && rank < 3;
    const top5 = rank >= 0 && rank < 5;

    if (top1) top1Hits++;
    if (top3) top3Hits++;
    if (top5) top5Hits++;

    if (rank >= 0) {
      reciprocalRankTotal += 1 / (rank + 1);
    }

    console.log(evaluationCase.id);
    console.log(`  Question: ${evaluationCase.question}`);
    console.log(`  Detected intent: ${predictedIntent}`);
    console.log(`  Execution path: ${path}`);

    if (rank >= 0) {
      console.log(`  Expected result rank: ${rank + 1}`);
    } else {
      console.log("  Expected result rank: NOT FOUND");
    }

    console.log(
      `  Top-1: ${top1 ? "HIT" : "MISS"} | ` +
        `Top-3: ${top3 ? "HIT" : "MISS"} | ` +
        `Top-5: ${top5 ? "HIT" : "MISS"}`,
    );

    console.log("");
  }

  const total = evaluationCases.length;

  console.log("========== EVALUATION ==========");

  console.log(
    `Intent accuracy: ${(intentCorrect / total * 100).toFixed(2)}%`,
  );

  console.log(
    `Routing accuracy: ${(routingCorrect / total * 100).toFixed(2)}%`,
  );

  console.log(
    `Top-1 accuracy: ${(top1Hits / total * 100).toFixed(2)}%`,
  );

  console.log(
    `Top-3 accuracy: ${(top3Hits / total * 100).toFixed(2)}%`,
  );

  console.log(
    `Top-5 accuracy: ${(top5Hits / total * 100).toFixed(2)}%`,
  );

  console.log(
    `MRR: ${(reciprocalRankTotal / total).toFixed(4)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
