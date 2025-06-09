import adminStoresRoutes from "@/routes/admin/stores";
import { Hono } from "hono";

const app = new Hono();
app.route("/stores", adminStoresRoutes);

app.get("/test", (c) => {
  const jwtPayload = c.get("jwtPayload");
  console.log(jwtPayload);

  return c.text("masuk");
});

export default app;
