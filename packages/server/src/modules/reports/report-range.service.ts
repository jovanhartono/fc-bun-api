import type { GetReportRangeQuery } from "@/modules/reports/report.schema";
import {
  campaignEffectivenessRows,
  categoryRevenueSeries,
  cumulativeCustomersBefore,
  newCustomersSeries,
  ordersInSeries,
  ordersOutSeries,
  paymentMixSeries,
  productsRevenueSeries,
  refundAmountSeries,
  refundReasonSeries,
  repeatCustomersInRange,
  servicesRevenueSeries,
  workerProductivityRows,
} from "@/modules/reports/report-range.repository";
import {
  enumerateBuckets,
  type Granularity,
  getJakartaRange,
  pickGranularity,
} from "@/modules/reports/report-range.util";

interface ReportContext {
  from: string;
  to: string;
  store_id: number | null;
  granularity: Granularity;
  buckets: string[];
}

function buildContext(query: GetReportRangeQuery): ReportContext {
  const granularity =
    query.granularity ?? pickGranularity(query.from, query.to);
  const buckets = enumerateBuckets(query.from, query.to, granularity);
  return {
    from: query.from,
    to: query.to,
    store_id: query.store_id ?? null,
    granularity,
    buckets,
  };
}

function indexBy<T extends { bucket: string }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.bucket, row);
  }
  return map;
}

// ───────────────────────── Revenue trend ─────────────────────────

export async function getRevenueTrendReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const [services, products, categories] = await Promise.all([
    servicesRevenueSeries({ range, storeId, granularity: ctx.granularity }),
    productsRevenueSeries({ range, storeId, granularity: ctx.granularity }),
    categoryRevenueSeries({ range, storeId, granularity: ctx.granularity }),
  ]);

  const servicesMap = indexBy(services);
  const productsMap = indexBy(products);

  const series = ctx.buckets.map((bucket) => ({
    bucket,
    services: servicesMap.get(bucket)?.revenue ?? 0,
    products: productsMap.get(bucket)?.revenue ?? 0,
  }));

  const categoryTotals = new Map<
    number,
    { category_id: number; category_name: string; revenue: number }
  >();
  for (const row of categories) {
    const current = categoryTotals.get(row.category_id);
    if (current) {
      current.revenue += row.revenue;
    } else {
      categoryTotals.set(row.category_id, {
        category_id: row.category_id,
        category_name: row.category_name,
        revenue: row.revenue,
      });
    }
  }
  const topCategories = Array.from(categoryTotals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topCategoryIds = new Set(topCategories.map((c) => c.category_id));

  const categorySeriesMap = new Map<string, Record<string, number>>();
  for (const row of categories) {
    const bucketRow =
      categorySeriesMap.get(row.bucket) ?? ({} as Record<string, number>);
    const key = topCategoryIds.has(row.category_id)
      ? `cat_${row.category_id}`
      : "cat_other";
    bucketRow[key] = (bucketRow[key] ?? 0) + row.revenue;
    categorySeriesMap.set(row.bucket, bucketRow);
  }

  const hasOther = categoryTotals.size > topCategories.length;
  const categoryKeys = [
    ...topCategories.map((c) => ({
      key: `cat_${c.category_id}`,
      label: c.category_name,
    })),
    ...(hasOther ? [{ key: "cat_other", label: "Other" }] : []),
  ];

  const categorySeries = ctx.buckets.map((bucket) => {
    const row = categorySeriesMap.get(bucket) ?? {};
    const filled: Record<string, number | string> = { bucket };
    for (const { key } of categoryKeys) {
      filled[key] = row[key] ?? 0;
    }
    return filled;
  });

  const servicesTotal = series.reduce((sum, row) => sum + row.services, 0);
  const productsTotal = series.reduce((sum, row) => sum + row.products, 0);

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    series,
    category_series: categorySeries,
    category_keys: categoryKeys,
    summary: {
      services_total: servicesTotal,
      products_total: productsTotal,
      grand_total: servicesTotal + productsTotal,
    },
  };
}

