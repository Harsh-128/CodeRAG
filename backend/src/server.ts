import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { repositoryRoutes } from "./routes/repository.routes.js";
import { scannerRoutes } from "./routes/scanner.routes.js";
import { ragRoutes } from "./routes/rag.routes.js";

dotenv.config();

const app = Fastify({
  logger: true,
});

async function start() {
  await app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "CodeRAG backend",
    };
  });

  await app.register(repositoryRoutes);
  await app.register(scannerRoutes);
  await app.register(ragRoutes);

  try {
    await app.listen({
      port: 5000,
      host: "0.0.0.0",
    });

    console.log(
      "CodeRAG backend running on http://localhost:5000"
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
