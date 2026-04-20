import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChartCard } from "@/features/reports/components/area-chart-card";
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
import { paymentMixQueryOptions } from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";

interface PaymentsPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

const PAYMENT_RATIO_FORMATTER = new Intl.NumberFormat("en-ID", {
	style: "percent",
	maximumFractionDigits: 1,
});

export const PaymentsPanel = ({ from, to, storeId }: PaymentsPanelProps) => {
	const query = useQuery(
		paymentMixQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;

	const series = (data?.method_keys ?? []).map((m, idx) => ({
		key: m.key,
		label: m.label,
		color: PALETTE[idx % PALETTE.length],
	}));

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = [];
		lines.push(
			`Payment mix,Bucket,${data.method_keys.map((m) => escapeCsv(m.label)).join(",")}`,
		);
		for (const row of data.series) {
			lines.push(
				`Payment mix,${escapeCsv(row.bucket as string)},${data.method_keys.map((m) => row[m.key] ?? 0).join(",")}`,
			);
		}
		lines.push("");
		lines.push("Totals,Method,Revenue,Orders,Share");
		for (const m of data.summary.methods) {
			lines.push(
				`Totals,${escapeCsv(m.payment_method_name)},${m.revenue},${m.orders},${m.share}`,
			);
		}
		downloadCsv(
			csvFilename("payment-mix", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Paid revenue"
						value={formatIDRCurrency(String(data?.summary.grand_total ?? 0))}
					/>
					<KpiTile
						label="Paid orders"
						value={new Intl.NumberFormat("en-ID").format(
							data?.summary.total_orders ?? 0,
						)}
					/>
					<KpiTile label="Methods" value={data?.summary.methods.length ?? 0} />
					<KpiTile label="Granularity" value={data?.granularity ?? "—"} />
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<AreaChartCard
				title="Revenue by payment method"
				description="Stacked revenue over time."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				stacked
				series={series}
				valueFormatter={(v) => formatIDRCurrency(String(v))}
			/>

			<Card className="border-border/70">
				<CardHeader>
					<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						Mix share
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{(data?.summary.methods ?? []).length === 0 ? (
						<p className="text-sm text-muted-foreground">No paid orders.</p>
					) : (
						<div className="grid gap-2">
							{data?.summary.methods.map((m) => (
								<div key={m.payment_method_id} className="grid gap-1">
									<div className="flex items-center justify-between gap-2">
										<span className="truncate text-sm font-medium">
											{m.payment_method_name}
										</span>
										<span className="font-mono text-sm tabular-nums">
											{formatIDRCurrency(String(m.revenue))}
										</span>
									</div>
									<div className="h-1.5 w-full bg-muted">
										<div
											className="h-full bg-foreground"
											style={{ width: `${m.share * 100}%` }}
										/>
									</div>
									<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
										<span>{`${m.orders} orders`}</span>
										<span>{PAYMENT_RATIO_FORMATTER.format(m.share)}</span>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default PaymentsPanel;
