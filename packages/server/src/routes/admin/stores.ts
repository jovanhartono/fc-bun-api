import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { storesTable } from "@/db/schema";
import { idParamSchema } from "@/schema/param";
import { notFoundOrFirst } from "@/utils/helper";
import { failure, success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const POSTStoreSchema = createInsertSchema(storesTable);
const PUTStoreSchema = createUpdateSchema(storesTable);
const PATCHStoreSchema = createUpdateSchema(storesTable).pick({
  is_active: true,
});
const GETNearestStoreQuerySchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  longitude: z.coerce
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  limit: z.coerce.number().int().min(1).max(20).default(1).optional(),
  radius_km: z.coerce.number().positive().max(20_000).optional(),
  include_inactive: z.coerce.boolean().default(false).optional(),
});

const app = new Hono()
  .get("/", async (c) => {
    const stores = await db.query.storesTable.findMany({
      orderBy: [asc(storesTable.id)],
    });

    return c.json(success(stores));
  })
  .get(
    "/nearest",
    zodValidator("query", GETNearestStoreQuerySchema),
    async (c) => {
      const query = c.req.valid("query");

      const distanceExpr = sql<number>`
        6371 * ACOS(
          LEAST(
            1,
            GREATEST(
              -1,
              COS(RADIANS(${query.latitude})) *
              COS(RADIANS(CAST(${storesTable.latitude} AS DOUBLE PRECISION))) *
              COS(
                RADIANS(CAST(${storesTable.longitude} AS DOUBLE PRECISION)) -
                RADIANS(${query.longitude})
              ) +
              SIN(RADIANS(${query.latitude})) *
              SIN(RADIANS(CAST(${storesTable.latitude} AS DOUBLE PRECISION)))
            )
          )
        )
      `;

      const whereConditions: SQL[] = [];
      if (!query.include_inactive) {
        whereConditions.push(eq(storesTable.is_active, true));
      }
      if (query.radius_km !== undefined) {
        whereConditions.push(sql`${distanceExpr} <= ${query.radius_km}`);
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const stores = await db
        .select({
          id: storesTable.id,
          code: storesTable.code,
          name: storesTable.name,
          phone_number: storesTable.phone_number,
          address: storesTable.address,
          latitude: storesTable.latitude,
          longitude: storesTable.longitude,
          is_active: storesTable.is_active,
          created_at: storesTable.created_at,
          distance_km: distanceExpr,
        })
        .from(storesTable)
        .where(whereClause)
        .orderBy(asc(distanceExpr), asc(storesTable.id))
        .limit(query.limit ?? 1);

      return c.json(success(stores, "Nearest store retrieved successfully"));
    }
  )
  .post("/", zodValidator("json", POSTStoreSchema), async (c) => {
    const storeData = c.req.valid("json");

    const [store] = await db.insert(storesTable).values(storeData).returning();

    return c.json(
      success(store, "Successfully adding new store"),
      StatusCodes.CREATED
    );
  })
  .get("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const store = await db.query.storesTable.findFirst({
      where: eq(storesTable.id, id),
    });

    if (!store) {
      return c.json(failure("Store does not exist"), StatusCodes.NOT_FOUND);
    }

    return c.json(success(store));
  })
  .put(
    "/:id",
    idParamSchema,
    zodValidator("json", PUTStoreSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { code: _, ...storeData } = c.req.valid("json");

      const updatedStores = await db
        .update(storesTable)
        .set(storeData)
        .where(eq(storesTable.id, id))
        .returning();

      const store = notFoundOrFirst(updatedStores, c, "Store does not exist");
      if (store instanceof Response) {
        return store;
      }

      return c.json(success(store, `Successfully updated ${store.name}`));
    }
  )
  .patch(
    "/:id",
    idParamSchema,
    zodValidator("json", PATCHStoreSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");

      const updatedStores = await db
        .update(storesTable)
        .set({ is_active: data.is_active })
        .where(eq(storesTable.id, id))
        .returning();

      const store = notFoundOrFirst(updatedStores, c, "Store does not exist");
      if (store instanceof Response) {
        return store;
      }

      const statusText = data.is_active ? "Activated" : "Deactivated";
      return c.json(success(store, `${store.name} is ${statusText}`));
    }
  );

export default app;
