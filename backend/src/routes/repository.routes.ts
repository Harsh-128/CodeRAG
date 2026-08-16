import { FastifyInstance } from "fastify";
import { cloneRepository } from "../services/repository.service.js";
import { indexRepository } from "../services/repository-indexer.service.js";

export async function repositoryRoutes(app: FastifyInstance) {
  app.post("/repositories/clone", async (request, reply) => {
    const body = request.body as {
      repositoryUrl: string;
      repositoryName: string;
    };

    if (!body.repositoryUrl || !body.repositoryName) {
      return reply.status(400).send({
        error: "repositoryUrl and repositoryName are required",
      });
    }

    try {
      const repositoryPath = await cloneRepository(
        body.repositoryUrl,
        body.repositoryName
      );

      return {
        message: "Repository cloned successfully",
        repositoryPath,
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to clone repository",
      });
    }
  });

  app.post("/repositories/index", async (request, reply) => {
    const body = request.body as {
      repositoryName: string;
    };

    if (!body.repositoryName) {
      return reply.status(400).send({
        error: "repositoryName is required",
      });
    }

    const repositoryPath =
      `${process.cwd()}/repositories/${body.repositoryName}`;

    try {
      const result = await indexRepository(
        body.repositoryName,
        repositoryPath
      );

      return {
        message: "Repository indexed successfully",
        repository: body.repositoryName,
        ...result,
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to index repository",
      });
    }
  });
}