// ───────────────────────── Orders flow ─────────────────────────

export async function getOrdersFlowReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const [ordersIn, ordersOut] = await Promise.all([
    ordersInSeries({ range, storeId, granularity: ctx.granularity }),
    ordersOutSeries({ range, storeId, granularity: ctx.granularity }),
  ]);

  const inMap = indexBy(ordersIn);
  const outMap = indexBy(ordersOut);

  const series = ctx.buckets.map((bucket) => ({
    bucket,
    orders_in: inMap.get(bucket)?.orders_in ?? 0,
    orders_out: outMap.get(bucket)?.orders_out ?? 0,
  }));

  const inTotal = series.reduce((sum, row) => sum + row.orders_in, 0);
  const outTotal = series.reduce((sum, row) => sum + row.orders_out, 0);
  const netFlow = inTotal - outTotal;

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    series,
    summary: {
      orders_in_total: inTotal,
      orders_out_total: outTotal,
      net_flow: netFlow,
    },
  };
}

// ───────────────────────── Payment mix ─────────────────────────

export async function getPaymentMixReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const rows = await paymentMixSeries({
    range,
    storeId,
    granularity: ctx.granularity,
  });

  const methodTotals = new Map<
    number,
    {
      payment_method_id: number;
      payment_method_name: string;
      revenue: number;
      orders: number;
    }
  >();
  for (const row of rows) {
    const current = methodTotals.get(row.payment_method_id);
    if (current) {
      current.revenue += row.revenue;
      current.orders += row.orders;
    } else {
      methodTotals.set(row.payment_method_id, {
        payment_method_id: row.payment_method_id,
        payment_method_name: row.payment_method_name,
        revenue: row.revenue,
        orders: row.orders,
      });
    }
  }

  const methods = Array.from(methodTotals.values()).sort(
    (a, b) => b.revenue - a.revenue
  );
  const methodKeys = methods.map((m) => ({
    key: `pm_${m.payment_method_id}`,
    label: m.payment_method_name,
  }));

  const bucketMap = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const bucketRow =
      bucketMap.get(row.bucket) ?? ({} as Record<string, number>);
    const key = `pm_${row.payment_method_id}`;
    bucketRow[key] = (bucketRow[key] ?? 0) + row.revenue;
    bucketMap.set(row.bucket, bucketRow);
  }

  const series = ctx.buckets.map((bucket) => {
    const row = bucketMap.get(bucket) ?? {};
    const filled: Record<string, number | string> = { bucket };
    for (const { key } of methodKeys) {
      filled[key] = row[key] ?? 0;
    }
    return filled;
  });

  const grandTotal = methods.reduce((sum, m) => sum + m.revenue, 0);
  const summary = {
    grand_total: grandTotal,
    total_orders: methods.reduce((sum, m) => sum + m.orders, 0),
    methods: methods.map((m) => ({
      ...m,
      share: grandTotal > 0 ? m.revenue / grandTotal : 0,
    })),
  };

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    series,
    method_keys: methodKeys,
    summary,
  };
}

// ───────────────────────── Customer acquisition ─────────────────────────

export async function getCustomerAcquisitionReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const [newCustomers, priorTotal, repeat] = await Promise.all([
    newCustomersSeries({ range, storeId, granularity: ctx.granularity }),
    cumulativeCustomersBefore({ before: range.start, storeId }),
    repeatCustomersInRange({ range, storeId }),
  ]);

  const newMap = indexBy(newCustomers);
  let running = priorTotal;
  const series = ctx.buckets.map((bucket) => {
    const added = newMap.get(bucket)?.new_customers ?? 0;
    running += added;
    return { bucket, new_customers: added, cumulative: running };
  });

  const addedInRange = series.reduce((sum, row) => sum + row.new_customers, 0);

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    series,
    summary: {
      new_customers: addedInRange,
      cumulative_end: running,
      cumulative_start: priorTotal,
      active_customers_in_range: repeat.total_customers,
      repeat_customers_in_range: repeat.repeat_customers,
      repeat_rate:
        repeat.total_customers > 0
          ? repeat.repeat_customers / repeat.total_customers
          : 0,
    },
  };
}

