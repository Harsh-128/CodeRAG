import { FastifyInstance } from "fastify";
import { hybridSearchCode } from "../services/search.service.js";
import { buildContext } from "../services/context.service.js";
import { generateAnswer } from "../services/llm.service.js";
import { detectQueryIntent } from "../services/query-intent.service.js";
import { buildSymbolNavigationResponse } from "../services/symbol-navigation.service.js";
import {
  lookupSymbolsForQuestion,
  isSymbolNavigationQuestion,
  getRepositorySymbolInventory,
  isRepositoryInventoryQuestion,
  getRepositoryInventoryQuestionType,
  buildRepositoryDirectories,
  extractRepositoryDirectory,
  buildRepositoryDirectoryContents,
  buildRepositoryTree,
  buildRepositoryModuleOverview,
  buildRepositoryOverview,
} from "../services/symbol.service.js";

export async function ragRoutes(app: FastifyInstance) {
  app.get(
    "/api/repository/:repositoryName/inventory",
    async (request, reply) => {
      const { repositoryName } = request.params as {
        repositoryName?: string;
      };

      if (!repositoryName || !repositoryName.trim()) {
        return reply.status(400).send({
          error: "repositoryName is required",
        });
      }

      try {
        return await getRepositorySymbolInventory(repositoryName.trim());
      } catch (error) {
        app.log.error(error);

        return reply.status(500).send({
          error: "Failed to build repository symbol inventory",
        });
      }
    },
  );
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
    const queryIntent = detectQueryIntent(question);
    const repositoryName = body.repository?.trim();
    const language = body.language?.trim();

    try {
      /*
       * 1. Try exact symbol/navigation lookup first.
       */
      const symbolResults = await lookupSymbolsForQuestion(
        question,
        repositoryName,
        language,
      );
      if (
        isSymbolNavigationQuestion(question) &&
        queryIntent === "symbol-navigation" &&
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
      if (
        symbolResults.length > 0 &&
        queryIntent === "symbol-navigation" &&
        isSymbolNavigationQuestion(question)
      ) {
        const symbolNavigationResponse = buildSymbolNavigationResponse(
          question,
          symbolResults,
        );

        return {
          question,
          repository: repositoryName ?? null,
          ...symbolNavigationResponse,
        };
      }

      /*
       * 3. Repository inventory path
       */
      if (
        repositoryName &&
        !language &&
        (isRepositoryInventoryQuestion(question) ||
          queryIntent === "repository-inventory")
      ) {
        const inventory = await getRepositorySymbolInventory(repositoryName);
        const inventoryType = getRepositoryInventoryQuestionType(question);

        const inventoryContext = [
          "--- Repository Inventory ---",
          `Repository: ${inventory.repository}`,
          `Files (${inventory.files.length}):`,
          ...inventory.fileInventory.map((file) => {
            const symbols =
              file.symbols.length === 0
                ? "  (no extracted symbols)"
                : file.symbols
                    .map((symbol) => {
                      const parent = symbol.parentName
                        ? ` | parent: ${symbol.parentName}`
                        : "";

                      return [
                        `  - ${symbol.name}`,
                        symbol.type,
                        `${symbol.startLine}-${symbol.endLine}`,
                        parent,
                      ].join(" | ");
                    })
                    .join("\n");

            return [`- ${file.filePath} (${file.language})`, symbols].join(
              "\n",
            );
          }),
          "",
          `Total symbols: ${inventory.symbols.length}`,
          "--- End Repository Inventory ---",
        ].join("\n");

        let answer: string;

        if (inventoryType === "files") {
          answer = [
            `The repository contains ${inventory.files.length} files:`,
            ...inventory.files.map((file) => `- ${file}`),
          ].join("\n");
        } else if (inventoryType === "directories") {
          const directories = buildRepositoryDirectories(inventory);

          answer = [
            `The repository contains ${directories.length} directories:`,
            ...directories.map((directory) => `- ${directory}`),
          ].join("\n");
        } else if (inventoryType === "tree") {
          answer = buildRepositoryTree(inventory);
        } else if (inventoryType === "module_overview") {
          answer = buildRepositoryModuleOverview(inventory);
        } else if (inventoryType === "directory_contents") {
          const directory = extractRepositoryDirectory(question);

          if (!directory) {
            answer = "I could not determine the directory.";
          } else {
            const files = buildRepositoryDirectoryContents(
              inventory,
              directory,
            );

            answer =
              files.length === 0
                ? `No files found directly inside ${directory}.`
                : [
                    `Files inside ${directory}:`,
                    ...files.map((file) => `- ${file}`),
                  ].join("\n");
          }
        } else if (inventoryType === "symbols") {
          const symbolLines = inventory.fileInventory.flatMap((file) =>
            file.symbols.map((symbol) => {
              const parent = symbol.parentName
                ? ` | parent: ${symbol.parentName}`
                : "";

              return [
                `- ${symbol.name}`,
                `(${symbol.type})`,
                `— ${file.filePath}:${symbol.startLine}-${symbol.endLine}`,
                parent,
              ].join(" ");
            }),
          );

          answer = [
            `The repository contains ${inventory.symbols.length} symbols across ${inventory.files.length} files:`,
            ...symbolLines,
          ].join("\n");
        } else {
          answer = buildRepositoryOverview(inventory);
        }

        return {
          question,
          repository: repositoryName,
          answer,
          sources:
            inventoryType === "tree" || inventoryType === "module_overview"
              ? []
              : inventoryType === "directory_contents"
                ? (extractRepositoryDirectory(question)
                    ? buildRepositoryDirectoryContents(
                        inventory,
                        extractRepositoryDirectory(question)!,
                      )
                    : []
                  )
                    .slice(0, 5)
                    .map((filePath) => ({
                      file: filePath,
                      symbol: null,
                      parent: null,
                      language:
                        inventory.fileInventory.find(
                          (file) => file.filePath === filePath,
                        )?.language ?? null,
                      startLine: null,
                      endLine: null,
                    }))
                : inventory.symbols.slice(0, 5).map((symbol) => ({
                    file: symbol.filePath,
                    symbol: symbol.name,
                    parent: symbol.parentName ?? null,
                    language: symbol.language,
                    startLine: symbol.startLine,
                    endLine: symbol.endLine,
                  })),
          mode: "repository-inventory",
        };
      }

      /*
       * 4. Normal semantic + lexical RAG path
       */
      const broadRepositoryQuestion =
        /\b(repository|codebase|project|components|architecture|structure|flow|overview)\b/i.test(
          question,
        );

      const searchLimit = broadRepositoryQuestion ? 10 : 5;

      const results = await hybridSearchCode(
        question,
        searchLimit,
        repositoryName,
        language,
        broadRepositoryQuestion,
        queryIntent,
      );

      /*
       * 4. Build focused context
       */
      const context = buildContext(results, broadRepositoryQuestion);

      /*
       * 5. Generate grounded answer
       */
      const answer = await generateAnswer(question, context);

      /*
       * 6. Return sources
       */
      const sourceThreshold = broadRepositoryQuestion ? 0.45 : 0.7;

      const sources = results
        .filter((result) => result.score >= sourceThreshold)
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
        intent: queryIntent,
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to generate CodeRAG answer",
      });
    }
  });
}
