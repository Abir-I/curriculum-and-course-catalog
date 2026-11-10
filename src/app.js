// Express application for /api/v1 (Sprint 5). Tests import this file; server.js starts it.
import express from "express";
import { devAuth } from "./http/auth.js";
import { errorHandler, notFound } from "./http/errors.js";
import courses from "./http/routes/courses.js";
import rooms from "./http/routes/rooms.js";
import eligibility from "./http/routes/eligibility.js";
import audit from "./http/routes/audit.js";
import offerings from "./http/routes/offerings.js";
import studyPlan from "./http/routes/study-plan.js";

export const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(devAuth);

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/v1/courses", courses);
app.use("/api/v1/rooms", rooms);
app.use("/api/v1/eligibility", eligibility);
app.use("/api/v1/offerings", offerings);
app.use("/api/v1/audit", audit);
app.use("/api/v1/curricula", studyPlan);

app.use(notFound);
app.use(errorHandler);
