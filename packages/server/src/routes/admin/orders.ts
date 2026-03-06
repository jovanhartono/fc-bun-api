import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import {
  orderRefundItemsTable,
  orderRefundsTable,
  orderServiceHandlerLogsTable,
  orderServicePhotoTypeEnum,
  orderServiceStatusEnum,
  orderServiceStatusLogsTable,
  orderServicesImagesTable,
  ordersProductsTable,
  ordersServicesTable,
  ordersTable,
  servicesTable,
  storesTable,
} from "@/db/schema";
import { BadRequestException, ForbiddenException } from "@/errors";
import {
  createOrderController,
  getOrdersController,
} from "@/modules/orders/order.controller";
import { GETOrdersQuerySchema } from "@/modules/orders/order.schema";
import { POSTOrderSchema } from "@/schema";
import { idParamSchema } from "@/schema/param";
import type { JWTPayload } from "@/types";
import {
  assertOrderAccess,
  assertStoreAccess,
  getUserStoreIds,
} from "@/utils/authorization";
import { failure, success } from "@/utils/http";
import { buildS3ObjectUrl, createPresignedUploadUrl } from "@/utils/s3";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const ORDER_TERMINAL_SERVICE_STATUSES = new Set([
  "picked_up",
  "refunded",
  "cancelled",
]);

const statusTransitions: Record<
  (typeof orderServiceStatusEnum.enumValues)[number],
  (typeof orderServiceStatusEnum.enumValues)[number][]
