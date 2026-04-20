import { and, count, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignsTable,
  categoriesTable,
  customersTable,
  orderCampaignsTable,
  orderPickupEventsTable,
  orderRefundItemsTable,
  orderRefundsTable,
  orderServiceStatusLogsTable,
  ordersProductsTable,
  ordersServicesTable,
  ordersTable,
  paymentMethodsTable,
  servicesTable,
  shiftsTable,
  usersTable,
} from "@/db/schema";
import {
  type DateRange,
  type Granularity,
  jakartaBucketExpr,
} from "@/modules/reports/report-range.util";

interface BaseRangeArgs {
  range: DateRange;
  storeId?: number;
  granularity: Granularity;
}

// ───────────────────────── Revenue trend (R1) ─────────────────────────

export async function servicesRevenueSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(ordersTable.paid_at, granularity);
  const conditions = [
    gte(ordersTable.paid_at, range.start),
    lt(ordersTable.paid_at, range.end),
    isNotNull(ordersTable.paid_at),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      revenue: sql<string>`COALESCE(SUM(${ordersServicesTable.subtotal}), 0)`,
    })
    .from(ordersServicesTable)
    .innerJoin(ordersTable, eq(ordersServicesTable.order_id, ordersTable.id))
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    revenue: Number(row.revenue),
  }));
}

export async function productsRevenueSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(ordersTable.paid_at, granularity);
  const conditions = [
    gte(ordersTable.paid_at, range.start),
    lt(ordersTable.paid_at, range.end),
    isNotNull(ordersTable.paid_at),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      revenue: sql<string>`COALESCE(SUM(${ordersProductsTable.subtotal}), 0)`,
    })
    .from(ordersProductsTable)
    .innerJoin(ordersTable, eq(ordersProductsTable.order_id, ordersTable.id))
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    revenue: Number(row.revenue),
  }));
}

// ───────────────────────── Category trend (R6) ─────────────────────────

export async function categoryRevenueSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(ordersTable.paid_at, granularity);
  const conditions = [
    gte(ordersTable.paid_at, range.start),
    lt(ordersTable.paid_at, range.end),
    isNotNull(ordersTable.paid_at),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      category_id: categoriesTable.id,
      category_name: categoriesTable.name,
      revenue: sql<string>`COALESCE(SUM(${ordersServicesTable.subtotal}), 0)`,
    })
    .from(ordersServicesTable)
    .innerJoin(ordersTable, eq(ordersServicesTable.order_id, ordersTable.id))
    .innerJoin(
      servicesTable,
      eq(ordersServicesTable.service_id, servicesTable.id)
    )
    .innerJoin(
      categoriesTable,
      eq(servicesTable.category_id, categoriesTable.id)
    )
    .where(and(...conditions))
    .groupBy(bucket, categoriesTable.id, categoriesTable.name);

  return rows.map((row) => ({
    bucket: row.bucket,
    category_id: row.category_id,
    category_name: row.category_name,
    revenue: Number(row.revenue),
  }));
}

// ───────────────────────── Orders flow (R2) ─────────────────────────

export async function ordersInSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(ordersTable.created_at, granularity);
  const conditions = [
    gte(ordersTable.created_at, range.start),
    lt(ordersTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      orders_in: sql<number>`COUNT(*)::int`,
    })
    .from(ordersTable)
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    orders_in: Number(row.orders_in),
  }));
}

export async function ordersOutSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(
    orderPickupEventsTable.picked_up_at,
    granularity
  );
  const conditions = [
    gte(orderPickupEventsTable.picked_up_at, range.start),
    lt(orderPickupEventsTable.picked_up_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      orders_out: sql<number>`COUNT(DISTINCT ${orderPickupEventsTable.order_id})::int`,
    })
    .from(orderPickupEventsTable)
    .innerJoin(ordersTable, eq(orderPickupEventsTable.order_id, ordersTable.id))
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    orders_out: Number(row.orders_out),
  }));
}

// ───────────────────────── Payment mix (R3) ─────────────────────────

export async function paymentMixSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(ordersTable.paid_at, granularity);
  const conditions = [
    gte(ordersTable.paid_at, range.start),
    lt(ordersTable.paid_at, range.end),
    isNotNull(ordersTable.paid_at),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      payment_method_id: ordersTable.payment_method_id,
      payment_method_name: paymentMethodsTable.name,
      revenue: sql<string>`COALESCE(SUM(${ordersTable.paid_amount}), 0)`,
      orders: sql<number>`COUNT(*)::int`,
    })
    .from(ordersTable)
    .leftJoin(
      paymentMethodsTable,
      eq(ordersTable.payment_method_id, paymentMethodsTable.id)
    )
    .where(and(...conditions))
    .groupBy(bucket, ordersTable.payment_method_id, paymentMethodsTable.name);

  return rows.map((row) => ({
    bucket: row.bucket,
    payment_method_id: row.payment_method_id ?? 0,
    payment_method_name: row.payment_method_name ?? "Unknown",
    revenue: Number(row.revenue),
    orders: Number(row.orders),
  }));
}

