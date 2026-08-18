import { FastifyInstance } from "fastify";
import { hybridSearchCode } from "../services/search.service.js";
import { buildContext } from "../services/context.service.js";
import { generateAnswer } from "../services/llm.service.js";
import {
  lookupSymbolsForQuestion,
  isSymbolNavigationQuestion,
} from "../services/symbol.service.js";

export async function ragRoutes(app: FastifyInstance) {
  app.post("/api/ask", async (request, reply) => {
    const body = request.body as {
      question?: string;
      repository?: string;
      language?: string;
    };

    if (!body.question || !body.question.trim()) {
      return reply.status(400).send({
        error: "question is required",
      });
    }

    const question = body.question.trim();
    const repositoryName = body.repository?.trim();
    const language = body.language?.trim();

    try {
      /*
       * 1. Try exact symbol/navigation lookup first.
       */
      const symbolResults = await lookupSymbolsForQuestion(
        question,
        repositoryName,
        language
      );
      if (
        isSymbolNavigationQuestion(question) &&
        symbolResults.length === 0
      ) {
        return {
          question,
          repository: repositoryName ?? null,
          answer: "No matching symbol implementations were found.",
          sources: [],
          mode: "symbol-navigation",
        };
      }
      /*
       * 2. Symbol/navigation path
       */
      if (symbolResults.length > 0) {
        const context = symbolResults
          .slice(0, 10)
          .map((result, index) => {
            const payload = result.payload;

            return [
              `--- Symbol Context ${index + 1} ---`,
              `Repository: ${payload.repository}`,
              `File: ${payload.filePath}`,
              `Language: ${payload.language}`,
              `Symbol: ${payload.symbolName ?? "anonymous"}`,
              `Parent: ${payload.parentName ?? "none"}`,
              `Type: ${payload.symbolType}`,
              `Lines: ${payload.startLine}-${payload.endLine}`,
              "",
              payload.content,
              "",
              "--- End Symbol Context ---",
            ].join("\n");
          })
          .join("\n\n");

        const answer = await generateAnswer(
          question,
          context
        );

        const sources = symbolResults
          .slice(0, 5)
          .map((result) => ({
            file: result.payload.filePath,
            symbol: result.payload.symbolName ?? null,
            parent: result.payload.parentName ?? null,
            language: result.payload.language,
            startLine: result.payload.startLine,
            endLine: result.payload.endLine,
          }));

        return {
          question,
          repository: repositoryName ?? null,
          answer,
          sources,
          mode: "symbol-navigation",
        };
      }

      /*
       * 3. Normal semantic + lexical RAG path
       */
      const results = await hybridSearchCode(
        question,
        5,
        repositoryName,
        language
      );

      /*
       * 4. Build focused context
       */
      const context = buildContext(results);

      /*
       * 5. Generate grounded answer
       */
      const answer = await generateAnswer(
        question,
        context
      );

      /*
       * 6. Return sources
       */
      const sources = results
        .filter((result) => result.score >= 0.70)
        .slice(0, 3)
        .map((result) => ({
          file: result.payload.filePath,
          symbol: result.payload.symbolName ?? null,
          parent: result.payload.parentName ?? null,
          language: result.payload.language,
          startLine: result.payload.startLine,
          endLine: result.payload.endLine,
          score: Number(result.score.toFixed(4)),
        }));

      return {
        question,
        repository: repositoryName ?? null,
        answer,
        sources,
        mode: "rag",
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to generate CodeRAG answer",
      });
    }
  });
}