// ───────────────────────── Refund trend ─────────────────────────

export async function getRefundTrendReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const [amounts, reasons] = await Promise.all([
    refundAmountSeries({ range, storeId, granularity: ctx.granularity }),
    refundReasonSeries({ range, storeId, granularity: ctx.granularity }),
  ]);

  const amountMap = indexBy(amounts);
  const series = ctx.buckets.map((bucket) => ({
    bucket,
    amount: amountMap.get(bucket)?.amount ?? 0,
    refunds: amountMap.get(bucket)?.refunds ?? 0,
  }));

  const reasonKeys = ["damaged", "cannot_process", "lost", "other"] as const;
  const reasonBucketMap = new Map<string, Record<string, number>>();
  for (const row of reasons) {
    const bucketRow =
      reasonBucketMap.get(row.bucket) ?? ({} as Record<string, number>);
    bucketRow[row.reason] = (bucketRow[row.reason] ?? 0) + row.amount;
    reasonBucketMap.set(row.bucket, bucketRow);
  }

  const reasonSeries = ctx.buckets.map((bucket) => {
    const row = reasonBucketMap.get(bucket) ?? {};
    const filled: Record<string, number | string> = { bucket };
    for (const reason of reasonKeys) {
      filled[reason] = row[reason] ?? 0;
    }
    return filled;
  });

  const reasonTotals: Record<string, { amount: number; items: number }> = {
    damaged: { amount: 0, items: 0 },
    cannot_process: { amount: 0, items: 0 },
    lost: { amount: 0, items: 0 },
    other: { amount: 0, items: 0 },
  };
  for (const row of reasons) {
    reasonTotals[row.reason].amount += row.amount;
    reasonTotals[row.reason].items += row.items;
  }

  const grandTotal = series.reduce((sum, row) => sum + row.amount, 0);
  const totalRefunds = series.reduce((sum, row) => sum + row.refunds, 0);

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    series,
    reason_series: reasonSeries,
    reason_keys: reasonKeys.map((key) => ({ key, label: key })),
    summary: {
      total_amount: grandTotal,
      total_refunds: totalRefunds,
      reason_totals: reasonTotals,
    },
  };
}

// ───────────────────────── Worker productivity ─────────────────────────

export async function getWorkerProductivityReport(query: GetReportRangeQuery) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const rows = await workerProductivityRows({ range, storeId });

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    workers: rows,
    summary: {
      worker_count: rows.length,
      total_items_completed: rows.reduce((s, r) => s + r.items_completed, 0),
      total_refund_items: rows.reduce((s, r) => s + r.refund_items, 0),
    },
  };
}

// ───────────────────────── Campaign effectiveness ─────────────────────────

export async function getCampaignEffectivenessReport(
  query: GetReportRangeQuery
) {
  const ctx = buildContext(query);
  const range = getJakartaRange(ctx.from, ctx.to);
  const storeId = ctx.store_id ?? undefined;

  const rows = await campaignEffectivenessRows({ range, storeId });

  const totals = rows.reduce(
    (acc, row) => {
      acc.orders += row.orders;
      acc.revenue += row.revenue;
      acc.discount_cost += row.discount_cost;
      return acc;
    },
    { orders: 0, revenue: 0, discount_cost: 0 }
  );

  return {
    from: ctx.from,
    to: ctx.to,
    store_id: ctx.store_id,
    granularity: ctx.granularity,
    campaigns: rows,
    summary: totals,
  };
}
