import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { db } from "@/db";
import { ordersTable } from "@/db/schema";
import { failure, success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const GETPublicTrackOrderQuerySchema = z.object({
  code: z.string().trim().min(1).max(32),
});

function maskPhoneNumber(phone: string) {
  const suffix = phone.slice(-4);
  return `******${suffix}`;
}

const app = new Hono().get(
  "/track",
  zodValidator("query", GETPublicTrackOrderQuerySchema),
  async (c) => {
    const { code } = c.req.valid("query");

    const order = await db.query.ordersTable.findFirst({
      where: eq(ordersTable.code, code),
      columns: {
        id: true,
        code: true,
        status: true,
        payment_status: true,
        discount: true,
        total: true,
        notes: true,
        created_at: true,
        completed_at: true,
        cancelled_at: true,
        updated_at: true,
      },
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            phone_number: true,
          },
        },
        paymentMethod: {
          columns: {
            id: true,
            code: true,
            name: true,
          },
        },
        products: {
          columns: {
            id: true,
            order_id: true,
            product_id: true,
            price: true,
            qty: true,
            discount: true,
            subtotal: true,
            notes: true,
          },
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                sku: true,
                uom: true,
              },
            },
          },
        },
        services: {
          columns: {
            id: true,
            order_id: true,
            service_id: true,
            handler_id: true,
            price: true,
            qty: true,
            discount: true,
            subtotal: true,
            notes: true,
          },
          with: {
            images: {
              columns: {
                id: true,
                image_url: true,
                created_at: true,
              },
            },
            service: {
              columns: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        store: {
          columns: {
            id: true,
            code: true,
            name: true,
            address: true,
            phone_number: true,
          },
        },
      },
    });

    if (!order) {
      return c.json(failure("Order not found"), StatusCodes.NOT_FOUND);
    }

    return c.json(
      success(
        {
          ...order,
          customer: {
            id: order.customer.id,
            name: order.customer.name,
            phone_number_masked: maskPhoneNumber(order.customer.phone_number),
          },
        },
        "Order status retrieved successfully"
      )
    );
  }
);

export default app;