> = {
  received: ["queued", "cancelled"],
  queued: ["processing", "cancelled"],
  processing: ["quality_check", "cancelled"],
  quality_check: ["processing", "ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "refunded", "cancelled"],
  picked_up: [],
  refunded: [],
  cancelled: [],
};

const orderServiceParamSchema = zodValidator(
  "param",
  z.object({
    id: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
  })
);

const POSTOrderServicePhotoPresignSchema = z.object({
  content_type: z
    .string()
    .trim()
    .refine(
      (value) =>
        ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(value),
      "Unsupported content type"
    ),
  photo_type: z.enum(orderServicePhotoTypeEnum.enumValues),
});

const POSTOrderServicePhotoSchema = z.object({
  photo_type: z.enum(orderServicePhotoTypeEnum.enumValues),
  s3_key: z.string().trim().min(1).max(512),
});

const PATCHOrderServiceStatusSchema = z.object({
  note: z.string().trim().optional(),
  status: z.enum(orderServiceStatusEnum.enumValues),
});

const PATCHOrderServiceHandlerSchema = z.object({
  handler_id: z.coerce.number().int().positive().nullable(),
  note: z.string().trim().optional(),
});

const PATCHOrderPaymentSchema = z.object({
  payment_method_id: z.coerce.number().int().positive(),
});

const POSTOrderRefundSchema = z.object({
  items: z
    .array(
      z
        .object({
          note: z.string().trim().optional(),
          order_service_id: z.coerce.number().int().positive(),
          reason: z.enum(["damaged", "cannot_process", "lost", "other"]),
        })
        .superRefine((value, ctx) => {
          if (value.reason === "other" && !value.note?.trim()) {
            ctx.addIssue({
              code: "custom",
              message: "Reason note is required when reason is 'other'",
              path: ["note"],
            });
          }
        })
    )
    .min(1),
  note: z.string().trim().optional(),
});

const GETOrderByItemCodeQuerySchema = z.object({
  item_code: z.string().trim().min(1).max(64),
});

const GETMyOrderServicesQuerySchema = z.object({
  store_id: z.coerce.number().int().positive().optional(),
  include_terminal: z.coerce.boolean().optional().default(false),
});

async function getOrderServiceOrThrow(orderId: number, serviceId: number) {
  const orderService = await db.query.ordersServicesTable.findFirst({
    where: and(
      eq(ordersServicesTable.order_id, orderId),
      eq(ordersServicesTable.id, serviceId)
    ),
  });

  if (!orderService) {
    throw new BadRequestException("Order service not found for this order");
  }

  return orderService;
}

async function recalculateOrderStatus(orderId: number, updatedBy: number) {
  const [services, products] = await Promise.all([
    db.query.ordersServicesTable.findMany({
      where: eq(ordersServicesTable.order_id, orderId),
      columns: { status: true },
    }),
    db.$count(ordersProductsTable, eq(ordersProductsTable.order_id, orderId)),
  ]);

  let nextStatus: "created" | "processing" | "completed" | "cancelled" =
    "created";

  if (services.length === 0) {
    nextStatus = products > 0 ? "completed" : "created";
  } else {
    const allTerminal = services.every((item) =>
      ORDER_TERMINAL_SERVICE_STATUSES.has(item.status)
    );

    if (allTerminal) {
      nextStatus = "completed";
    } else {
      const anyInProgress = services.some((item) => item.status !== "received");
      nextStatus = anyInProgress ? "processing" : "created";
    }
  }

  await db
    .update(ordersTable)
    .set({
      status: nextStatus,
      completed_at: nextStatus === "completed" ? new Date() : null,
      updated_by: updatedBy,
    })
    .where(eq(ordersTable.id, orderId));
}

async function getOrderLineRefundCaps(orderId: number) {
  const [order, serviceRows, refundedRows] = await Promise.all([
    db.query.ordersTable.findFirst({
      where: eq(ordersTable.id, orderId),
      columns: {
        id: true,
        total: true,
        discount: true,
      },
    }),
    db.query.ordersServicesTable.findMany({
      where: eq(ordersServicesTable.order_id, orderId),
      columns: {
        id: true,
        subtotal: true,
      },
    }),
    db
      .select({
        order_service_id: orderRefundItemsTable.order_service_id,
        refunded_total: sql<string>`COALESCE(SUM(${orderRefundItemsTable.amount}), 0)`,
      })
      .from(orderRefundItemsTable)
      .innerJoin(
        orderRefundsTable,
        eq(orderRefundItemsTable.order_refund_id, orderRefundsTable.id)
      )
      .where(eq(orderRefundsTable.order_id, orderId))
      .groupBy(orderRefundItemsTable.order_service_id),
  ]);

  if (!order) {
    throw new BadRequestException("Order not found");
  }

  const grossTotal = Number(order.total ?? 0);
  const orderDiscount = Number(order.discount);

  const refundedByServiceId = new Map(
    refundedRows.map((row) => [
      row.order_service_id,
      Number(row.refunded_total),
    ])
  );

  return serviceRows.map((row) => {
    const grossLine = Number(row.subtotal ?? 0);
    const allocatedDiscount =
      grossTotal > 0 ? (grossLine / grossTotal) * orderDiscount : 0;
    const refundableGross = Math.max(0, grossLine - allocatedDiscount);
    const alreadyRefunded = refundedByServiceId.get(row.id) ?? 0;

    return {
      maxRefundable: Math.max(0, refundableGross - alreadyRefunded),
      order_service_id: row.id,
    };
  });
}

function assertIsAdmin(user: JWTPayload) {
  if (user.role !== "admin") {
    throw new ForbiddenException("Only admin can perform this action");
  }
}

function assertCanProcessPaymentOrRefund(user: JWTPayload) {
  if (!["admin", "cashier"].includes(user.role)) {
    throw new ForbiddenException(
      "Only admin or cashier can perform this action"
    );
  }
}

const app = new Hono()
  .get("/", zodValidator("query", GETOrdersQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const user = c.get("jwtPayload") as JWTPayload;

    if (user.role !== "admin") {
      if (query?.store_id === undefined) {
        throw new BadRequestException(
          "store_id is required for non-admin users"
        );
      }

      await assertStoreAccess(user, query.store_id);
    }

    const { items, meta } = await getOrdersController(query);

    return c.json(success(items, undefined, meta));
  })
  .get(
    "/services/by-item-code",
    zodValidator("query", GETOrderByItemCodeQuerySchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { item_code } = c.req.valid("query");

      const orderService = await db.query.ordersServicesTable.findFirst({
        where: eq(ordersServicesTable.item_code, item_code),
        with: {
          order: {
            columns: {
              id: true,
              code: true,
              store_id: true,
              status: true,
            },
          },
          service: {
            columns: {
              id: true,
              code: true,
              name: true,
            },
          },
          handler: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!orderService?.order) {
        return c.json(
          failure("Order service not found"),
          StatusCodes.NOT_FOUND
        );
      }

      await assertStoreAccess(user, orderService.order.store_id);

      return c.json(
        success(orderService, "Order service retrieved successfully")
      );
    }
  )
  .get(
    "/services/me",
    zodValidator("query", GETMyOrderServicesQuerySchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const query = c.req.valid("query");

      const conditions = [eq(ordersServicesTable.handler_id, user.id)];

      if (!query.include_terminal) {
        conditions.push(
          sql`${ordersServicesTable.status} NOT IN ('picked_up', 'refunded', 'cancelled')`
        );
      }

      if (user.role === "admin") {
        if (query.store_id !== undefined) {
          conditions.push(eq(ordersTable.store_id, query.store_id));
        }
      } else if (query.store_id !== undefined) {
        await assertStoreAccess(user, query.store_id);
        conditions.push(eq(ordersTable.store_id, query.store_id));
      } else {
        const storeIds = await getUserStoreIds(user.id);
        if (storeIds.length === 0) {
          return c.json(
            success([], "My order services retrieved successfully")
          );
        }

        conditions.push(inArray(ordersTable.store_id, storeIds));
      }

      const rows = await db
        .select({
          handler_id: ordersServicesTable.handler_id,
          id: ordersServicesTable.id,
          item_code: ordersServicesTable.item_code,
          order_code: ordersTable.code,
          order_created_at: ordersTable.created_at,
          order_id: ordersTable.id,
          service_code: servicesTable.code,
          service_name: servicesTable.name,
          shoe_brand: ordersServicesTable.shoe_brand,
          shoe_size: ordersServicesTable.shoe_size,
          status: ordersServicesTable.status,
          store_code: storesTable.code,
          store_id: storesTable.id,
          store_name: storesTable.name,
        })
        .from(ordersServicesTable)
        .innerJoin(
          ordersTable,
          eq(ordersServicesTable.order_id, ordersTable.id)
        )
        .innerJoin(storesTable, eq(ordersTable.store_id, storesTable.id))
        .innerJoin(
          servicesTable,
          eq(ordersServicesTable.service_id, servicesTable.id)
        )
        .where(and(...conditions))
        .orderBy(asc(ordersServicesTable.id));

      return c.json(success(rows, "My order services retrieved successfully"));
    }
  )
  .post("/", zodValidator("json", POSTOrderSchema), async (c) => {
    const user = c.get("jwtPayload") as JWTPayload;
    const body = c.req.valid("json");

    await assertStoreAccess(user, body.store_id);

    const created = await createOrderController({
      userId: user.id,
      body,
    });

    return c.json(success(created, "Order created"), StatusCodes.CREATED);
  })
  .get("/:id", idParamSchema, async (c) => {
    const user = c.get("jwtPayload") as JWTPayload;
    const { id } = c.req.valid("param");

    await assertOrderAccess(user, id);

    const detail = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.id, id),
      with: {
        campaign: true,
        customer: true,
        paymentMethod: true,
        products: {
          with: {
            product: true,
          },
        },
        refunds: {
          with: {
            items: true,
            refundedBy: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [asc(orderRefundsTable.id)],
        },
        services: {
          with: {
            handler: {
              columns: {
                id: true,
                name: true,
              },
            },
            handlerLogs: {
              with: {
                changedBy: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
                fromHandler: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
                toHandler: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [asc(orderServiceHandlerLogsTable.id)],
            },
            images: {
              orderBy: [asc(orderServicesImagesTable.id)],
            },
            refundItems: true,
            service: true,
            statusLogs: {
              with: {
                changedBy: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [asc(orderServiceStatusLogsTable.id)],
            },
          },
          orderBy: [asc(ordersServicesTable.id)],
        },
        store: true,
      },
    });

    if (!detail) {
      return c.json(failure("Order not found"), StatusCodes.NOT_FOUND);
    }

    return c.json(success(detail, "Order detail retrieved successfully"));
  })
  .patch(
    "/:id/payment",
    idParamSchema,
    zodValidator("json", PATCHOrderPaymentSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      assertCanProcessPaymentOrRefund(user);
      await assertOrderAccess(user, id);

      const order = await db.query.ordersTable.findFirst({
        where: eq(ordersTable.id, id),
        columns: {
          id: true,
          total: true,
          discount: true,
          refunded_amount: true,
        },
      });

      if (!order) {
        return c.json(failure("Order not found"), StatusCodes.NOT_FOUND);
      }

      const netDue =
        Number(order.total ?? 0) -
        Number(order.discount) -
        Number(order.refunded_amount);

      const rows = await db
        .update(ordersTable)
        .set({
          payment_method_id: body.payment_method_id,
          payment_status: "paid",
          paid_amount: Math.max(netDue, 0).toString(),
          paid_at: new Date(),
          updated_by: user.id,
        })
        .where(eq(ordersTable.id, id))
        .returning({
          id: ordersTable.id,
          payment_status: ordersTable.payment_status,
          paid_amount: ordersTable.paid_amount,
        });

      return c.json(success(rows[0], "Payment updated successfully"));
    }
  )
  .post(
    "/:id/services/:serviceId/claim",
    orderServiceParamSchema,
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id, serviceId } = c.req.valid("param");

      await assertOrderAccess(user, id);

      const orderService = await getOrderServiceOrThrow(id, serviceId);

      await db.transaction(async (tx) => {
        await tx
          .update(ordersServicesTable)
          .set({
            handler_id: user.id,
          })
          .where(eq(ordersServicesTable.id, serviceId));

        await tx.insert(orderServiceHandlerLogsTable).values({
          order_service_id: serviceId,
          from_handler_id: orderService.handler_id,
          to_handler_id: user.id,
          changed_by: user.id,
          note: "Claimed by handler",
        });
      });

      return c.json(
        success(
          { order_service_id: serviceId, handler_id: user.id },
          "Order service claimed"
        )
      );
    }
  )
  .patch(
    "/:id/services/:serviceId/handler",
    orderServiceParamSchema,
    zodValidator("json", PATCHOrderServiceHandlerSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id, serviceId } = c.req.valid("param");
      const body = c.req.valid("json");

      assertIsAdmin(user);
      await assertOrderAccess(user, id);

      const orderService = await getOrderServiceOrThrow(id, serviceId);

      await db.transaction(async (tx) => {
        await tx
          .update(ordersServicesTable)
          .set({
            handler_id: body.handler_id,
          })
          .where(eq(ordersServicesTable.id, serviceId));

        await tx.insert(orderServiceHandlerLogsTable).values({
          order_service_id: serviceId,
          from_handler_id: orderService.handler_id,
          to_handler_id: body.handler_id,
          changed_by: user.id,
          note: body.note,
        });
      });

      return c.json(
        success(
          {
            order_service_id: serviceId,
            handler_id: body.handler_id,
          },
          "Order service handler updated"
        )
      );
    }
  )
  .patch(
    "/:id/services/:serviceId/status",
    orderServiceParamSchema,
    zodValidator("json", PATCHOrderServiceStatusSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id, serviceId } = c.req.valid("param");
      const body = c.req.valid("json");

      await assertOrderAccess(user, id);

      const orderService = await getOrderServiceOrThrow(id, serviceId);

      const allowedStatuses = statusTransitions[orderService.status];
      if (!allowedStatuses.includes(body.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${orderService.status} to ${body.status}`
        );
      }

      if (orderService.status === "received" && body.status !== "received") {
        const hasDropoffPhoto =
          await db.query.orderServicesImagesTable.findFirst({
            where: and(
              eq(orderServicesImagesTable.order_service_id, serviceId),
              eq(orderServicesImagesTable.photo_type, "dropoff")
            ),
            columns: { id: true },
          });

        if (!hasDropoffPhoto) {
          throw new BadRequestException(
            "At least one dropoff photo is required before processing"
          );
        }
      }

      if (body.status === "picked_up") {
        const hasPickupPhoto =
          await db.query.orderServicesImagesTable.findFirst({
            where: and(
              eq(orderServicesImagesTable.order_service_id, serviceId),
              eq(orderServicesImagesTable.photo_type, "pickup")
            ),
            columns: { id: true },
          });

        if (!hasPickupPhoto) {
          throw new BadRequestException(
            "At least one pickup photo is required before marking picked up"
          );
        }
      }

      await db.transaction(async (tx) => {
        await tx
          .update(ordersServicesTable)
          .set({
            status: body.status,
          })
          .where(eq(ordersServicesTable.id, serviceId));

        await tx.insert(orderServiceStatusLogsTable).values({
          order_service_id: serviceId,
          from_status: orderService.status,
          to_status: body.status,
          changed_by: user.id,
          note: body.note,
        });
      });

      await recalculateOrderStatus(id, user.id);

      return c.json(
        success(
          {
            from_status: orderService.status,
            order_service_id: serviceId,
            to_status: body.status,
          },
          "Order service status updated"
        )
      );
    }
  )
  .post(
    "/:id/services/:serviceId/photos/presign",
    orderServiceParamSchema,
    zodValidator("json", POSTOrderServicePhotoPresignSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id, serviceId } = c.req.valid("param");
      const body = c.req.valid("json");

      await assertOrderAccess(user, id);
      await getOrderServiceOrThrow(id, serviceId);

      const key = `orders/${id}/services/${serviceId}/${body.photo_type}/${crypto.randomUUID()}`;
      const signed = await createPresignedUploadUrl({
        contentType: body.content_type,
        key,
      });

      return c.json(success(signed, "Upload URL generated successfully"));
    }
  )
  .post(
    "/:id/services/:serviceId/photos",
    orderServiceParamSchema,
    zodValidator("json", POSTOrderServicePhotoSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id, serviceId } = c.req.valid("param");
      const body = c.req.valid("json");

      await assertOrderAccess(user, id);
      await getOrderServiceOrThrow(id, serviceId);

      const [photo] = await db
        .insert(orderServicesImagesTable)
        .values({
          order_service_id: serviceId,
          photo_type: body.photo_type,
          s3_key: body.s3_key,
          image_url: buildS3ObjectUrl(body.s3_key),
          uploaded_by: user.id,
        })
        .returning();

      return c.json(success(photo, "Photo saved"), StatusCodes.CREATED);
    }
  )
  .post(
    "/:id/refunds",
    idParamSchema,
    zodValidator("json", POSTOrderRefundSchema),
    async (c) => {
      const user = c.get("jwtPayload") as JWTPayload;
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      assertCanProcessPaymentOrRefund(user);
      await assertOrderAccess(user, id);

      const uniqueServiceIds = [
        ...new Set(body.items.map((item) => item.order_service_id)),
      ];
      if (uniqueServiceIds.length !== body.items.length) {
        throw new BadRequestException(
          "Duplicate order_service_id entries are not allowed"
        );
      }

      const order = await db.query.ordersTable.findFirst({
        where: eq(ordersTable.id, id),
        columns: {
          id: true,
          payment_status: true,
          paid_amount: true,
          refunded_amount: true,
        },
      });
      if (!order) {
        throw new BadRequestException("Order not found");
      }
      if (order.payment_status !== "paid") {
        throw new BadRequestException(
          "Refund can only be processed for paid orders"
        );
      }

      const services = await db.query.ordersServicesTable.findMany({
        where: and(
          eq(ordersServicesTable.order_id, id),
          inArray(ordersServicesTable.id, uniqueServiceIds)
        ),
        columns: {
          id: true,
          status: true,
        },
      });

      if (services.length !== uniqueServiceIds.length) {
        throw new BadRequestException(
          "One or more order_service_id is invalid"
        );
      }

      for (const service of services) {
        if (["picked_up", "refunded", "cancelled"].includes(service.status)) {
          throw new BadRequestException(
            `Service ${service.id} cannot be refunded from status ${service.status}`
          );
        }
      }

      const refundCaps = await getOrderLineRefundCaps(id);
      const capsByServiceId = new Map(
        refundCaps.map((item) => [item.order_service_id, item.maxRefundable])
      );

      const refundItems = body.items.map((item) => {
        const maxRefundable = capsByServiceId.get(item.order_service_id) ?? 0;
        if (maxRefundable <= 0) {
          throw new BadRequestException(
            `Order service ${item.order_service_id} has no refundable amount remaining`
          );
        }

        return {
          ...item,
          amount: Number(maxRefundable.toFixed(2)),
        };
      });

      const totalRefundAmount = refundItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      const refundablePaidAmount =
        Number(order.paid_amount) - Number(order.refunded_amount);
      if (totalRefundAmount > refundablePaidAmount) {
        throw new BadRequestException(
          "Refund exceeds remaining paid amount for this order"
        );
      }

      const [refund] = await db.transaction(async (tx) => {
        await tx
          .update(ordersTable)
          .set({
            refunded_amount: sql`${ordersTable.refunded_amount} + ${totalRefundAmount}`,
            updated_by: user.id,
          })
          .where(eq(ordersTable.id, id));

        const [createdRefund] = await tx
          .insert(orderRefundsTable)
          .values({
            order_id: id,
            refunded_by: user.id,
            total_amount: totalRefundAmount.toString(),
            note: body.note,
          })
          .returning();

        await tx.insert(orderRefundItemsTable).values(
          refundItems.map((item) => ({
            order_refund_id: createdRefund.id,
            order_service_id: item.order_service_id,
            amount: item.amount.toString(),
            reason: item.reason,
            note: item.note,
          }))
        );

        await tx
          .update(ordersServicesTable)
          .set({ status: "refunded" })
          .where(
            inArray(
              ordersServicesTable.id,
              refundItems.map((item) => item.order_service_id)
            )
          );

        await tx.insert(orderServiceStatusLogsTable).values(
          refundItems.map((item) => ({
            order_service_id: item.order_service_id,
            from_status: services.find(
              (service) => service.id === item.order_service_id
            )?.status,
            to_status: "refunded" as const,
            changed_by: user.id,
            note: item.note,
          }))
        );

        return [createdRefund] as const;
      });

      await recalculateOrderStatus(id, user.id);

      return c.json(
        success(
          {
            refund,
            total_refund_amount: totalRefundAmount,
          },
          "Order refund processed"
        ),
        StatusCodes.CREATED
      );
    }
  );

export default app;
