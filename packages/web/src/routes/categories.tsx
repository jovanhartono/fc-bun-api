import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/api";
import { fetchCategories, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Category>[] = [
	{
		accessorKey: "name",
		header: "Category",
	},
	{
		accessorKey: "description",
		header: "Description",
		cell: ({ row }) => row.original.description ?? "-",
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

export const Route = createFileRoute("/categories")({
	beforeLoad: requireAuth,
	component: CategoriesPage,
});

function CategoriesPage() {
	return (
		<EntityTablePage
			title="Categories"
			description="Product and service categories from existing schema contracts."
			queryKey={queryKeys.categories}
			queryFn={fetchCategories}
			columns={columns}
		/>
	);
}
