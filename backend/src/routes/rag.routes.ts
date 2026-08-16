import { FastifyInstance } from "fastify";
import { hybridSearchCode } from "../services/search.service.js";
import { buildContext } from "../services/context.service.js";
import { generateAnswer } from "../services/llm.service.js";

export async function ragRoutes(app: FastifyInstance) {
  app.post("/api/ask", async (request, reply) => {
    const body = request.body as {
  question?: string;
  repository?: string;
};

    if (!body.question || !body.question.trim()) {
      return reply.status(400).send({
        error: "question is required",
      });
    }

    const question = body.question.trim();
    const repositoryName = body.repository?.trim();

    try {
      // 1. Retrieve relevant code
      const results = await hybridSearchCode(
  question,
  5,
  repositoryName
);

      // 2. Build focused context
      const context = buildContext(results);

      // 3. Generate grounded answer
      const answer = await generateAnswer(
        question,
        context
      );

      // 4. Return sources used for the answer
      const sources = results
        .filter((result) => result.score >= 0.70)
        .slice(0, 3)
        .map((result) => ({
          file: result.payload.filePath,
          symbol: result.payload.symbolName ?? null,
          startLine: result.payload.startLine,
          endLine: result.payload.endLine,
          score: Number(result.score.toFixed(4)),
        }));

      return {
  question,
  repository: repositoryName ?? null,
  answer,
  sources,
};
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to generate CodeRAG answer",
      });
    }
  });
}