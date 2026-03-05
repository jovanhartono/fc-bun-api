import { POSTCategorySchema } from "@fresclean/api/schema";
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
	CategoryForm,
	type CategoryFormState,
} from "@/features/categories/components/category-form";
import {
	createCategory,
	fetchCategories,
	queryKeys,
	type Category,
	updateCategory,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/categories")({
	beforeLoad: requireAuth,
	component: CategoriesPage,
});

const defaultForm: CategoryFormState = {
	name: "",
	description: "",
	is_active: true,
};

function CategoriesPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<CategoryFormState>(defaultForm);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const sheet = useSheet();

	const { data = [], isPending } = useQuery({
		queryKey: queryKeys.categories,
		queryFn: fetchCategories,
	});
	const categoryCount = data.length;

	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingCategory(null);
		sheet.close();
	}, []);

	const createMutation = useMutation({
		mutationKey: ["create-category"],
		mutationFn: createCategory,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});

	const updateMutation = useMutation({
		mutationKey: ["update-category"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateCategory>[1];
		}) => updateCategory(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
			resetForm();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback((category: Category) => {
		setEditingCategory(category);
		setForm({
			name: category.name,
			description: category.description ?? "",
			is_active: category.is_active,
		});
		sheet.open();
	}, []);

	const columns = useMemo<ColumnDef<Category>[]>(
		() => [
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

		const parsed = POSTCategorySchema.safeParse({
			name: form.name,
			description: form.description,
			is_active: form.is_active,
		});

		if (!parsed.success) {
			toast.error(
				parsed.error.issues[0]?.message ?? "Invalid category payload",
			);
			return;
		}

		if (editingCategory) {
			await updateMutation.mutateAsync({
				id: editingCategory.id,
				payload: parsed.data,
			});
			return;
		}

		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell
			title="Categories"
			description="Insert and edit category master data."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingCategory ? "Edit Category" : "Add Category"}
							</SheetTitle>
							<SheetDescription>
								{editingCategory
									? `Editing ID ${editingCategory.id}`
									: "Create a new category"}
							</SheetDescription>
						</SheetHeader>
						<CategoryForm
							form={form}
							setForm={setForm}
							isSubmitting={isSubmitting}
							isEditing={!!editingCategory}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Category List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${categoryCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingCategory(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Category
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable columns={columns} data={data} isLoading={isPending} />
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
