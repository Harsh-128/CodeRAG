import Fastify from "fastify";
import cors from "@fastify/cors";

import { repositoryRoutes } from "./routes/repository.routes.js";
import { scannerRoutes } from "./routes/scanner.routes.js";
import { ragRoutes } from "./routes/rag.routes.js";

const app = Fastify({
  logger: true,
});

async function start() {
  await app.register(cors, {
    origin: true,
  });

  await app.register(repositoryRoutes);
  await app.register(scannerRoutes);
  await app.register(ragRoutes);

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "CodeRAG backend",
    };
  });

  try {
    await app.listen({
      port: 3000,
      host: "0.0.0.0",
    });

    console.log("CodeRAG backend running on http://localhost:3000");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();