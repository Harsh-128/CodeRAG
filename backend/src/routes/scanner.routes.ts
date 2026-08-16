import { FastifyInstance } from "fastify";
import { scanRepository } from "../services/file-scanner.service.js";

export async function scannerRoutes(app: FastifyInstance) {
  app.get("/repositories/:repositoryName/files", async (request, reply) => {
    const { repositoryName } = request.params as {
      repositoryName: string;
    };

    const repositoryPath = `${process.cwd()}/repositories/${repositoryName}`;

    try {
      const files = await scanRepository(repositoryPath);

      return {
        repository: repositoryName,
        totalFiles: files.length,
        files,
      };
    } catch (error) {
      app.log.error(error);

      return reply.status(500).send({
        error: "Failed to scan repository",
      });
    }
  });
}