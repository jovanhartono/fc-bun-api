import { Hono } from "hono";
import { GETDashboardOverviewQuerySchema } from "@/modules/dashboard/dashboard.schema";
import {
  getDashboardCounts,
  getDashboardOverview,
} from "@/modules/dashboard/dashboard.service";
import { success } from "@/utils/http";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const app = new Hono()
  .get("/counts", async (c) => {
    const counts = await getDashboardCounts();

    return c.json(success(counts));
  })
  .get(
    "/overview",
    zodValidator("query", GETDashboardOverviewQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const data = await getDashboardOverview(query);
      return c.json(success(data));
    }
  );

export default app;
