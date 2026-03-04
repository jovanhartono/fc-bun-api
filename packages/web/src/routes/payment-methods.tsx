import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { PaymentMethod } from "@/lib/api";
import { fetchPaymentMethods, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<PaymentMethod>[] = [
	{
		accessorKey: "name",
		header: "Payment Method",
	},
	{
		accessorKey: "code",
		header: "Code",
		cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
	},
	{
		id: "status",
		header: "Status",
		cell: ({ row }) => (
			<Badge variant={row.original.is_active ? "secondary" : "outline"}>
				{row.original.is_active ? "Active" : "Inactive"}
			</Badge>
		),
	},
];

export const Route = createFileRoute("/payment-methods")({
	beforeLoad: requireAuth,
	component: PaymentMethodsPage,
});

function PaymentMethodsPage() {
	return (
		<EntityTablePage
			title="Payment Methods"
			description="Available payment channels used at checkout."
			queryKey={queryKeys.paymentMethods}
			queryFn={fetchPaymentMethods}
			columns={columns}
		/>
	);
}
