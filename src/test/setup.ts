import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.API_BASE_URL ??= "http://api.test";

afterEach(() => cleanup());
