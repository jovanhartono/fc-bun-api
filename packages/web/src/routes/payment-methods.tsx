import { POSTPaymentMethodSchema } from "@fresclean/api/schema";
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
	PaymentMethodForm,
	type PaymentMethodFormState,
} from "@/features/payment-methods/components/payment-method-form";
import {
	createPaymentMethod,
	fetchPaymentMethods,
	queryKeys,
	type PaymentMethod,
	updatePaymentMethod,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/payment-methods")({
	beforeLoad: requireAuth,
	component: PaymentMethodsPage,
});

const defaultForm: PaymentMethodFormState = {
	name: "",
	code: "",
	is_active: true,
};

function PaymentMethodsPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<PaymentMethodFormState>(defaultForm);
	const [editingPaymentMethod, setEditingPaymentMethod] =
		useState<PaymentMethod | null>(null);
	const sheet = useSheet();
	const { data: paymentMethods = [], isPending } = useQuery({
		queryKey: queryKeys.paymentMethods,
		queryFn: fetchPaymentMethods,
	});
	const paymentMethodCount = paymentMethods.length;

	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingPaymentMethod(null);
		sheet.close();
	}, []);
	const createMutation = useMutation({
		mutationKey: ["create-payment-method"],
		mutationFn: createPaymentMethod,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.paymentMethods,
			});
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});
	const updateMutation = useMutation({
		mutationKey: ["update-payment-method"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updatePaymentMethod>[1];
		}) => updatePaymentMethod(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.paymentMethods,
			});
			resetForm();
		},
	});
	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback((paymentMethod: PaymentMethod) => {
		setEditingPaymentMethod(paymentMethod);
		setForm({
			name: paymentMethod.name,
			code: paymentMethod.code,
			is_active: paymentMethod.is_active,
		});
		sheet.open();
	}, []);
	const columns = useMemo<ColumnDef<PaymentMethod>[]>(
		() => [
			{ accessorKey: "name", header: "Payment Method" },
			{
				accessorKey: "code",
				header: "Code",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.code}</span>
				),
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
		const parsed = POSTPaymentMethodSchema.safeParse({
			name: form.name,
			code: form.code,
			is_active: form.is_active,
		});
		if (!parsed.success) {
			toast.error(
				parsed.error.issues[0]?.message ?? "Invalid payment method payload",
			);
			return;
		}
		if (editingPaymentMethod) {
			await updateMutation.mutateAsync({
				id: editingPaymentMethod.id,
				payload: parsed.data,
			});
			return;
		}
		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell
			title="Payment Methods"
			description="Insert and edit payment method master data."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingPaymentMethod
									? "Edit Payment Method"
									: "Add Payment Method"}
							</SheetTitle>
							<SheetDescription>
								{editingPaymentMethod
									? `Editing ID ${editingPaymentMethod.id}`
									: "Create a new payment method"}
							</SheetDescription>
						</SheetHeader>
						<PaymentMethodForm
							form={form}
							setForm={setForm}
							isSubmitting={isSubmitting}
							isEditing={!!editingPaymentMethod}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Payment Method List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${paymentMethodCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingPaymentMethod(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Payment Method
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={paymentMethods}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
