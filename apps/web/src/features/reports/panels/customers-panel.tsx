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
import { customerAcquisitionQueryOptions } from "@/lib/query-options";

interface CustomersPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");
const percentFormatter = new Intl.NumberFormat("en-ID", {
	style: "percent",
	maximumFractionDigits: 1,
});

export const CustomersPanel = ({ from, to, storeId }: CustomersPanelProps) => {
	const query = useQuery(
		customerAcquisitionQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = ["Customers,Bucket,New,Cumulative"];
		for (const row of data.series) {
			lines.push(
				`Customers,${escapeCsv(row.bucket)},${row.new_customers},${row.cumulative}`,
			);
		}
		downloadCsv(
			csvFilename("customer-acquisition", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="New customers"
						value={numberFormatter.format(data?.summary.new_customers ?? 0)}
						helper="Registered in range"
					/>
					<KpiTile
						label="Cumulative total"
						value={numberFormatter.format(data?.summary.cumulative_end ?? 0)}
						helper="All-time, end of range"
					/>
					<KpiTile
						label="Active customers"
						value={numberFormatter.format(
							data?.summary.active_customers_in_range ?? 0,
						)}
						helper="Placed at least one order"
					/>
					<KpiTile
						label="Repeat rate"
						value={percentFormatter.format(data?.summary.repeat_rate ?? 0)}
						helper="Active with >1 order"
					/>
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<AreaChartCard
				title="New customers per bucket"
				description="Fresh sign-ups over the range."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				series={[
					{
						key: "new_customers",
						label: "New customers",
						color: "var(--chart-1)",
					},
				]}
				valueFormatter={(v) => numberFormatter.format(v)}
			/>

			<AreaChartCard
				title="Cumulative customer base"
				description="Running total from all time."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				series={[
					{
						key: "cumulative",
						label: "Cumulative",
						color: "var(--chart-3)",
					},
				]}
				valueFormatter={(v) => numberFormatter.format(v)}
			/>
		</div>
	);
};

export default CustomersPanel;
