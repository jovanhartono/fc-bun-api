import { POSTOrderSchema } from "@fresclean/api/schema";
import { Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { type FormEvent, useMemo, useState } from "react";
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
	OrderForm,
	type OrderFormState,
} from "@/features/orders/components/order-form";
import { createOrder, fetchOrders, type Order, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone-number";

export const Route = createFileRoute("/orders")({
	beforeLoad: requireAuth,
	component: OrdersPage,
});

const defaultForm: OrderFormState = {
	customer_name: "",
	customer_phone: "",
	customer_id: "",
	store_id: "",
	payment_method_id: "",
	payment_status: "unpaid",
	discount: "0",
	notes: "",
	product_id: "",
	product_qty: "1",
	service_id: "",
	service_qty: "1",
};

function OrdersPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<OrderFormState>(defaultForm);
	const sheet = useSheet();

	const { data: orders = [], isPending } = useQuery({
		queryKey: queryKeys.orders,
		queryFn: fetchOrders,
	});
	const orderCount = orders.length;

	const createMutation = useMutation({
		mutationKey: ["create-order"],
		mutationFn: createOrder,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.orders });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			setForm(defaultForm);
			sheet.close();
		},
	});

	const columns = useMemo<ColumnDef<Order>[]>(
		() => [
			{ accessorKey: "id", header: "Order ID" },
			{ accessorKey: "customer_name", header: "Customer" },
			{ accessorKey: "customer_phone", header: "Phone" },
			{
				accessorKey: "payment_status",
				header: "Payment",
				cell: ({ row }) => (
					<Badge
						variant={
							row.original.payment_status === "paid" ? "secondary" : "outline"
						}
					>
						{row.original.payment_status}
					</Badge>
				),
			},
			{ accessorKey: "store_id", header: "Store" },
		],
		[],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isValidPhoneNumber(form.customer_phone)) {
			toast.error("Invalid customer phone number");
			return;
		}
		const normalizedCustomerPhone = normalizePhoneNumber(form.customer_phone);

		const parsed = POSTOrderSchema.safeParse({
			customer_name: form.customer_name,
			customer_phone: normalizedCustomerPhone,
			customer_id: Number(form.customer_id),
			store_id: Number(form.store_id),
			products: form.product_id
				? [
						{
							id: Number(form.product_id),
							qty: Number(form.product_qty),
							notes: undefined,
						},
					]
				: undefined,
			services: form.service_id
				? [
						{
							id: Number(form.service_id),
							qty: Number(form.service_qty),
							notes: undefined,
						},
					]
				: undefined,
			discount: form.discount,
			payment_method_id: form.payment_method_id
				? Number(form.payment_method_id)
				: undefined,
			payment_status: form.payment_status,
			notes: form.notes || undefined,
		});

		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid order payload");
			return;
		}

		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell
			title="Orders"
			description="Insert orders. Edit is not available from current backend API."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>Create Order</SheetTitle>
							<SheetDescription>
								Create a new order from products/services.
							</SheetDescription>
						</SheetHeader>
						<OrderForm
							form={form}
							setForm={setForm}
							isSubmitting={createMutation.isPending}
							onSubmit={handleSubmit}
						/>
					</SheetContent>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Order List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${orderCount} items`}</Badge>
								<SheetTrigger
									render={<Button onClick={() => setForm(defaultForm)} />}
								>
									<Plus className="size-4" weight="duotone" />
									Add Order
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={orders}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
