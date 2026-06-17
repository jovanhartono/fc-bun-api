import { Separator } from "@/components/ui/separator";
import type { OrderDetail } from "@/lib/api";
import { formatIDRCurrency } from "@/shared/utils";

interface OrderMoneySummaryProps {
	detail: OrderDetail;
}

export const OrderMoneySummary = ({ detail }: OrderMoneySummaryProps) => {
	const net = Number(detail.total ?? 0) - Number(detail.discount ?? 0);
	const refunded = Number(detail.refunded_amount ?? 0);

	return (
		<div className="px-4 py-4">
			<dl className="grid gap-1.5 text-sm tabular-nums">
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">Subtotal</dt>
					<dd className="font-mono">
						{formatIDRCurrency(String(detail.total ?? 0))}
					</dd>
				</div>
				{detail.campaigns.map((row) => (
					<div className="flex justify-between gap-4" key={row.id}>
						<dt className="text-muted-foreground">
							{row.campaign?.code ?? "Campaign"}
							{row.campaign?.name ? (
								<span className="text-muted-foreground/70">
									{" "}
									· {row.campaign.name}
								</span>
							) : null}
						</dt>
						<dd className="font-mono text-destructive">
							-{formatIDRCurrency(String(row.applied_amount ?? 0))}
						</dd>
					</div>
				))}
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">Discount total</dt>
					<dd className="font-mono text-destructive">
						-{formatIDRCurrency(String(detail.discount ?? 0))}
					</dd>
				</div>
			</dl>
			<Separator className="my-2.5" />
			<dl className="grid gap-1.5 text-sm tabular-nums">
				<div className="flex justify-between gap-4 font-medium">
					<dt>Net</dt>
					<dd className="font-mono">{formatIDRCurrency(String(net))}</dd>
				</div>
				{refunded > 0 ? (
					<div className="flex justify-between gap-4 text-destructive">
						<dt>Refunded</dt>
						<dd className="font-mono">
							-{formatIDRCurrency(String(refunded))}
						</dd>
					</div>
				) : null}
			</dl>
		</div>
	);
};
