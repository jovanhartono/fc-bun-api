import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { userRoleEnum, userStoresTable, usersTable } from "@/db/schema";
import { ForbiddenException } from "@/errors";
import { idParamSchema } from "@/schema/param";
import type { JWTPayload } from "@/types";
import { notFoundOrFirst } from "@/utils/helper";
import { failure, success } from "@/utils/http";
import { buildPaginationMeta, normalizePagination } from "@/utils/pagination";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const POSTUserSchema = createInsertSchema(usersTable);
const PUTUserSchema = createUpdateSchema(usersTable);
const PUTUserStoresSchema = z.object({
  store_ids: z.array(z.coerce.number().int().positive()),
});
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
        with: {
          userStores: {
            columns: {
              store_id: true,
            },
          },
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

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
      with: {
        userStores: {
          columns: {
            store_id: true,
          },
        },
      },
    });

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
  )
  .put(
    "/:id/stores",
    idParamSchema,
    zodValidator("json", PUTUserStoresSchema),
    async (c) => {
      const actor = c.get("jwtPayload") as JWTPayload;
      if (actor.role !== "admin") {
        throw new ForbiddenException("Only admin can update user stores");
      }

      const { id } = c.req.valid("param");
      const { store_ids } = c.req.valid("json");

      const targetUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, id),
        columns: { id: true },
      });

      if (!targetUser) {
        return c.json(failure("User not found", StatusCodes.NOT_FOUND));
      }

      await db.transaction(async (tx) => {
        await tx.delete(userStoresTable).where(eq(userStoresTable.user_id, id));

        const uniqueStoreIds = [...new Set(store_ids)];
        if (uniqueStoreIds.length > 0) {
          await tx.insert(userStoresTable).values(
            uniqueStoreIds.map((storeId) => ({
              user_id: id,
              store_id: storeId,
            }))
          );
        }
      });

      return c.json(
        success(
          { id, store_ids: [...new Set(store_ids)] },
          "User stores updated"
        )
      );
    }
  );

export default app;
