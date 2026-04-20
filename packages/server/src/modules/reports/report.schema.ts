import { z } from "zod";
import { dateStringSchema } from "@/schema/common";

export const GETDailyReportQuerySchema = z.object({
  date: dateStringSchema("date"),
  store_id: z.coerce.number().int().positive().optional(),
});

export type GetDailyReportQuery = z.infer<typeof GETDailyReportQuerySchema>;

export const GETReportOverviewQuerySchema = z.object({
  date: dateStringSchema("date"),
  store_id: z.coerce.number().int().positive().optional(),
  trend_days: z.coerce.number().int().min(1).max(60).default(14),
});

export type GetReportOverviewQuery = z.infer<
  typeof GETReportOverviewQuerySchema
>;

const granularitySchema = z.enum(["day", "week", "month"]).optional();

export const GETReportRangeQuerySchema = z
  .object({
    from: dateStringSchema("from"),
    to: dateStringSchema("to"),
    store_id: z.coerce.number().int().positive().optional(),
    granularity: granularitySchema,
  })
  .refine((value) => value.from <= value.to, {
    error: "from must be before or equal to to",
    path: ["from"],
  });

export type GetReportRangeQuery = z.infer<typeof GETReportRangeQuerySchema>;
