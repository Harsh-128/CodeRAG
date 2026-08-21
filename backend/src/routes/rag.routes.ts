import { FastifyInstance } from "fastify";
import { hybridSearchCode } from "../services/search.service.js";
import { buildContext } from "../services/context.service.js";
import { generateAnswer } from "../services/llm.service.js";
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
      if (isSymbolNavigationQuestion(question) && symbolResults.length === 0) {
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
            question,
            repository: repositoryName ?? null,
            answer,
            sources,
            mode: "symbol-navigation",
          };
        }
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
              `Usage Line: ${payload.usageLine ?? "not applicable"}`,
              "",
              payload.content,
              "",
              "--- End Symbol Context ---",
            ].join("\n");
          })
          .join("\n\n");

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
              const usageLocation = `${payload.filePath}:${payload.usageLine ?? payload.startLine}`;

              return `- ${usageLocation} — ${payload.usageContent}`;
            }

            const location = `${payload.filePath}:${payload.startLine}-${payload.endLine}`;

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
          question,
          repository: repositoryName ?? null,
          answer,
          sources,
          mode: "symbol-navigation",
        };
      }

      /*
       * 3. Repository inventory path
       */
      if (
        repositoryName &&
        !language &&
        isRepositoryInventoryQuestion(question)
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
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to generate CodeRAG answer",
      });
    }
  });
}
