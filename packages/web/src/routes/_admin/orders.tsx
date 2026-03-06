import { Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { OrderForm } from "@/features/orders/components/order-form";
import {
	type CreateOrderPayload,
	createOrder,
	fetchCurrentUserDetail,
	fetchOrderDetail,
	fetchOrders,
	fetchStores,
	type Order,
	queryKeys,
} from "@/lib/api";
import { getCurrentUser } from "@/stores/auth-store";
import { useGlobalSheet } from "@/stores/sheet-store";

export const Route = createFileRoute("/_admin/orders")({
	component: OrdersPage,
});

type CreateOrderSheetContentProps = {
	allowedStoreIds?: number[];
};

function CreateOrderSheetContent({
	allowedStoreIds,
}: CreateOrderSheetContentProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { closeSheet } = useGlobalSheet();

	const createMutation = useMutation({
		mutationKey: ["create-order"],
		mutationFn: createOrder,
	});

	const handleOnSubmit = async (payload: CreateOrderPayload) => {
		const created = await createMutation.mutateAsync(payload);
		const orderId = (created as { data?: { id?: number } }).data?.id;
		await queryClient.invalidateQueries({ queryKey: ["orders"] });
		await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });

		if (!orderId) {
			closeSheet();
			toast.success("Order created");
			return;
		}

		const detail = await fetchOrderDetail(orderId);
		const itemCodes = detail.services
			.map((item) => item.item_code)
			.filter(Boolean) as string[];
		const preview = itemCodes.slice(0, 3).join(", ");
		const suffix = itemCodes.length > 3 ? ` +${itemCodes.length - 3} more` : "";

		closeSheet();
		toast.success("Order created", {
			description:
				itemCodes.length > 0 ? `Item tags: ${preview}${suffix}` : undefined,
		});
		void navigate({
			to: "/orders/$orderId",
			params: { orderId: String(orderId) },
		});
	};

	return (
		<OrderForm
			handleOnSubmit={handleOnSubmit}
			allowedStoreIds={allowedStoreIds}
			isSubmitting={createMutation.isPending}
		/>
	);
}

function OrdersPage() {
	const { openSheet } = useGlobalSheet();
	const currentUser = getCurrentUser();

	const [storeId, setStoreId] = useState<string>(
		currentUser?.role === "admin" ? "all" : "",
	);

	const storesQuery = useQuery({
		queryKey: queryKeys.stores,
		queryFn: fetchStores,
	});
	const currentUserDetailQuery = useQuery({
		queryKey: currentUser
			? queryKeys.userDetail(currentUser.id)
			: ["user-detail", -1],
		queryFn: fetchCurrentUserDetail,
		enabled: !!currentUser,
	});

	const userStoreIds =
		currentUserDetailQuery.data?.userStores?.map((item) => item.store_id) ?? [];

	useEffect(() => {
		if (!currentUser || storeId) {
			return;
		}

		if (currentUser.role === "admin") {
			return;
		}

		if (userStoreIds.length > 0) {
			setStoreId(String(userStoreIds[0]));
		}
	}, [currentUser, storeId, userStoreIds]);

	const parsedStoreId =
		storeId && storeId !== "all" ? Number(storeId) : undefined;
	const orderQuery =
		currentUser?.role === "admin"
			? parsedStoreId
				? { store_id: parsedStoreId }
				: undefined
			: parsedStoreId
				? { store_id: parsedStoreId }
				: undefined;

	const ordersQuery = useQuery({
		queryKey: queryKeys.orders(orderQuery),
		queryFn: () => fetchOrders(orderQuery),
		enabled: currentUser?.role === "admin" ? true : parsedStoreId !== undefined,
	});

	const orders = ordersQuery.data ?? [];
	const orderCount = orders.length;

	const columns = useMemo<ColumnDef<Order>[]>(
		() => [
			{
				accessorKey: "id",
				header: "Order ID",
				cell: ({ row }) => (
					<Link
						to="/orders/$orderId"
						params={{ orderId: String(row.original.id) }}
						className="underline"
					>
						{row.original.id}
					</Link>
				),
			},
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
			{ accessorKey: "store_code", header: "Store" },
		],
		[],
	);

	const handleAddOrder = () => {
		openSheet({
			title: "Create Order",
			description: "Create a new order from products/services.",
			content: (
				<CreateOrderSheetContent
					allowedStoreIds={
						currentUser?.role === "admin" ? undefined : userStoreIds
					}
				/>
			),
		});
	};

	const visibleStores =
		currentUser?.role === "admin"
			? (storesQuery.data ?? [])
			: (storesQuery.data ?? []).filter((store) =>
					userStoreIds.includes(store.id),
				);

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle>Order List</CardTitle>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							value={storeId}
							onValueChange={(value) => setStoreId(value ?? "")}
						>
							<SelectTrigger className="h-10 min-w-48">
								<SelectValue placeholder="Filter by store" />
							</SelectTrigger>
							<SelectContent>
								{currentUser?.role === "admin" ? (
									<SelectItem value="all">All stores</SelectItem>
								) : null}
								{visibleStores.map((store) => (
									<SelectItem key={store.id} value={String(store.id)}>
										{`${store.code} - ${store.name}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Badge
							variant={ordersQuery.isPending ? "secondary" : "outline"}
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
					<DataTable
						columns={columns}
						data={orders}
						isLoading={ordersQuery.isPending || storesQuery.isPending}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
