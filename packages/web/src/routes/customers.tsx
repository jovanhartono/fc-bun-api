import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import type { Customer } from "@/lib/api";
import { fetchCustomers, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Customer>[] = [
	{
		accessorKey: "name",
		header: "Name",
	},
	{
		accessorKey: "phone_number",
		header: "Phone",
	},
	{
		accessorKey: "email",
		header: "Email",
		cell: ({ row }) => row.original.email ?? "-",
	},
	{
		id: "origin_store",
		header: "Origin Store",
		cell: ({ row }) => row.original.originStore?.name ?? "-",
	},
];

export const Route = createFileRoute("/customers")({
	beforeLoad: requireAuth,
	component: CustomersPage,
});

function CustomersPage() {
	return (
		<EntityTablePage
			title="Customers"
			description="Customer records from the existing Hono RPC endpoints."
			queryKey={queryKeys.customers}
			queryFn={fetchCustomers}
			columns={columns}
		/>
	);
}
