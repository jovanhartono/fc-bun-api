import { Hono } from "hono";
import {
  GETDailyReportQuerySchema,
  GETReportOverviewQuerySchema,
} from "@/modules/reports/report.schema";
import {
  getDailyReport,
  getReportOverview,
} from "@/modules/reports/report.service";
import { success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const app = new Hono()
  .get(
    "/daily",
    zodValidator("query", GETDailyReportQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const data = await getDailyReport(query);
      return c.json(success(data));
    }
  )
  .get(
    "/overview",
    zodValidator("query", GETReportOverviewQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const data = await getReportOverview(query);
      return c.json(success(data));
    }
  );

export default app;
