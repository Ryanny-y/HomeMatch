import { app } from "./app";
import { disconnectPrisma } from "./lib/prisma";
import { env } from "./shared/config/env";
import { logger } from "./shared/logger";

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, origins: env.allowedOrigins },
    "HomeMatch API listening",
  );
});

/**
 * Graceful shutdown.
 *
 * The order matters: stop accepting connections, let in-flight requests finish,
 * *then* drop the database pool. Disconnecting first would fail the requests
 * that are still running.
 *
 * The timeout is a backstop for a connection that never closes (a hung
 * keep-alive, a slow query). It is `unref`'d so it cannot itself be the reason
 * the process stays alive.
 */
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  // ECS sends SIGTERM and, if the task lingers, SIGKILL. A second signal
  // arriving mid-shutdown must not start a second teardown.
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down");

  const forced = setTimeout(() => {
    logger.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000);
  forced.unref();

  server.close(() => {
    void disconnectPrisma()
      .then(() => {
        logger.info("Shutdown complete");
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, "Failed to disconnect from the database");
        process.exit(1);
      });
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});
