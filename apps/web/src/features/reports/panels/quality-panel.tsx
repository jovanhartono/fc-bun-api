import { useQuery } from "@tanstack/react-query";
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
import { refundTrendQueryOptions } from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";

interface QualityPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");

const REASON_LABELS: Record<string, string> = {
	damaged: "Damaged",
	cannot_process: "Cannot process",
	lost: "Lost",
	other: "Other",
};

const REASON_COLORS: Record<string, string> = {
	damaged: "var(--chart-1)",
	cannot_process: "var(--chart-2)",
	lost: "var(--chart-3)",
	other: "var(--chart-4)",
};

export const QualityPanel = ({ from, to, storeId }: QualityPanelProps) => {
	const query = useQuery(
		refundTrendQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;

	const reasonSeries = (data?.reason_keys ?? []).map((r) => ({
		key: r.key,
		label: REASON_LABELS[r.key] ?? r.label,
		color: REASON_COLORS[r.key] ?? "var(--chart-5)",
	}));

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = ["Refund trend,Bucket,Amount,Refunds"];
		for (const row of data.series) {
			lines.push(
				`Refund trend,${escapeCsv(row.bucket)},${row.amount},${row.refunds}`,
			);
		}
		lines.push("");
		lines.push(
			`Refund reasons,Bucket,${reasonSeries.map((r) => escapeCsv(r.label)).join(",")}`,
		);
		for (const row of data.reason_series) {
			lines.push(
				`Refund reasons,${escapeCsv(row.bucket as string)},${reasonSeries.map((r) => row[r.key] ?? 0).join(",")}`,
			);
		}
		downloadCsv(
			csvFilename("refund-trend", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Refund amount"
						value={formatIDRCurrency(String(data?.summary.total_amount ?? 0))}
					/>
					<KpiTile
						label="Refund events"
						value={numberFormatter.format(data?.summary.total_refunds ?? 0)}
					/>
					<KpiTile
						label="Damaged items"
						value={numberFormatter.format(
							data?.summary.reason_totals.damaged.items ?? 0,
						)}
					/>
					<KpiTile
						label="Lost items"
						value={numberFormatter.format(
							data?.summary.reason_totals.lost.items ?? 0,
						)}
					/>
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<AreaChartCard
				title="Refund amount trend"
				description="Total refunded value over the range."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				series={[
					{ key: "amount", label: "Refund amount", color: "var(--chart-1)" },
				]}
				valueFormatter={(v) => formatIDRCurrency(String(v))}
			/>

			<AreaChartCard
				title="Refund reason breakdown"
				description="Amounts by reason, stacked."
				data={data?.reason_series ?? []}
				granularity={data?.granularity ?? "day"}
				stacked
				series={reasonSeries}
				valueFormatter={(v) => formatIDRCurrency(String(v))}
			/>
		</div>
	);
};

export default QualityPanel;
