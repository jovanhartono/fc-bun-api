import { ArrowLeft, ShoppingCart } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/features/orders/components/order-form";
import {
	type CreateOrderPayload,
	createOrder,
	fetchCurrentUserDetail,
	fetchOrderDetail,
	queryKeys,
} from "@/lib/api";
import { getCurrentUser } from "@/stores/auth-store";

export const Route = createFileRoute("/_admin/orders/new")({
	component: CreateOrderPage,
});

function CreateOrderPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const currentUser = getCurrentUser();

	const currentUserDetailQuery = useQuery({
		queryKey: currentUser
			? queryKeys.userDetail(currentUser.id)
			: ["user-detail", -1],
		queryFn: fetchCurrentUserDetail,
		enabled: !!currentUser,
	});

	const userStoreIds =
		currentUserDetailQuery.data?.userStores?.map((item) => item.store_id) ?? [];
	const allowedStoreIds =
		currentUser?.role === "admin" ? undefined : userStoreIds;

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
			toast.success("Order created");
			void navigate({ to: "/orders" });
			return;
		}

		const detail = await fetchOrderDetail(orderId);
		const itemCodes = detail.services
			.map((item) => item.item_code)
			.filter(Boolean) as string[];
		const preview = itemCodes.slice(0, 3).join(", ");
		const suffix = itemCodes.length > 3 ? ` +${itemCodes.length - 3} more` : "";

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
		<div className="grid gap-4">
			<div className="flex items-center">
				<Button
					type="button"
					variant="outline"
					icon={<ArrowLeft className="size-4" weight="duotone" />}
					onClick={() => {
						void navigate({ to: "/orders" });
					}}
				>
					Back to Orders
				</Button>
			</div>
			<div className="rounded-none border p-4">
				<div className="mb-4 flex items-center gap-2 border-b pb-3">
					<ShoppingCart className="size-4" weight="duotone" />
					<p className="text-sm font-medium">Create Order</p>
				</div>
				<OrderForm
					handleOnSubmit={handleOnSubmit}
					allowedStoreIds={allowedStoreIds}
					isSubmitting={
						createMutation.isPending || currentUserDetailQuery.isPending
					}
				/>
			</div>
		</div>
	);
}
