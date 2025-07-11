import { eq } from "drizzle-orm";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { db } from "@/db";
import { storesTable } from "@/db/schema";
import { success } from "@/utils/http";
import { idParamSchema } from "@/utils/schema";
import { zodValidator } from "@/utils/zod-validator-wrapper";

const app = new Hono();
const POSTStoreSchema = createInsertSchema(storesTable);
const PUTStoreSchema = createUpdateSchema(storesTable);

app
  .get("/", async (c) => {
    const stores = await db.query.storesTable.findMany();

    return c.json(success(stores));
  })
  .post("/", zodValidator("json", POSTStoreSchema), async (c) => {
    const storeData = c.req.valid("json");

    const [store] = await db.insert(storesTable).values(storeData).returning();

    return c.json(
      success(store, "Successfully adding new store"),
      StatusCodes.CREATED,
    );
  });

app
  .get("/:id", idParamSchema, async (c) => {
    const { id } = c.req.valid("param");

    const store = await db.query.storesTable.findFirst({
      where: eq(storesTable.id, id),
    });

    return c.json(success(store));
  })
  .put("/:id", zodValidator("json", PUTStoreSchema), async (c) => {
    const id = c.req.param("id");
    const storeData = c.req.valid("json");

    const [store] = await db
      .update(storesTable)
      .set(storeData)
      .where(eq(storesTable.id, Number(id)))
      .returning();

    return c.json(success(store, `Successfully updated ${store.name}`));
  });

export default app;
