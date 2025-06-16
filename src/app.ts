import { Hono } from "hono";
import { cors } from "hono/cors";
import type { JwtVariables } from "hono/jwt";
import { logger } from "hono/logger";

const app = new Hono<{ Variables: JwtVariables }>()
  .basePath("/api")
  .use(logger())
  .use(
    cors({
      origin: ["https://example.org"],
    }),
  );

export default app;
