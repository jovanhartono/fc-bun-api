import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { orderServicesImagesTable, ordersServicesTable } from "@/db/schema";
import { BadRequestException, NotFoundException } from "@/errors";
import {
  createOrderController,
  getOrdersController,
} from "@/modules/orders/order.controller";
import { GETOrdersQuerySchema } from "@/modules/orders/order.schema";
import { POSTOrderSchema } from "@/schema";
import { idParamSchema } from "@/schema/param";
import type { JWTPayload } from "@/types";
import { failure, success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const POSTOrderProofPhotosSchema = z.object({
  image_urls: z
    .array(z.string().trim().min(1).max(255))
    .min(1)
    .max(10, "Maximum 10 photos per request"),
  order_service_id: z.coerce.number().int().positive().optional(),
});

const app = new Hono()
  .get("/", zodValidator("query", GETOrdersQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { items, meta } = await getOrdersController(query);

    return c.json(success(items, undefined, meta));
  })
  .post("/", zodValidator("json", POSTOrderSchema), async (c) => {
    const { id: userId } = c.get("jwtPayload") as JWTPayload;
    const body = c.req.valid("json");

    const created = await createOrderController({
      userId,
      body,
    });

    return c.json(success(created, "Order created"), StatusCodes.CREATED);
  })
  .get("/:id/proof-photos", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const orderExists = await db.query.ordersTable.findFirst({
      where: (order, { eq }) => eq(order.id, id),
      columns: { id: true },
    });
    if (!orderExists) {
      return c.json(failure("Order not found"), StatusCodes.NOT_FOUND);
    }

    const serviceRows = await db.query.ordersServicesTable.findMany({
      where: eq(ordersServicesTable.order_id, id),
      columns: { id: true, order_id: true, service_id: true },
      with: {
        images: {
          columns: {
            id: true,
            image_url: true,
            created_at: true,
            updated_at: true,
          },
        },
        service: {
          columns: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [asc(ordersServicesTable.id)],
    });

    return c.json(
      success(
        serviceRows.map((row) => ({
          images: row.images,
          order_id: row.order_id,
          order_service_id: row.id,
          service: row.service,
        })),
        "Order proof photos retrieved successfully"
      )
    );
  })
  .post(
    "/:id/proof-photos",
    idParamSchema,
    zodValidator("json", POSTOrderProofPhotosSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const order = await db.query.ordersTable.findFirst({
        where: (order, { eq }) => eq(order.id, id),
        columns: { id: true },
      });

      if (!order) {
        throw new NotFoundException("Order not found");
      }

      const targetOrderService = body.order_service_id
        ? await db.query.ordersServicesTable.findFirst({
            where: and(
              eq(ordersServicesTable.id, body.order_service_id),
              eq(ordersServicesTable.order_id, id)
            ),
            columns: { id: true },
          })
        : await db.query.ordersServicesTable.findFirst({
            where: eq(ordersServicesTable.order_id, id),
            columns: { id: true },
            orderBy: [asc(ordersServicesTable.id)],
          });

      if (!targetOrderService) {
        throw new BadRequestException(
          "Order service not found for this order. Provide a valid order_service_id"
        );
      }

      const inserted = await db
        .insert(orderServicesImagesTable)
        .values(
          body.image_urls.map((image_url) => ({
            image_url,
            order_service_id: targetOrderService.id,
          }))
        )
        .returning();

      return c.json(
        success(
          {
            items: inserted,
            order_id: id,
            order_service_id: targetOrderService.id,
          },
          "Order proof photos uploaded successfully"
        ),
        StatusCodes.CREATED
      );
    }
  );

export default app;
