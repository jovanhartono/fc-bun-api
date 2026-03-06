import type { InferInsertModel } from "drizzle-orm";
import type { customersTable } from "@/db/schema";
import {
  createCustomer,
  findCustomerById,
  listCustomers,
  updateCustomer,
} from "@/modules/customers/customer.repository";

export function getCustomers() {
  return listCustomers();
}

export function getCustomerById(id: number) {
  return findCustomerById(id);
}

export async function createCustomerService({
  actorId,
  payload,
}: {
  actorId: number;
  payload: InferInsertModel<typeof customersTable>;
}) {
  const [customer] = await createCustomer({
    ...payload,
    created_by: actorId,
    updated_by: actorId,
  });

  return customer;
}

export async function updateCustomerService({
  id,
  actorId,
  payload,
}: {
  id: number;
  actorId: number;
  payload: Partial<InferInsertModel<typeof customersTable>>;
}) {
  const [customer] = await updateCustomer(id, {
    ...payload,
    updated_by: actorId,
  });

  return customer ?? null;
}
