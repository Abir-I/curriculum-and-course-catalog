import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Remove rendered components after each test (globals are off, so RTL does not do this by itself).
afterEach(() => cleanup());
