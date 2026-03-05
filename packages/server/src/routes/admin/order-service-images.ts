import { and, asc, count, eq, type SQL } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { orderServicesImagesTable } from "@/db/schema";
import { idParamSchema } from "@/schema/param";
import { notFoundOrFirst } from "@/utils/helper";
import { failure, success } from "@/utils/http";
import { buildPaginationMeta, normalizePagination } from "@/utils/pagination";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const POSTOrderServiceImageSchema = createInsertSchema(
  orderServicesImagesTable
);
const PUTOrderServiceImageSchema = createUpdateSchema(orderServicesImagesTable);

const GETOrderServiceImagesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    order_service_id: z.coerce.number().int().positive().optional(),
  })
  .optional();

const app = new Hono()
  .get(
    "/",
    zodValidator("query", GETOrderServiceImagesQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const pagination = normalizePagination(query, { maxPageSize: 100 });

      const conditions: SQL[] = [];
      if (query?.order_service_id !== undefined) {
        conditions.push(
          eq(orderServicesImagesTable.order_service_id, query.order_service_id)
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalRows] = await Promise.all([
        db.query.orderServicesImagesTable.findMany({
          orderBy: [asc(orderServicesImagesTable.id)],
          where: whereClause,
          limit: pagination.pageSize,
          offset: pagination.offset,
          with: {
            orderService: {
              columns: {
                id: true,
                order_id: true,
                service_id: true,
              },
            },
          },
        }),
        db
          .select({ total: count() })
          .from(orderServicesImagesTable)
          .where(whereClause),
      ]);

      return c.json(
        success(
          items,
          undefined,
          buildPaginationMeta(Number(totalRows[0]?.total ?? 0), pagination)
        )
      );
    }
  )
  .get("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const image = await db.query.orderServicesImagesTable.findFirst({
      where: eq(orderServicesImagesTable.id, id),
      with: {
        orderService: true,
      },
    });

    if (!image) {
      return c.json(
        failure("Order service image not found"),
        StatusCodes.NOT_FOUND
      );
    }

    return c.json(success(image, "Order service image retrieved successfully"));
  })
  .post("/", zodValidator("json", POSTOrderServiceImageSchema), async (c) => {
    const body = c.req.valid("json");

    const [image] = await db
      .insert(orderServicesImagesTable)
      .values(body)
      .returning();

    return c.json(
      success(image, "Create order service image success"),
      StatusCodes.CREATED
    );
  })
  .put(
    "/:id",
    idParamSchema,
    zodValidator("json", PUTOrderServiceImageSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const rows = await db
        .update(orderServicesImagesTable)
        .set(body)
        .where(eq(orderServicesImagesTable.id, id))
        .returning();

      const image = notFoundOrFirst(
        rows,
        c,
        "Order service image does not exist"
      );
      if (image instanceof Response) {
        return image;
      }

      return c.json(success(image, "Order service image updated successfully"));
    }
  )
  .delete("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const rows = await db
      .delete(orderServicesImagesTable)
      .where(eq(orderServicesImagesTable.id, id))
      .returning({ id: orderServicesImagesTable.id });

    if (rows.length === 0) {
      return c.json(
        failure("Order service image not found"),
        StatusCodes.NOT_FOUND
      );
    }

    return c.json(success(rows[0], "Order service image deleted successfully"));
  });

export default app;
