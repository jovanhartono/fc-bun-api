import { POSTCustomerSchema, PUTCustomerSchema } from "@fresclean/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleLine, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { CustomerSelect } from "@/components/customer-select";
import { DataTable } from "@/components/data-table";
import { ProductSelect } from "@/components/product-select";
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
	CustomerForm,
	type CustomerFormState,
} from "@/features/customers/components/customer-form";
import {
	createCustomer,
	fetchCustomers,
	fetchStores,
	queryKeys,
	type Customer,
	updateCustomer,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone-number";

export const Route = createFileRoute("/customers")({
	beforeLoad: requireAuth,
	component: CustomersPage,
});

const defaultForm: CustomerFormState = {
	name: "",
	phone_number: "",
	email: "",
	address: "",
	origin_store_id: "",
};

const customerFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	phone_number: z
		.string()
		.trim()
		.min(1, "Phone is required")
		.refine((value) => isValidPhoneNumber(value), "Invalid phone number"),
	email: z.string(),
	address: z.string(),
	origin_store_id: z.string(),
});

function CustomersPage() {
	const queryClient = useQueryClient();
	const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
	const sheet = useSheet();
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [selectedProductId, setSelectedProductId] = useState("");

	const form = useForm<CustomerFormState>({
		resolver: zodResolver(customerFormSchema),
		defaultValues: defaultForm,
	});

	const { data: customers = [], isPending } = useQuery({
		queryKey: queryKeys.customers,
		queryFn: fetchCustomers,
	});
	const customerCount = customers.length;

	const { data: stores = [], isPending: isStoresPending } = useQuery({
		queryKey: queryKeys.stores,
		queryFn: fetchStores,
	});

	const resetForm = useCallback(() => {
		form.reset(defaultForm);
		setEditingCustomer(null);
		sheet.close();
	}, [form, sheet]);

	const createMutation = useMutation({
		mutationKey: ["create-customer"],
		mutationFn: createCustomer,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.customers });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});

	const updateMutation = useMutation({
		mutationKey: ["update-customer"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateCustomer>[1];
		}) => updateCustomer(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.customers });
			resetForm();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback(
		(customer: Customer) => {
			setEditingCustomer(customer);
			form.reset({
				name: customer.name,
				phone_number: customer.phone_number,
				email: customer.email ?? "",
				address: customer.address ?? "",
				origin_store_id: String(customer.origin_store_id),
			});
			sheet.open();
		},
		[form, sheet],
	);

	const columns = useMemo<ColumnDef<Customer>[]>(
		() => [
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

	const handleSubmit: SubmitHandler<CustomerFormState> = async (values) => {
		const normalizedPhoneNumber = normalizePhoneNumber(values.phone_number);

		if (editingCustomer) {
			const updateParsed = PUTCustomerSchema.safeParse({
				name: values.name,
				phone_number: normalizedPhoneNumber,
				email: values.email?.length ? values.email : undefined,
				address: values.address ?? "",
			});

			if (!updateParsed.success) {
				toast.error(
					updateParsed.error.issues[0]?.message ?? "Invalid customer payload",
				);
				return;
			}

			await updateMutation.mutateAsync({
				id: editingCustomer.id,
				payload: updateParsed.data,
			});
			return;
		}

		const createParsed = POSTCustomerSchema.safeParse({
			name: values.name,
			phone_number: normalizedPhoneNumber,
			email: values.email?.length ? values.email : undefined,
			address: values.address ?? "",
			origin_store_id: Number(values.origin_store_id),
		});

		if (!createParsed.success) {
			toast.error(
				createParsed.error.issues[0]?.message ?? "Invalid customer payload",
			);
			return;
		}

		await createMutation.mutateAsync(createParsed.data);
	};

	return (
		<AppShell
			title="Customers"
			description="Insert and edit customer master data."
		>
			<div className="grid gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle>Quick Select</CardTitle>
						<Badge variant="outline">Customer & Product</Badge>
					</CardHeader>
					<CardContent className="grid gap-4 md:grid-cols-2">
						<CustomerSelect
							id="quick-customer-select"
							label="Customer Select"
							value={selectedCustomerId}
							onValueChange={setSelectedCustomerId}
						/>
						<ProductSelect
							id="quick-product-select"
							label="Product Select"
							value={selectedProductId}
							onValueChange={setSelectedProductId}
						/>
					</CardContent>
				</Card>

				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingCustomer ? "Edit Customer" : "Add Customer"}
							</SheetTitle>
							<SheetDescription>
								{editingCustomer
									? `Editing ID ${editingCustomer.id}`
									: "Create a new customer record"}
							</SheetDescription>
						</SheetHeader>
						<CustomerForm
							control={form.control}
							handleSubmit={form.handleSubmit}
							onSubmit={handleSubmit}
							isSubmitting={isSubmitting}
							isEditing={!!editingCustomer}
							stores={stores}
							storesLoading={isStoresPending}
							onReset={resetForm}
						/>
					</SheetContent>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Customer List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${customerCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingCustomer(null);
												form.reset(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Customer
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={customers}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
