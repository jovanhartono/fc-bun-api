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
import { workerProductivityQueryOptions } from "@/lib/query-options";

interface WorkersPanelProps {
	from: string;
	to: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");

export const WorkersPanel = ({ from, to, storeId }: WorkersPanelProps) => {
	const query = useQuery(
		workerProductivityQueryOptions({ from, to, store_id: storeId }),
	);
	const data = query.data;
	const workers = data?.workers ?? [];
	const maxItems = workers.reduce((m, w) => Math.max(m, w.items_completed), 0);

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = [
			"Worker productivity,User ID,Name,Items completed,Refund items,Shift minutes,Items per hour",
		];
		for (const w of workers) {
			lines.push(
				`Worker productivity,${w.user_id},${escapeCsv(w.user_name)},${w.items_completed},${w.refund_items},${w.shift_minutes},${w.items_per_hour}`,
			);
		}
		downloadCsv(
			csvFilename("worker-productivity", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<div className="flex items-start justify-between gap-3">
				<ReportKpiRow>
					<KpiTile
						label="Workers"
						value={numberFormatter.format(data?.summary.worker_count ?? 0)}
						helper="Users with role worker"
					/>
					<KpiTile
						label="Items completed"
						value={numberFormatter.format(
							data?.summary.total_items_completed ?? 0,
						)}
						helper="Moved to ready_for_pickup"
					/>
					<KpiTile
						label="Refund items"
						value={numberFormatter.format(
							data?.summary.total_refund_items ?? 0,
						)}
						helper="Tied to worker in range"
					/>
					<KpiTile
						label="Avg items/hour"
						value={
							data && data.summary.total_items_completed > 0
								? (
										data.summary.total_items_completed /
										Math.max(
											1,
											workers.reduce((s, w) => s + w.shift_minutes / 60, 0),
										)
									).toFixed(2)
								: "0.00"
						}
					/>
				</ReportKpiRow>
				<ExportButton disabled={!data} onClick={handleExport} />
			</div>

			<Card className="border-border/70">
				<CardHeader>
					<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						Worker leaderboard
					</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{workers.length === 0 ? (
						<p className="text-sm text-muted-foreground">No worker activity.</p>
					) : (
						<div className="grid gap-3">
							{workers.map((w) => {
								const pct =
									maxItems === 0 ? 0 : (w.items_completed / maxItems) * 100;
								const hours = w.shift_minutes / 60;
								return (
									<div key={w.user_id} className="grid gap-1">
										<div className="flex items-center justify-between gap-2">
											<span className="truncate text-sm font-medium">
												{w.user_name}
											</span>
											<span className="font-mono text-sm tabular-nums">
												{`${numberFormatter.format(w.items_completed)} items`}
											</span>
										</div>
										<div className="h-1.5 w-full bg-muted">
											<div
												className="h-full bg-foreground"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
											<span>{`${hours.toFixed(1)}h worked`}</span>
											<span>{`${w.items_per_hour} items/hr`}</span>
											<span>{`${w.refund_items} refunded`}</span>
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

export default WorkersPanel;
