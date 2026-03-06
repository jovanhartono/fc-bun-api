import type { InferInsertModel } from "drizzle-orm";
import type { customersTable } from "@/db/schema";
import {
  createCustomerService,
  getCustomerById,
  getCustomers,
  updateCustomerService,
} from "@/modules/customers/customer.service";

export function getCustomersController() {
  return getCustomers();
}

export function getCustomerByIdController(id: number) {
  return getCustomerById(id);
}

export function createCustomerController({
  actorId,
  payload,
}: {
  actorId: number;
  payload: InferInsertModel<typeof customersTable>;
}) {
  return createCustomerService({ actorId, payload });
}

export function updateCustomerController({
  id,
  actorId,
  payload,
}: {
  id: number;
  actorId: number;
  payload: Partial<InferInsertModel<typeof customersTable>>;
}) {
  return updateCustomerService({ id, actorId, payload });
}
