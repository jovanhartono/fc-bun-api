import { Hono } from "hono";
import adminStoresRoutes from "@/routes/admin/stores";

const app = new Hono();
app.route("/stores", adminStoresRoutes);

app.get("/test", (c) => {
  const jwtPayload = c.get("jwtPayload");

  return c.text("masuk");
});

export default app;