// ───────────────────────── Customer acquisition (R4) ─────────────────────────

export async function newCustomersSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(customersTable.created_at, granularity);
  const conditions = [
    gte(customersTable.created_at, range.start),
    lt(customersTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(customersTable.origin_store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      new_customers: sql<number>`COUNT(*)::int`,
    })
    .from(customersTable)
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    new_customers: Number(row.new_customers),
  }));
}

export async function cumulativeCustomersBefore({
  before,
  storeId,
}: {
  before: Date;
  storeId?: number;
}) {
  const conditions = [lt(customersTable.created_at, before)];
  if (storeId !== undefined) {
    conditions.push(eq(customersTable.origin_store_id, storeId));
  }

  const [row] = await db
    .select({ total: count() })
    .from(customersTable)
    .where(and(...conditions));

  return Number(row?.total ?? 0);
}

export async function repeatCustomersInRange({
  range,
  storeId,
}: {
  range: DateRange;
  storeId?: number;
}) {
  const conditions = [
    gte(ordersTable.created_at, range.start),
    lt(ordersTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const [row] = await db
    .select({
      total_customers: sql<number>`COUNT(*)::int`,
      repeat_customers: sql<number>`COUNT(*) FILTER (WHERE order_count > 1)::int`,
    })
    .from(
      db
        .select({
          customer_id: ordersTable.customer_id,
          order_count: sql<number>`COUNT(*)`.as("order_count"),
        })
        .from(ordersTable)
        .where(and(...conditions))
        .groupBy(ordersTable.customer_id)
        .as("customer_orders")
    );

  return {
    total_customers: Number(row?.total_customers ?? 0),
    repeat_customers: Number(row?.repeat_customers ?? 0),
  };
}

// ───────────────────────── Refund trend (R5) ─────────────────────────

export async function refundAmountSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(orderRefundsTable.created_at, granularity);
  const conditions = [
    gte(orderRefundsTable.created_at, range.start),
    lt(orderRefundsTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      amount: sql<string>`COALESCE(SUM(${orderRefundsTable.total_amount}), 0)`,
      refunds: sql<number>`COUNT(DISTINCT ${orderRefundsTable.id})::int`,
    })
    .from(orderRefundsTable)
    .innerJoin(ordersTable, eq(orderRefundsTable.order_id, ordersTable.id))
    .where(and(...conditions))
    .groupBy(bucket);

  return rows.map((row) => ({
    bucket: row.bucket,
    amount: Number(row.amount),
    refunds: Number(row.refunds),
  }));
}

export async function refundReasonSeries({
  range,
  storeId,
  granularity,
}: BaseRangeArgs) {
  const bucket = jakartaBucketExpr(orderRefundsTable.created_at, granularity);
  const conditions = [
    gte(orderRefundsTable.created_at, range.start),
    lt(orderRefundsTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  const rows = await db
    .select({
      bucket,
      reason: orderRefundItemsTable.reason,
      amount: sql<string>`COALESCE(SUM(${orderRefundItemsTable.amount}), 0)`,
      items: sql<number>`COUNT(*)::int`,
    })
    .from(orderRefundItemsTable)
    .innerJoin(
      orderRefundsTable,
      eq(orderRefundItemsTable.order_refund_id, orderRefundsTable.id)
    )
    .innerJoin(ordersTable, eq(orderRefundsTable.order_id, ordersTable.id))
    .where(and(...conditions))
    .groupBy(bucket, orderRefundItemsTable.reason);

  return rows.map((row) => ({
    bucket: row.bucket,
    reason: row.reason,
    amount: Number(row.amount),
    items: Number(row.items),
  }));
}

// ───────────────────────── Worker productivity (R7) ─────────────────────────

export async function workerProductivityRows({
  range,
  storeId,
}: {
  range: DateRange;
  storeId?: number;
}) {
  const completionConditions = [
    eq(orderServiceStatusLogsTable.to_status, "ready_for_pickup"),
    gte(orderServiceStatusLogsTable.created_at, range.start),
    lt(orderServiceStatusLogsTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    completionConditions.push(eq(ordersTable.store_id, storeId));
  }

  const completedRows = await db
    .select({
      handler_id: ordersServicesTable.handler_id,
      completed: sql<number>`COUNT(DISTINCT ${orderServiceStatusLogsTable.order_service_id})::int`,
    })
    .from(orderServiceStatusLogsTable)
    .innerJoin(
      ordersServicesTable,
      eq(orderServiceStatusLogsTable.order_service_id, ordersServicesTable.id)
    )
    .innerJoin(ordersTable, eq(ordersServicesTable.order_id, ordersTable.id))
    .where(and(...completionConditions))
    .groupBy(ordersServicesTable.handler_id);

  const refundConditions = [
    gte(orderRefundsTable.created_at, range.start),
    lt(orderRefundsTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    refundConditions.push(eq(ordersTable.store_id, storeId));
  }

  const refundRows = await db
    .select({
      handler_id: ordersServicesTable.handler_id,
      refunds: sql<number>`COUNT(DISTINCT ${orderRefundItemsTable.id})::int`,
    })
    .from(orderRefundItemsTable)
    .innerJoin(
      ordersServicesTable,
      eq(orderRefundItemsTable.order_service_id, ordersServicesTable.id)
    )
    .innerJoin(
      orderRefundsTable,
      eq(orderRefundItemsTable.order_refund_id, orderRefundsTable.id)
    )
    .innerJoin(ordersTable, eq(orderRefundsTable.order_id, ordersTable.id))
    .where(and(...refundConditions))
    .groupBy(ordersServicesTable.handler_id);

  const shiftConditions = [
    isNotNull(shiftsTable.clock_out_at),
    gte(shiftsTable.clock_in_at, range.start),
    lt(shiftsTable.clock_in_at, range.end),
  ];
  if (storeId !== undefined) {
    shiftConditions.push(eq(shiftsTable.store_id, storeId));
  }

  const shiftRows = await db
    .select({
      user_id: shiftsTable.user_id,
      minutes: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${shiftsTable.clock_out_at} - ${shiftsTable.clock_in_at})) / 60), 0)::int`,
    })
    .from(shiftsTable)
    .where(and(...shiftConditions))
    .groupBy(shiftsTable.user_id);

  const workers = await db
    .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.role, "worker"));

  const completedMap = new Map<number, number>();
  for (const row of completedRows) {
    if (row.handler_id !== null) {
      completedMap.set(row.handler_id, Number(row.completed));
    }
  }

  const refundMap = new Map<number, number>();
  for (const row of refundRows) {
    if (row.handler_id !== null) {
      refundMap.set(row.handler_id, Number(row.refunds));
    }
  }

  const minutesMap = new Map<number, number>();
  for (const row of shiftRows) {
    minutesMap.set(row.user_id, Number(row.minutes));
  }

  return workers
    .map((worker) => {
      const completed = completedMap.get(worker.id) ?? 0;
      const refunds = refundMap.get(worker.id) ?? 0;
      const minutes = minutesMap.get(worker.id) ?? 0;
      const hours = minutes / 60;
      const itemsPerHour = hours > 0 ? completed / hours : 0;
      return {
        user_id: worker.id,
        user_name: worker.name,
        items_completed: completed,
        refund_items: refunds,
        shift_minutes: minutes,
        items_per_hour: Number(itemsPerHour.toFixed(2)),
      };
    })
    .sort((a, b) => b.items_completed - a.items_completed);
}

// ───────────────────────── Campaign effectiveness (R8) ─────────────────────────

export async function campaignEffectivenessRows({
  range,
  storeId,
}: {
  range: DateRange;
  storeId?: number;
}) {
  const conditions = [
    gte(ordersTable.created_at, range.start),
    lt(ordersTable.created_at, range.end),
  ];
  if (storeId !== undefined) {
    conditions.push(eq(ordersTable.store_id, storeId));
  }

  // Discount cost is one row per (campaign, order) — safe to sum on the join.
  const discountRows = await db
    .select({
      campaign_id: campaignsTable.id,
      campaign_name: campaignsTable.name,
      campaign_code: campaignsTable.code,
      discount_cost: sql<string>`COALESCE(SUM(${orderCampaignsTable.applied_amount}), 0)`,
    })
    .from(orderCampaignsTable)
    .innerJoin(ordersTable, eq(orderCampaignsTable.order_id, ordersTable.id))
    .innerJoin(
      campaignsTable,
      eq(orderCampaignsTable.campaign_id, campaignsTable.id)
    )
    .where(and(...conditions))
    .groupBy(campaignsTable.id, campaignsTable.name, campaignsTable.code);

  // Order metrics must deduplicate orders-with-multiple-campaigns.
  // One row per (campaign, order) guaranteed by order_campaigns_order_campaign_uidx.
  const orderRows = await db
    .selectDistinct({
      campaign_id: orderCampaignsTable.campaign_id,
      order_id: ordersTable.id,
      paid_amount: ordersTable.paid_amount,
      total: ordersTable.total,
    })
    .from(orderCampaignsTable)
    .innerJoin(ordersTable, eq(orderCampaignsTable.order_id, ordersTable.id))
    .where(and(...conditions));

  const orderMetrics = new Map<
    number,
    { orders: number; revenue: number; totalSum: number }
  >();
  for (const row of orderRows) {
    const entry = orderMetrics.get(row.campaign_id) ?? {
      orders: 0,
      revenue: 0,
      totalSum: 0,
    };
    entry.orders += 1;
    entry.revenue += Number(row.paid_amount);
    entry.totalSum += Number(row.total ?? 0);
    orderMetrics.set(row.campaign_id, entry);
  }

  return discountRows
    .map((row) => {
      const metrics = orderMetrics.get(row.campaign_id) ?? {
        orders: 0,
        revenue: 0,
        totalSum: 0,
      };
      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        campaign_code: row.campaign_code,
        orders: metrics.orders,
        revenue: metrics.revenue,
        discount_cost: Number(row.discount_cost),
        avg_order_value:
          metrics.orders > 0 ? metrics.totalSum / metrics.orders : 0,
      };
    })
    .sort((a, b) => b.orders - a.orders);
}
