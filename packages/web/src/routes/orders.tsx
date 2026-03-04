import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/api";
import { fetchOrders, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Order>[] = [
	{
		accessorKey: "id",
		header: "Order ID",
	},
	{
		accessorKey: "customer_name",
		header: "Customer",
	},
	{
		accessorKey: "customer_phone",
		header: "Phone",
	},
	{
		accessorKey: "payment_status",
		header: "Payment",
		cell: ({ row }) => (
			<Badge
				variant={
					row.original.payment_status === "paid" ? "secondary" : "outline"
				}
			>
				{row.original.payment_status}
			</Badge>
		),
	},
	{
		accessorKey: "store_id",
		header: "Store",
	},
];

export const Route = createFileRoute("/orders")({
	beforeLoad: requireAuth,
	component: OrdersPage,
});

function OrdersPage() {
	return (
		<EntityTablePage
			title="Orders"
			description="Recent transactional orders from admin endpoint."
			queryKey={queryKeys.orders}
			queryFn={fetchOrders}
			columns={columns}
		/>
	);
}
