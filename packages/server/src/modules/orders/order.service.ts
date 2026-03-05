import dayjs from "dayjs";
import type z from "zod";
import { db } from "@/db";
import { BadRequestException, NotFoundException } from "@/errors";
import {
  findOrders,
  insertOrder,
  insertOrderProducts,
  insertOrderServices,
  reserveNextOrderNumber,
  updateOrderTotal,
} from "@/modules/orders/order.repository";
import {
  type GetOrdersQuery,
  normalizeOrderListQuery,
} from "@/modules/orders/order.schema";
import { findProducts } from "@/modules/products/product.repository";
import { findServices } from "@/modules/services/service.repository";
import type { POSTOrderSchema } from "@/schema";
import type { Store, User } from "@/types/entity";
import { buildPaginationMeta } from "@/utils/pagination";

function formatOrderCode(storeCode: string, dateStr: string, sequence: number) {
  return `#${storeCode}/${dateStr}/${sequence}`;
}

export async function listOrders(query?: GetOrdersQuery) {
  const normalized = normalizeOrderListQuery(query);
  const { items, total } = await findOrders(normalized);

  return {
    items,
    meta: buildPaginationMeta(total, normalized),
  };
}

export async function createOrder(
  user: User,
  store: Store,
  payload: z.infer<typeof POSTOrderSchema>
) {
  const {
    products = [],
    services = [],
    customer_name: _customerName,
    customer_phone: _customerPhone,
    ...orderPayload
  } = payload;

  const productIds = [...new Set(products.map((item) => item.id))];
  const serviceIds = [...new Set(services.map((item) => item.id))];

  const [dbProducts, dbServices] = await Promise.all([
    productIds.length > 0 ? findProducts(productIds) : Promise.resolve([]),
    serviceIds.length > 0 ? findServices(serviceIds) : Promise.resolve([]),
  ]);

  const productMap = new Map(
    dbProducts.map((product) => [product.id, product])
  );
  const serviceMap = new Map(
    dbServices.map((service) => [service.id, service])
  );

  const missingProducts = productIds.filter((id) => !productMap.has(id));
  if (missingProducts.length > 0) {
    throw new NotFoundException(
      `Product not found: ${missingProducts.join(", ")}`
    );
  }

  const missingServices = serviceIds.filter((id) => !serviceMap.has(id));
  if (missingServices.length > 0) {
    throw new NotFoundException(
      `Service not found: ${missingServices.join(", ")}`
    );
  }

  return db.transaction(async (tx) => {
    const dateStr = dayjs().format("DDMMYYYY");
    const sequence = await reserveNextOrderNumber(tx, store.code, dateStr);
    const code = formatOrderCode(store.code, dateStr, sequence);

    const orderId = await insertOrder(tx, {
      code,
      customer_id: orderPayload.customer_id,
      payment_method_id: orderPayload.payment_method_id,
      payment_status: orderPayload.payment_status,
      discount: orderPayload.discount,
      total: orderPayload.discount,
      notes: orderPayload.notes,
      store_id: store.id,
      created_by: user.id,
      updated_by: user.id,
    });

    const [serviceSubtotal, productSubtotal] = await Promise.all([
      insertOrderServices(
        tx,
        services.map((item) => {
          const service = serviceMap.get(item.id);
          if (!service) {
            throw new NotFoundException(`Service not found: ${item.id}`);
          }

          return {
            order_id: orderId,
            service_id: service.id,
            price: service.price,
            qty: item.qty,
            notes: item.notes,
          };
        })
      ),
      insertOrderProducts(
        tx,
        products.map((item) => {
          const product = productMap.get(item.id);
          if (!product) {
            throw new NotFoundException(`Product not found: ${item.id}`);
          }

          return {
            order_id: orderId,
            product_id: product.id,
            price: product.price,
            qty: item.qty,
            notes: item.notes,
          };
        })
      ),
    ]);

    const total = serviceSubtotal + productSubtotal;
    if (Number(orderPayload.discount) > total) {
      throw new BadRequestException("Order discount cannot exceed order total");
    }

    await updateOrderTotal(tx, orderId, total);

    return {
      code,
      id: orderId,
      total,
    };
  });
}
