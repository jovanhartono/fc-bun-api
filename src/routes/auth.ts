import { Hono } from "hono";
import { usersTable } from "../db/schema";
import { z } from "zod/v4";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { createInsertSchema } from "drizzle-zod";

const app = new Hono();

const loginSchema = createInsertSchema(usersTable).pick({
  username: true,
  password: true,
});
app.post("/login", async (c) => {
  const body = loginSchema.safeParse(await c.req.json());

  if (!body.success) {
    {
      return c.json(
        {
          message: "Request body has a typo or missing field.",
          errors: z.treeifyError(body.error),
        },
        422
      );
    }
  }

  const {
    data: { username, password },
  } = body;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });

  if (!user || !(await Bun.password.verify(password, user.password))) {
    return c.json(
      {
        message: "Invalid username or password",
      },
      401
    );
  }

  const jwtPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
  };
  const token = await sign(jwtPayload, process.env.JWT_SECRET);

  return c.json({ message: "login successful", token });
});

export default app;
