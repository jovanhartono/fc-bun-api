import { Hono } from "hono";
import storeRoutes from "@/routes/admin/stores";
import customerRoutes from "@/routes/admin/customer";

const app = new Hono();
app.route("/stores", storeRoutes);
app.route("/customers", customerRoutes);

app.get("/test", (c) => {
  const jwtPayload = c.get("jwtPayload");

  return c.text("masuk");
});

export default app;
