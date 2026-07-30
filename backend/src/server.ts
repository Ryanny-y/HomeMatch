// import { app } from "./app";
// import { disconnectPrisma } from "./lib/prisma";
// import { env } from "./shared/config/env";
// import { logger } from "./shared/logger";

// const server = app.listen(env.PORT, () => {
//   logger.info(
//     { port: env.PORT, env: env.NODE_ENV, origins: env.allowedOrigins },
//     "SolarX API listening",
//   );
// });

// async function shutdown(signal: string): Promise<void> {
//   logger.info({ signal }, "Shutting down");

//   server.close(() => {
//     void disconnectPrisma().then(() => {
//       logger.info("Shutdown complete");
//       process.exit(0);
//     });
//   });

//   setTimeout(() => {
//     logger.error("Shutdown timed out, forcing exit");
//     process.exit(1);
//   }, 10_000).unref();
// }

// process.on("SIGTERM", () => void shutdown("SIGTERM"));
// process.on("SIGINT", () => void shutdown("SIGINT"));

// process.on("unhandledRejection", (reason) => {
//   logger.fatal({ err: reason }, "Unhandled promise rejection");
//   process.exit(1);
// });
