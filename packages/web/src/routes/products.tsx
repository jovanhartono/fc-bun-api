import { POSTProductSchema } from "@fresclean/api/schema";
import { PencilSimpleLine, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	useSheet,
} from "@/components/ui/sheet";
import {
	ProductForm,
	type ProductFormState,
} from "@/features/products/components/product-form";
import {
	createProduct,
	fetchCategories,
	fetchProducts,
	queryKeys,
	type Product,
	updateProduct,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { formatIDRCurrency } from "@/shared/utils";

export const Route = createFileRoute("/products")({
	beforeLoad: requireAuth,
	component: ProductsPage,
});

const defaultForm: ProductFormState = {
	name: "",
	description: "",
	is_active: true,
	sku: "",
	uom: "pcs",
	stock: "0",
	category_id: "",
	cogs: "",
	price: "",
};

function ProductsPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<ProductFormState>(defaultForm);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const sheet = useSheet();
	const { data: products = [], isPending } = useQuery({
		queryKey: queryKeys.products,
		queryFn: fetchProducts,
	});
	const productCount = products.length;
	const { data: categories = [], isPending: isCategoriesPending } = useQuery({
		queryKey: queryKeys.categories,
		queryFn: fetchCategories,
	});

	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingProduct(null);
		sheet.close();
	}, []);
	const createMutation = useMutation({
		mutationKey: ["create-product"],
		mutationFn: createProduct,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.products });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});
	const updateMutation = useMutation({
		mutationKey: ["update-product"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateProduct>[1];
		}) => updateProduct(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.products });
			resetForm();
		},
	});
	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback((product: Product) => {
		setEditingProduct(product);
		setForm({
			name: product.name,
			description: product.description ?? "",
			is_active: product.is_active,
			sku: product.sku,
			uom: product.uom,
			stock: String(product.stock),
			category_id: String(product.category_id),
			cogs: String(product.cogs),
			price: String(product.price),
		});
		sheet.open();
	}, []);
	const columns = useMemo<ColumnDef<Product>[]>(
		() => [
			{
				accessorKey: "sku",
				header: "SKU",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.sku}</span>
				),
			},
			{ accessorKey: "name", header: "Product" },
			{
				id: "category",
				header: "Category",
				cell: ({ row }) => row.original.category?.name ?? "-",
			},
			{
				accessorKey: "cogs",
				header: "COGS",
				cell: ({ row }) => formatIDRCurrency(String(row.original.cogs)),
			},
			{
				accessorKey: "price",
				header: "Price",
				cell: ({ row }) => formatIDRCurrency(String(row.original.price)),
			},
			{ accessorKey: "stock", header: "Stock" },
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<Badge variant={row.original.is_active ? "success" : "danger"}>
						{row.original.is_active ? "Active" : "Inactive"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleEdit(row.original)}
					>
						<PencilSimpleLine className="size-4" weight="duotone" />
						Edit
					</Button>
				),
			},
		],
		[handleEdit],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = POSTProductSchema.safeParse({
			name: form.name,
			description: form.description,
			is_active: form.is_active,
			sku: form.sku,
			uom: form.uom,
			stock: Number(form.stock),
			category_id: Number(form.category_id),
			cogs: form.cogs,
			price: form.price,
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid product payload");
			return;
		}
		if (editingProduct) {
			await updateMutation.mutateAsync({
				id: editingProduct.id,
				payload: parsed.data,
			});
			return;
		}
		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell
			title="Products"
			description="Insert and edit product master data."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingProduct ? "Edit Product" : "Add Product"}
							</SheetTitle>
							<SheetDescription>
								{editingProduct
									? `Editing ID ${editingProduct.id}`
									: "Create a new product"}
							</SheetDescription>
						</SheetHeader>
						<ProductForm
							form={form}
							setForm={setForm}
							categories={categories}
							categoriesLoading={isCategoriesPending}
							isSubmitting={isSubmitting}
							isEditing={!!editingProduct}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Product List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${productCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingProduct(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Product
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={products}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
