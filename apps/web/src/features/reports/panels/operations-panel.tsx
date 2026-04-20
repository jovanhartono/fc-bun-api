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
import { ordersFlowQueryOptions } from "@/lib/query-options";

interface OperationsPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");

export const OperationsPanel = ({
	from,
	to,
	storeId,
}: OperationsPanelProps) => {
	const query = useQuery(
		ordersFlowQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = ["Orders flow,Bucket,Orders in,Orders out"];
		for (const row of data.series) {
			lines.push(
				`Orders flow,${escapeCsv(row.bucket)},${row.orders_in},${row.orders_out}`,
			);
		}
		downloadCsv(
			csvFilename("orders-flow", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Orders in"
						value={numberFormatter.format(data?.summary.orders_in_total ?? 0)}
						helper="Dropped off in range"
					/>
					<KpiTile
						label="Orders out"
						value={numberFormatter.format(data?.summary.orders_out_total ?? 0)}
						helper="Picked up in range"
					/>
					<KpiTile
						label="Net flow"
						value={numberFormatter.format(data?.summary.net_flow ?? 0)}
						helper="Positive = backlog growing"
					/>
					<KpiTile label="Granularity" value={data?.granularity ?? "—"} />
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<AreaChartCard
				title="Order dropoff vs pickup"
				description="Throughput over the selected range."
				data={data?.series ?? []}
				granularity={data?.granularity ?? "day"}
				series={[
					{ key: "orders_in", label: "Orders in", color: "var(--chart-1)" },
					{ key: "orders_out", label: "Orders out", color: "var(--chart-2)" },
				]}
				valueFormatter={(v) => numberFormatter.format(v)}
			/>
		</div>
	);
};

export default OperationsPanel;
