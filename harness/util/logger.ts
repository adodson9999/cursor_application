import { pino } from "pino";

/** Shared pino logger for all harness modules. */
export const logger = pino({
  name: "cursor-pqe",
  level: process.env["LOG_LEVEL"] ?? "info",
  ...(process.env["NODE_ENV"] !== "test"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});
