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
import { revenueTrendQueryOptions } from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";

interface RevenuePanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const CATEGORY_PALETTE = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];
const OTHER_COLOR = "var(--muted-foreground)";

export const RevenuePanel = ({ from, to, storeId }: RevenuePanelProps) => {
	const query = useQuery(
		revenueTrendQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = [];
		lines.push("Revenue trend,Bucket,Services,Products");
		for (const row of data.series) {
			lines.push(
				`Revenue trend,${escapeCsv(row.bucket)},${row.services},${row.products}`,
			);
		}
		lines.push("");
		lines.push(
			`Category trend,Bucket,${data.category_keys.map((k) => escapeCsv(k.label)).join(",")}`,
		);
		for (const row of data.category_series) {
			lines.push(
				`Category trend,${escapeCsv(row.bucket as string)},${data.category_keys
					.map((k) => row[k.key] ?? 0)
					.join(",")}`,
			);
		}
		downloadCsv(
			csvFilename("revenue-trend", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	const categorySeries = (data?.category_keys ?? []).map((c, idx) => ({
		key: c.key,
		label: c.label,
		color:
			c.key === "cat_other"
				? OTHER_COLOR
				: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
	}));

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Total revenue"
						value={formatIDRCurrency(String(data?.summary.grand_total ?? 0))}
						helper="Services + products (paid)"
					/>
					<KpiTile
						label="Services"
						value={formatIDRCurrency(String(data?.summary.services_total ?? 0))}
					/>
					<KpiTile
						label="Products"
						value={formatIDRCurrency(String(data?.summary.products_total ?? 0))}
					/>
					<KpiTile
						label="Granularity"
						value={data?.granularity ?? "—"}
						helper="Auto-picked from range"
					/>
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<AreaChartCard
				title="Revenue · services vs products"
				description="Stacked revenue from paid orders."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				stacked
				series={[
					{ key: "services", label: "Services", color: "var(--chart-1)" },
					{ key: "products", label: "Products", color: "var(--chart-2)" },
				]}
				valueFormatter={(v) => formatIDRCurrency(String(v))}
			/>

			<AreaChartCard
				title="Service revenue by category"
				description="Top 6 categories stacked; remainder grouped as Other."
				data={data?.category_series ?? []}
				granularity={data?.granularity ?? "day"}
				stacked
				series={categorySeries}
				valueFormatter={(v) => formatIDRCurrency(String(v))}
			/>
		</div>
	);
};

export default RevenuePanel;
