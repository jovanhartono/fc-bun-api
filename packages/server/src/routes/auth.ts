import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { StatusCodes } from 'http-status-codes';
import { db } from '@/server/db';
import { usersTable } from '@/server/db/schema';
import { failure, success } from '@/server/utils/http';

const loginSchema = createInsertSchema(usersTable).pick({
  username: true,
  password: true,
});
const app = new Hono().post(
  '/login',
  zValidator('json', loginSchema),
  async (c) => {
    const { username, password } = c.req.valid('json');

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.username, username),
    });

    if (!(user && (await Bun.password.verify(password, user.password)))) {
      return c.json(
        failure('Invalid username or password'),
        StatusCodes.UNAUTHORIZED
      );
    }

    const jwtPayload = {
      id: user.id,
      name: user.name,
      username: user.username,
    };
    const token = await sign(jwtPayload, process.env.JWT_SECRET);

    return c.json(success({ token }, 'Login Sucessfull!'), StatusCodes.OK);
  }
);

export default app;
