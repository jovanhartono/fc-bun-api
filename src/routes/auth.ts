import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { failure, success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";
import { eq } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { StatusCodes } from "http-status-codes";

const app = new Hono();

const loginSchema = createInsertSchema(usersTable).pick({
  username: true,
  password: true,
});
app.post("/login", zodValidator("json", loginSchema), async (c) => {
  const { username, password } = c.req.valid("json");

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });

  if (!user || !(await Bun.password.verify(password, user.password))) {
    return c.json(
      failure("Invalid username or password"),
      StatusCodes.UNAUTHORIZED,
    );
  }

  const jwtPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
  };
  const token = await sign(jwtPayload, process.env.JWT_SECRET);

  return c.json(success({ token }, "Login Sucessfull!"), StatusCodes.OK);
});

export default app;
