import { mapDbError } from "../core/errors.js";

// Every error leaves the API as { code, message, status } (NFR-02, Sprint 5 task S5-B8).
export function errorHandler(err, _req, res, _next) {
  const mapped = err?.code && err?.status ? err : mapDbError(err);
  const status = mapped?.status ?? 500;
  if (status === 500) console.error(err);
  const code = status === 500 ? "INTERNAL" : mapped.code ?? "ERROR";
  res.status(status).json({ code, message: status === 500 ? "Internal error" : String(mapped.message || code), status });
}

export function notFound(req, res) {
  res.status(404).json({ code: "NOT_FOUND", message: `No route ${req.method} ${req.path}`, status: 404 });
}

// Wrap async route handlers so that thrown errors reach errorHandler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
