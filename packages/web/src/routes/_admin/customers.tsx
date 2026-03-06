import { POSTCustomerSchema } from "@fresclean/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleLine, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	CustomerForm,
	type CustomerFormState,
} from "@/features/customers/components/customer-form";
import {
	type Customer,
	createCustomer,
	fetchCustomers,
	queryKeys,
	updateCustomer,
} from "@/lib/api";
import { normalizePhoneNumber } from "@/lib/phone-number";
import { useSheet } from "@/stores/sheet-store";

export const Route = createFileRoute("/_admin/customers")({
	component: CustomersPage,
});

const defaultForm: CustomerFormState = {
	name: "",
	phone_number: "",
	email: "",
	address: "",
	origin_store_id: undefined,
};

const customerFormResolverSchema = POSTCustomerSchema.omit({
	origin_store_id: true,
}).extend({
	email: z.union([z.literal(""), z.email("Invalid email address")]),
	address: z.string(),
	origin_store_id: z.number().int().optional(),
});

type CustomerSheetContentProps = {
	editingCustomer?: Customer;
};

function CustomerSheetContent({ editingCustomer }: CustomerSheetContentProps) {
	const queryClient = useQueryClient();
	const { closeSheet } = useSheet();

	const form = useForm<CustomerFormState>({
		resolver: zodResolver(customerFormResolverSchema),
		defaultValues: editingCustomer
			? {
					name: editingCustomer.name,
					phone_number: editingCustomer.phone_number,
					email: editingCustomer.email ?? "",
					address: editingCustomer.address ?? "",
					origin_store_id: editingCustomer.origin_store_id,
				}
			: defaultForm,
	});

	const createMutation = useMutation({
		mutationKey: ["create-customer"],
		mutationFn: createCustomer,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.customers });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			closeSheet();
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
			closeSheet();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;
	const isEditing = !!editingCustomer;

	const handleSubmit: SubmitHandler<CustomerFormState> = async (values) => {
		const normalizedPhoneNumber = normalizePhoneNumber(values.phone_number);

		if (isEditing && editingCustomer) {
			const payload: Parameters<typeof updateCustomer>[1] = {
				name: values.name,
				phone_number: normalizedPhoneNumber,
				email: values.email?.length ? values.email : undefined,
				address: values.address ?? "",
			};

			await updateMutation.mutateAsync({
				id: editingCustomer.id,
				payload,
			});
			return;
		}

		const payload: Parameters<typeof createCustomer>[0] = {
			name: values.name,
			phone_number: normalizedPhoneNumber,
			email: values.email?.length ? values.email : undefined,
			address: values.address ?? "",
			...(values.origin_store_id
				? { origin_store_id: values.origin_store_id }
				: {}),
		};

		await createMutation.mutateAsync(payload);
	};

	return (
		<CustomerForm
			control={form.control}
			handleSubmit={form.handleSubmit}
			onSubmit={handleSubmit}
			isSubmitting={isSubmitting}
			isEditing={isEditing}
			onReset={closeSheet}
		/>
	);
}

function CustomersPage() {
	const { openSheet } = useSheet();

	const { data: customers = [], isPending } = useQuery({
		queryKey: queryKeys.customers,
		queryFn: fetchCustomers,
	});
	const customerCount = customers.length;

	const handleOpenEditSheet = useCallback(
		(customer: Customer) => {
			openSheet({
				title: "Edit Customer",
				description: `Editing ID ${customer.id}`,
				content: <CustomerSheetContent editingCustomer={customer} />,
			});
		},
		[openSheet],
	);

	const handleOpenCreateSheet = useCallback(() => {
		openSheet({
			title: "Add Customer",
			description: "Create a new customer record",
			content: <CustomerSheetContent />,
		});
	}, [openSheet]);

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
						onClick={() => handleOpenEditSheet(row.original)}
						icon={<PencilSimpleLine className="size-4" weight="duotone" />}
					>
						Edit
					</Button>
				),
			},
		],
		[handleOpenEditSheet],
	);

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle>Customer List</CardTitle>
					<div className="flex items-center gap-2">
						<Badge
							variant={isPending ? "secondary" : "outline"}
						>{`${customerCount} items`}</Badge>
						<Button
							onClick={handleOpenCreateSheet}
							icon={<Plus className="size-4" weight="duotone" />}
						>
							Add Customer
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={customers} isLoading={isPending} />
				</CardContent>
			</Card>
		</div>
	);
}
