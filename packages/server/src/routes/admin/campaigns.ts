import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import {
  campaignDiscountTypeEnum,
  campaignStoresTable,
  campaignsTable,
} from "@/db/schema";
import { BadRequestException, ForbiddenException } from "@/errors";
import { idParamSchema } from "@/schema/param";
import type { JWTPayload } from "@/types";
import { notFoundOrFirst } from "@/utils/helper";
import { failure, success } from "@/utils/http";
import { buildPaginationMeta, normalizePagination } from "@/utils/pagination";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const campaignStoreIdsSchema = z
  .array(z.coerce.number().int().positive())
  .default([]);

const campaignPayloadSchema = z.object({
  code: z.string().trim().min(1).max(32),
  discount_type: z.enum(campaignDiscountTypeEnum.enumValues),
  discount_value: z.string().trim().min(1),
  ends_at: z.coerce.date().nullish(),
  is_active: z.coerce.boolean().default(true),
  max_discount: z.string().trim().min(1).nullish(),
  min_order_total: z.string().trim().min(1).default("0"),
  name: z.string().trim().min(1).max(255),
  starts_at: z.coerce.date().nullish(),
  store_ids: campaignStoreIdsSchema,
});

const GETCampaignsQuerySchema = z
  .object({
    is_active: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    store_id: z.coerce.number().int().positive().optional(),
  })
  .optional();

async function ensureStoresExist(storeIds: number[]) {
  if (storeIds.length === 0) {
    return;
  }

  const stores = await db.query.storesTable.findMany({
    where: (store, { inArray }) => inArray(store.id, storeIds),
    columns: { id: true },
  });

  if (stores.length !== storeIds.length) {
    throw new BadRequestException("One or more store_ids are invalid");
  }
}

function assertIsAdmin(user: JWTPayload) {
  if (user.role !== "admin") {
    throw new ForbiddenException("Only admin can perform this action");
  }
}

const app = new Hono()
  .get("/", zodValidator("query", GETCampaignsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const pagination = normalizePagination(query, { maxPageSize: 100 });

    const conditions: SQL[] = [];
    if (query?.is_active !== undefined) {
      conditions.push(eq(campaignsTable.is_active, query.is_active));
    }
    if (query?.store_id !== undefined) {
      conditions.push(sql`(
        EXISTS (
          SELECT 1
          FROM ${campaignStoresTable} scoped_store
          WHERE scoped_store.campaign_id = ${campaignsTable.id}
          AND scoped_store.store_id = ${query.store_id}
        )
        OR NOT EXISTS (
          SELECT 1
          FROM ${campaignStoresTable} any_store
          WHERE any_store.campaign_id = ${campaignsTable.id}
        )
      )`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db.query.campaignsTable.findMany({
        where: whereClause,
        orderBy: [asc(campaignsTable.id)],
        limit: pagination.pageSize,
        offset: pagination.offset,
        with: {
          stores: {
            columns: { store_id: true },
            with: {
              store: {
                columns: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      db.$count(campaignsTable, whereClause),
    ]);

    return c.json(
      success(rows, undefined, buildPaginationMeta(totalRows, pagination))
    );
  })
  .get("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const campaign = await db.query.campaignsTable.findFirst({
      where: eq(campaignsTable.id, id),
      with: {
        stores: {
          columns: { id: true, store_id: true },
          with: {
            store: {
              columns: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return c.json(failure("Campaign not found"), StatusCodes.NOT_FOUND);
    }

    return c.json(success(campaign, "Campaign retrieved successfully"));
  })
  .post("/", zodValidator("json", campaignPayloadSchema), async (c) => {
    const user = c.get("jwtPayload") as JWTPayload;
    assertIsAdmin(user);
    const body = c.req.valid("json");
    const storeIds = [...new Set(body.store_ids)];

    await ensureStoresExist(storeIds);

    const created = await db.transaction(async (tx) => {
      const [campaign] = await tx
        .insert(campaignsTable)
        .values({
          code: body.code,
          name: body.name,
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          max_discount: body.max_discount ?? null,
          min_order_total: body.min_order_total,
          starts_at: body.starts_at ?? null,
          ends_at: body.ends_at ?? null,
          is_active: body.is_active,
          created_by: user.id,
          updated_by: user.id,
        })
        .returning();

      if (storeIds.length > 0) {
        await tx.insert(campaignStoresTable).values(
          storeIds.map((storeId) => ({
            campaign_id: campaign.id,
            store_id: storeId,
          }))
        );
      }

      return campaign;
    });

    return c.json(
      success(created, "Campaign created successfully"),
      StatusCodes.CREATED
    );
  })
  .put(
    "/:id",
    idParamSchema,
    zodValidator("json", campaignPayloadSchema.partial()),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      assertIsAdmin(user);
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const storeIds = body.store_ids
        ? [...new Set(body.store_ids)]
        : undefined;

      if (storeIds) {
        await ensureStoresExist(storeIds);
      }

      const rows = await db.transaction(async (tx) => {
        const updatedRows = await tx
          .update(campaignsTable)
          .set({
            code: body.code,
            name: body.name,
            discount_type: body.discount_type,
            discount_value: body.discount_value,
            max_discount: body.max_discount,
            min_order_total: body.min_order_total,
            starts_at: body.starts_at,
            ends_at: body.ends_at,
            is_active: body.is_active,
            updated_by: user.id,
          })
          .where(eq(campaignsTable.id, id))
          .returning();

        if (storeIds) {
          await tx
            .delete(campaignStoresTable)
            .where(eq(campaignStoresTable.campaign_id, id));

          if (storeIds.length > 0) {
            await tx.insert(campaignStoresTable).values(
              storeIds.map((storeId) => ({
                campaign_id: id,
                store_id: storeId,
              }))
            );
          }
        }

        return updatedRows;
      });

      const campaign = notFoundOrFirst(rows, c, "Campaign does not exist");
      if (campaign instanceof Response) {
        return campaign;
      }

      return c.json(success(campaign, "Campaign updated successfully"));
    }
  )
  .delete("/:id", idParamSchema, async (c) => {
    const user = c.get("jwtPayload") as JWTPayload;
    assertIsAdmin(user);
    const { id } = c.req.valid("param");

    const rows = await db
      .delete(campaignsTable)
      .where(eq(campaignsTable.id, id))
      .returning({ id: campaignsTable.id });

    if (rows.length === 0) {
      return c.json(failure("Campaign not found"), StatusCodes.NOT_FOUND);
    }

    return c.json(success(rows[0], "Campaign deleted successfully"));
  });

export default app;
