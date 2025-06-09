import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import authRoutes from "@/routes/auth";
import { adminMiddleware } from "@/middlewares/admin";
import app from "@/app";
import adminRoutes from "@/routes/admin";
import { failure } from "@/utils/http";
import { StatusCodes } from "http-status-codes";

// logger
app.use(logger());
// cors
app.use(
  cors({
    origin: ["https://example.org"],
  })
);

// routes
app.route("/auth", authRoutes);

app.use("/admin/*", adminMiddleware);
app.route("/admin", adminRoutes);

// error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(failure(err.message, err.cause), err.status);
  }

  if (typeof err.cause === "object" && err.cause && "detail" in err.cause) {
    let statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR;
    if ("code" in err.cause) {
      switch (err.cause.code) {
        case "23505": {
          statusCode = StatusCodes.CONFLICT;
        }
      }
    }

    return c.json(failure(err.cause.detail as string), statusCode);
  }

  console.error(err);
  return c.json(failure(err.message), StatusCodes.INTERNAL_SERVER_ERROR);
});

export default {
  port: "8000",
  fetch: app.fetch,
};
