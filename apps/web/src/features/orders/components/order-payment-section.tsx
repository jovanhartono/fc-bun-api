import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { SelectField } from "@/components/form/select-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { OrderMoneySummary } from "@/features/orders/components/order-money-summary";
import { OrderSectionHeader } from "@/features/orders/components/order-section-header";
import { useOrderPaymentMutation } from "@/features/orders/hooks/useOrderMutations";
import { formatOrderDateTime } from "@/features/orders/lib/format";
import type { OrderActionGates } from "@/features/orders/lib/order-action-gates";
import type { OrderDetail } from "@/lib/api";
import { paymentMethodsQueryOptions } from "@/lib/query-options";
import {
	formatPaymentStatus,
	getPaymentStatusBadgeVariant,
} from "@/lib/status";

interface OrderPaymentSectionProps {
	orderId: number;
	detail: OrderDetail;
	gates: OrderActionGates;
}

export const OrderPaymentSection = ({
	orderId,
	detail,
	gates,
}: OrderPaymentSectionProps) => {
	const isPaid = detail.payment_status === "paid";
	const canCollectPayment = gates.isPaymentAllowed && !isPaid;

	return (
		<Card className="gap-0 overflow-hidden py-0">
			<OrderSectionHeader>Payment</OrderSectionHeader>
			<OrderMoneySummary detail={detail} />
			<Separator />
			<div className="px-4 py-4">
				{isPaid ? <PaidSummary detail={detail} /> : null}
				{canCollectPayment ? <CollectPaymentForm orderId={orderId} /> : null}
				{isPaid || canCollectPayment ? null : <UnpaidSummary />}
			</div>
		</Card>
	);
};

const StatusBadge = ({ status }: { status: OrderDetail["payment_status"] }) => (
	<Badge variant={getPaymentStatusBadgeVariant(status)}>
		{formatPaymentStatus(status)}
	</Badge>
);

const StatusRow = ({ children }: { children: ReactNode }) => (
	<div className="flex items-center justify-between gap-4 text-sm">
		<dt className="text-muted-foreground">Status</dt>
		<dd>{children}</dd>
	</div>
);

const PaidSummary = ({ detail }: { detail: OrderDetail }) => (
	<dl className="grid gap-2">
		<StatusRow>
			<StatusBadge status="paid" />
		</StatusRow>
		<div className="flex items-center justify-between gap-4 text-sm">
			<dt className="text-muted-foreground">Method</dt>
			<dd className="font-medium">{detail.paymentMethod?.name ?? "—"}</dd>
		</div>
		{detail.paid_at ? (
			<div className="flex items-center justify-between gap-4 text-sm">
				<dt className="text-muted-foreground">Paid at</dt>
				<dd className="tabular-nums">{formatOrderDateTime(detail.paid_at)}</dd>
			</div>
		) : null}
	</dl>
);

const UnpaidSummary = () => (
	<dl>
		<StatusRow>
			<StatusBadge status="unpaid" />
		</StatusRow>
	</dl>
);

const CollectPaymentForm = ({ orderId }: { orderId: number }) => {
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
	const paymentMethodsQuery = useQuery(paymentMethodsQueryOptions());
	const paymentMutation = useOrderPaymentMutation(orderId);

	const paymentMethods = Array.isArray(paymentMethodsQuery.data)
		? paymentMethodsQuery.data
		: [];

	return (
		<div className="grid gap-3">
			<dl>
				<StatusRow>
					<StatusBadge status="unpaid" />
				</StatusRow>
			</dl>
			<SelectField
				className="w-full"
				items={paymentMethods.map((method) => ({
					value: String(method.id),
					label: method.name,
				}))}
				onValueChange={setSelectedPaymentMethodId}
				placeholder="Select payment method"
				value={selectedPaymentMethodId}
			/>
			<Button
				className="h-11"
				disabled={paymentMutation.isPending || !selectedPaymentMethodId}
				onClick={async () => {
					await paymentMutation.mutateAsync(Number(selectedPaymentMethodId));
				}}
				type="button"
			>
				Mark as paid
			</Button>
		</div>
	);
};
