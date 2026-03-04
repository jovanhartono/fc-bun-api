import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { Service } from "@/lib/api";
import { fetchServices, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Service>[] = [
	{
		accessorKey: "code",
		header: "Code",
		cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
	},
	{
		accessorKey: "name",
		header: "Service",
	},
	{
		id: "category",
		header: "Category",
		cell: ({ row }) => row.original.category?.name ?? "-",
	},
	{
		accessorKey: "price",
		header: "Price",
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

export const Route = createFileRoute("/services")({
	beforeLoad: requireAuth,
	component: ServicesPage,
});

function ServicesPage() {
	return (
		<EntityTablePage
			title="Services"
			description="Service catalog with categories and selling price."
			queryKey={queryKeys.services}
			queryFn={fetchServices}
			columns={columns}
		/>
	);
}
