import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { userRoleEnum, usersTable } from "@/db/schema";
import { findUserById } from "@/modules/users/user.repository";
import { idParamSchema } from "@/schema/param";
import { notFoundOrFirst } from "@/utils/helper";
import { failure, success } from "@/utils/http";
import { buildPaginationMeta, normalizePagination } from "@/utils/pagination";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const POSTUserSchema = createInsertSchema(usersTable);
const PUTUserSchema = createUpdateSchema(usersTable);
const GETUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    is_active: z.coerce.boolean().optional(),
    role: z.enum(userRoleEnum.enumValues).optional(),
  })
  .optional();

const app = new Hono()
  .post("/", zodValidator("json", POSTUserSchema), async (c) => {
    const user = c.req.valid("json");
    const passwordHash = await Bun.password.hash(user.password);

    const data = await db
      .insert(usersTable)
      .values({
        ...user,
        password: passwordHash,
      })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        is_active: usersTable.is_active,
        role: usersTable.role,
        created_at: usersTable.created_at,
        updated_at: usersTable.updated_at,
        password: usersTable.password,
      });

    const [{ password: _password, ...safeUser }] = data;

    return c.json(
      success(safeUser, "Create user success"),
      StatusCodes.CREATED
    );
  })
  .get("/", zodValidator("query", GETUsersQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const pagination = normalizePagination(query, { maxPageSize: 100 });

    const conditions: SQL[] = [];
    if (query?.is_active !== undefined) {
      conditions.push(eq(usersTable.is_active, query.is_active));
    }
    if (query?.role) {
      conditions.push(eq(usersTable.role, query.role));
    }
    if (query?.search) {
      const searchPrefix = `${query.search}%`;
      conditions.push(
        or(
          like(usersTable.username, searchPrefix),
          like(usersTable.name, searchPrefix)
        ) as SQL
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, totalRows] = await Promise.all([
      db.query.usersTable.findMany({
        columns: {
          password: false,
        },
        orderBy: [asc(usersTable.id)],
        where: whereClause,
        limit: pagination.pageSize,
        offset: pagination.offset,
      }),
      db.$count(usersTable, whereClause),
    ]);

    return c.json(
      success(users, undefined, buildPaginationMeta(totalRows, pagination))
    );
  })
  .get("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const user = await findUserById(id);

    if (!user) {
      return c.json(failure("User not found", StatusCodes.NOT_FOUND));
    }

    const { password: _, ...safeUser } = user;
    return c.json(success(safeUser, "User retrieved successfully"));
  })
  .put(
    "/:id",
    idParamSchema,
    zodValidator("json", PUTUserSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { password: _payloadPassword, ...body } = c.req.valid("json");

      const updatedUser = await db
        .update(usersTable)
        .set(body)
        .where(eq(usersTable.id, id))
        .returning();

      const user = notFoundOrFirst(updatedUser, c, "User does not exist");
      if (user instanceof Response) {
        return user;
      }

      const { password: _userPassword, ...safeUser } = user;
      return c.json(success(safeUser, `Update user ${safeUser.name} success`));
    }
  );

export default app;
