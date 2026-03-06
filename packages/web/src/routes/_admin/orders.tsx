import { Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/features/orders/components/order-form";
import {
	type CreateOrderPayload,
	createOrder,
	fetchOrders,
	type Order,
	queryKeys,
} from "@/lib/api";
import { useGlobalSheet } from "@/stores/sheet-store";

export const Route = createFileRoute("/_admin/orders")({
	component: OrdersPage,
});

function CreateOrderSheetContent() {
	const queryClient = useQueryClient();
	const { closeSheet } = useGlobalSheet();

	const createMutation = useMutation({
		mutationKey: ["create-order"],
		mutationFn: createOrder,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.orders });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			closeSheet();
		},
	});

	const handleOnSubmit = async (payload: CreateOrderPayload) => {
		await createMutation.mutateAsync(payload);
	};

	return (
		<OrderForm
			handleOnSubmit={handleOnSubmit}
			isSubmitting={createMutation.isPending}
		/>
	);
}

function OrdersPage() {
	const { openSheet } = useGlobalSheet();

	const { data: orders = [], isPending } = useQuery({
		queryKey: queryKeys.orders,
		queryFn: fetchOrders,
	});
	const orderCount = orders.length;

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

	const handleAddOrder = () => {
		openSheet({
			title: "Create Order",
			description: "Create a new order from products/services.",
			content: <CreateOrderSheetContent />,
		});
	};

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle>Order List</CardTitle>
					<div className="flex items-center gap-2">
						<Badge
							variant={isPending ? "secondary" : "outline"}
						>{`${orderCount} items`}</Badge>
						<Button
							onClick={handleAddOrder}
							icon={<Plus className="size-4" weight="duotone" />}
						>
							Add Order
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<DataTable columns={columns} data={orders} isLoading={isPending} />
				</CardContent>
			</Card>
		</div>
	);
}
