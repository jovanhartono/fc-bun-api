import { ValidationTargets } from "hono/types";
import { z, ZodSchema } from "zod/v4";
import { zValidator as zv } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";

export const zodValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      throw new HTTPException(StatusCodes.UNPROCESSABLE_ENTITY, {
        cause: z.flattenError(result.error),
        message: z.prettifyError(result.error),
      });
    }
  });
