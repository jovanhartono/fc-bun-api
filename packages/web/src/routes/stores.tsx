import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@/lib/api";
import { fetchStores, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Store>[] = [
	{
		accessorKey: "code",
		header: "Code",
		cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
	},
	{
		accessorKey: "name",
		header: "Store",
	},
	{
		accessorKey: "phone_number",
		header: "Phone",
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

export const Route = createFileRoute("/stores")({
	beforeLoad: requireAuth,
	component: StoresPage,
});

function StoresPage() {
	return (
		<EntityTablePage
			title="Stores"
			description="Store list and current activation status."
			queryKey={queryKeys.stores}
			queryFn={fetchStores}
			columns={columns}
		/>
	);
}
