import type { ordersTable } from "@/db/schema";
import { ForbiddenException } from "@/errors";
import type { JWTPayload } from "@/types";

type OrderForPermissions = Pick<
  typeof ordersTable.$inferSelect,
  "payment_status"
>;

export function assertIsAdmin(user: JWTPayload) {
  if (user.role !== "admin") {
    throw new ForbiddenException("Only admin can perform this action");
  }
}

export function assertCanManageCampaigns(user: JWTPayload) {
  assertIsAdmin(user);
}

export function assertCanManageUsers(user: JWTPayload) {
  assertIsAdmin(user);
}

export function assertCanReassignHandler(user: JWTPayload) {
  assertIsAdmin(user);
}

export function assertCanCreateOrder(user: JWTPayload) {
  if (user.role !== "admin" && user.role !== "cashier") {
    throw new ForbiddenException("Only admin or cashier can create orders");
  }
}

export function assertCanProcessPayment(user: JWTPayload) {
  if (user.role !== "admin" && user.role !== "cashier") {
    throw new ForbiddenException("Only admin or cashier can process payment");
  }
}

export function assertCanProcessPickup(user: JWTPayload) {
  const allowed =
    user.role === "admin" ||
    user.role === "cashier" ||
    user.can_process_pickup === true;

  if (!allowed) {
    throw new ForbiddenException(
      "Only admin, cashier, or authorized pickup handlers can complete pickups"
    );
  }
}

export function assertCanSelfAssign(user: JWTPayload) {
  if (user.role !== "worker") {
    throw new ForbiddenException(
      "Only workers can self-assign order services from the queue"
    );
  }
}

export function assertCanProcessOrderService(user: JWTPayload) {
  if (user.role !== "admin" && user.role !== "worker") {
    throw new ForbiddenException(
      "Only admin or worker can update order service status during processing"
    );
  }
}

export function assertCanUploadServicePhotos(user: JWTPayload) {
  if (user.role !== "admin" && user.role !== "worker") {
    throw new ForbiddenException(
      "Only admin or worker can upload service detail photos"
    );
  }
}

export function assertCanCancelOrderService(
  user: JWTPayload,
  order: OrderForPermissions
) {
  if (!["admin", "cashier", "worker"].includes(user.role)) {
    throw new ForbiddenException(
      "Only admin, cashier, or worker can cancel order services"
    );
  }

  if (order.payment_status !== "unpaid") {
    throw new ForbiddenException(
      "Cancel is only allowed on unpaid orders. Use refund for paid orders."
    );
  }
}

export function assertCanRefundOrderService(
  user: JWTPayload,
  order: OrderForPermissions
) {
  assertIsAdmin(user);

  if (order.payment_status !== "paid") {
    throw new ForbiddenException(
      "Refund is only allowed on paid orders. Use cancel for unpaid orders."
    );
  }
}
