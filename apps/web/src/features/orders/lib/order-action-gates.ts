import type { Me, OrderDetail } from "@/lib/api";

export interface OrderActionGates {
	isAdmin: boolean;
	isPaymentAllowed: boolean;
	isPickupAllowed: boolean;
	canManageDropoffPhoto: boolean;
	canManageCourier: boolean;
	canOpenPickup: boolean;
	pickupDisabledReason?: string;
	canCancelOrder: boolean;
	canRefundWholeOrder: boolean;
	canOpenComplaint: boolean;
	complaintableServices: OrderDetail["services"];
	readyForPickupServices: OrderDetail["services"];
	refundableServices: OrderDetail["services"];
	refundableProducts: OrderDetail["products"];
	cancellableServices: OrderDetail["services"];
	cancellableProducts: OrderDetail["products"];
}

// Pure derivation of every role/state gate on the order detail page. `me`
// must come from /admin/users/me — JWT claims go stale when an admin changes
// roles mid-session.
export const getOrderActionGates = (
	me: Me | undefined,
	detail: OrderDetail,
): OrderActionGates => {
	const isAdmin = me?.role === "admin";
	const isPaymentAllowed = isAdmin || me?.role === "cashier";
	const isPickupAllowed = isPaymentAllowed || me?.can_process_pickup === true;
	const canManageDropoffPhoto = isPaymentAllowed || me?.role === "worker";
	// Courier attribution edit mirrors create-order permission (admin + cashier).
	const canManageCourier = isPaymentAllowed;

	const services = Array.isArray(detail.services) ? detail.services : [];
	const readyForPickupServices = services.filter(
		(service) => service.status === "ready_for_pickup",
	);
	const refundableServices = services.filter(
		// Rework lines are free (₀) — never refundable. Escalation refunds the
		// original complained line, not its rework (ADR-0013).
		(service) =>
			!service.reworkOf && !["refunded", "cancelled"].includes(service.status),
	);
	const products = Array.isArray(detail.products) ? detail.products : [];
	const refundableProducts = products.filter(
		(item) => !(item.refunded_at || item.cancelled_at),
	);
	const cancellableServices = services.filter(
		(service) =>
			!["picked_up", "refunded", "cancelled"].includes(service.status),
	);
	const cancellableProducts = products.filter(
		(item) => !item.refunded_at && !item.cancelled_at,
	);
	// ADR-0013: a complaint is a post-pickup grievance, so only picked_up lines
	// are complainable, and only if they have no open complaint already.
	const complaintableServices = services.filter(
		(service) =>
			service.status === "picked_up" &&
			!(service.complaints ?? []).some((entry) => entry.status === "open"),
	);
	const isPaid = detail.payment_status === "paid";
	// ADR-0009: items are ready but the Order is unpaid — explain why pickup is
	// blocked, and to whom (a pickup-only worker must fetch a cashier to collect).
	const pickupDisabledReason =
		readyForPickupServices.length > 0 && !isPaid
			? isPaymentAllowed
				? "Order must be paid before pickup."
				: "A cashier must collect payment before pickup."
			: undefined;

	return {
		isAdmin,
		isPaymentAllowed,
		isPickupAllowed,
		canManageDropoffPhoto,
		canManageCourier,
		// ADR-0009: payment precedes pickup — no collection on an unpaid Order.
		canOpenPickup:
			isPickupAllowed && readyForPickupServices.length > 0 && isPaid,
		pickupDisabledReason,
		canCancelOrder:
			detail.status !== "cancelled" &&
			!isPaid &&
			(cancellableServices.length > 0 || cancellableProducts.length > 0),
		canRefundWholeOrder:
			isAdmin &&
			detail.status !== "cancelled" &&
			isPaid &&
			(refundableServices.length > 0 || refundableProducts.length > 0),
		// Opening a complaint is open to any staff (ADR-0013) — no role gate.
		canOpenComplaint: complaintableServices.length > 0,
		complaintableServices,
		readyForPickupServices,
		refundableServices,
		refundableProducts,
		cancellableServices,
		cancellableProducts,
	};
};
