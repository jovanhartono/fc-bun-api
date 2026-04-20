import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	KpiTile,
	ReportKpiRow,
} from "@/features/reports/components/report-kpi-row";
import { ExportButton } from "@/features/reports/components/report-shell";
import {
	csvFilename,
	downloadCsv,
	escapeCsv,
} from "@/features/reports/utils/csv";
import { campaignEffectivenessQueryOptions } from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";

interface CampaignsPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");
const percentFormatter = new Intl.NumberFormat("en-ID", {
	style: "percent",
	maximumFractionDigits: 1,
});

export const CampaignsPanel = ({ from, to, storeId }: CampaignsPanelProps) => {
	const query = useQuery(
		campaignEffectivenessQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;
	const campaigns = data?.campaigns ?? [];
	const maxOrders = campaigns.reduce((m, c) => Math.max(m, c.orders), 0);

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = [
			"Campaign effectiveness,Code,Name,Orders,Revenue,Discount cost,Avg order value",
		];
		for (const c of campaigns) {
			lines.push(
				`Campaign effectiveness,${escapeCsv(c.campaign_code)},${escapeCsv(c.campaign_name)},${c.orders},${c.revenue},${c.discount_cost},${c.avg_order_value}`,
			);
		}
		downloadCsv(
			csvFilename("campaign-effectiveness", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	const totalRevenue = data?.summary.revenue ?? 0;
	const totalDiscount = data?.summary.discount_cost ?? 0;
	const roi = totalDiscount > 0 ? totalRevenue / totalDiscount : 0;

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Campaigns used"
						value={numberFormatter.format(campaigns.length)}
					/>
					<KpiTile
						label="Orders w/ campaign"
						value={numberFormatter.format(data?.summary.orders ?? 0)}
					/>
					<KpiTile
						label="Revenue attributed"
						value={formatIDRCurrency(String(totalRevenue))}
					/>
					<KpiTile
						label="Discount cost"
						value={formatIDRCurrency(String(totalDiscount))}
						helper={`ROI ${roi.toFixed(2)}×`}
					/>
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<Card className="border-border/70">
				<CardHeader>
					<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						Campaign leaderboard
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{campaigns.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No campaigns redeemed.
						</p>
					) : (
						<div className="grid gap-3">
							{campaigns.map((c) => {
								const pct = maxOrders === 0 ? 0 : (c.orders / maxOrders) * 100;
								const discountRate =
									c.revenue > 0 ? c.discount_cost / c.revenue : 0;
								return (
									<div key={c.campaign_id} className="grid gap-1">
										<div className="flex items-center justify-between gap-2">
											<span className="flex items-center gap-2 truncate text-sm font-medium">
												<span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
													{c.campaign_code}
												</span>
												<span className="truncate">{c.campaign_name}</span>
											</span>
											<span className="font-mono text-sm tabular-nums">
												{`${numberFormatter.format(c.orders)} orders`}
											</span>
										</div>
										<div className="h-1.5 w-full bg-muted">
											<div
												className="h-full bg-foreground"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
											<span>{formatIDRCurrency(String(c.revenue))}</span>
											<span>
												{`discount ${formatIDRCurrency(String(c.discount_cost))} · ${percentFormatter.format(discountRate)}`}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default CampaignsPanel;
