import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/api";
import { fetchProducts, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<Product>[] = [
	{
		accessorKey: "sku",
		header: "SKU",
		cell: ({ row }) => <span className="font-medium">{row.original.sku}</span>,
	},
	{
		accessorKey: "name",
		header: "Product",
	},
	{
		id: "category",
		header: "Category",
		cell: ({ row }) => row.original.category?.name ?? "-",
	},
	{
		accessorKey: "stock",
		header: "Stock",
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

export const Route = createFileRoute("/products")({
	beforeLoad: requireAuth,
	component: ProductsPage,
});

function ProductsPage() {
	return (
		<EntityTablePage
			title="Products"
			description="Product catalog, stock, and category mapping."
			queryKey={queryKeys.products}
			queryFn={fetchProducts}
			columns={columns}
		/>
	);
}
