import { POSTServiceSchema } from "@fresclean/api/schema";
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
	ServiceForm,
	type ServiceFormState,
} from "@/features/services/components/service-form";
import {
	createService,
	fetchCategories,
	fetchServices,
	queryKeys,
	type Service,
	updateService,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { formatIDRCurrency } from "@/shared/utils";

export const Route = createFileRoute("/services")({
	beforeLoad: requireAuth,
	component: ServicesPage,
});

const defaultForm: ServiceFormState = {
	category_id: "",
	code: "",
	cogs: "",
	price: "",
	name: "",
	description: "",
	is_active: true,
};

function ServicesPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<ServiceFormState>(defaultForm);
	const [editingService, setEditingService] = useState<Service | null>(null);
	const sheet = useSheet();
	const { data: services = [], isPending } = useQuery({
		queryKey: queryKeys.services,
		queryFn: fetchServices,
	});
	const serviceCount = services.length;
	const { data: categories = [], isPending: isCategoriesPending } = useQuery({
		queryKey: queryKeys.categories,
		queryFn: fetchCategories,
	});
	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingService(null);
		sheet.close();
	}, []);
	const createMutation = useMutation({
		mutationKey: ["create-service"],
		mutationFn: createService,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.services });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});
	const updateMutation = useMutation({
		mutationKey: ["update-service"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateService>[1];
		}) => updateService(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.services });
			resetForm();
		},
	});
	const isSubmitting = createMutation.isPending || updateMutation.isPending;
	const handleEdit = useCallback((service: Service) => {
		setEditingService(service);
		setForm({
			category_id: String(service.category_id),
			code: service.code,
			cogs: String(service.cogs),
			price: String(service.price),
			name: service.name,
			description: service.description ?? "",
			is_active: service.is_active,
		});
		sheet.open();
	}, []);
	const columns = useMemo<ColumnDef<Service>[]>(
		() => [
			{
				accessorKey: "code",
				header: "Code",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.code}</span>
				),
			},
			{ accessorKey: "name", header: "Service" },
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
		const parsed = POSTServiceSchema.safeParse({
			category_id: Number(form.category_id),
			code: form.code,
			cogs: form.cogs,
			price: form.price,
			name: form.name,
			description: form.description,
			is_active: form.is_active,
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid service payload");
			return;
		}
		if (editingService) {
			await updateMutation.mutateAsync({
				id: editingService.id,
				payload: parsed.data,
			});
			return;
		}
		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell
			title="Services"
			description="Insert and edit service master data."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingService ? "Edit Service" : "Add Service"}
							</SheetTitle>
							<SheetDescription>
								{editingService
									? `Editing ID ${editingService.id}`
									: "Create a new service"}
							</SheetDescription>
						</SheetHeader>
						<ServiceForm
							form={form}
							setForm={setForm}
							categories={categories}
							categoriesLoading={isCategoriesPending}
							isSubmitting={isSubmitting}
							isEditing={!!editingService}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Service List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${serviceCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingService(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Service
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={services}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
