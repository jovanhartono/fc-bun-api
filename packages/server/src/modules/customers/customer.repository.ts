import type { InferInsertModel } from "drizzle-orm";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customersTable } from "@/db/schema";

export function listCustomers() {
  return db.query.customersTable.findMany({
    orderBy: [asc(customersTable.id)],
    with: {
      originStore: {
        columns: {
          name: true,
        },
      },
    },
  });
}

export function findCustomerById(id: number) {
  return db.query.customersTable.findFirst({
    where: eq(customersTable.id, id),
    with: {
      originStore: true,
    },
  });
}

export function createCustomer(
  values: InferInsertModel<typeof customersTable>
) {
  return db.insert(customersTable).values(values).returning();
}

export function updateCustomer(
  id: number,
  values: Partial<InferInsertModel<typeof customersTable>>
) {
  return db
    .update(customersTable)
    .set(values)
    .where(eq(customersTable.id, id))
    .returning();
}
