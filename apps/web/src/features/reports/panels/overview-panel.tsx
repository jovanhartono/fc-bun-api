import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChartCard } from "@/features/reports/components/area-chart-card";
import {
	KpiTile,
	ReportKpiRow,
} from "@/features/reports/components/report-kpi-row";
import type { ReportOverview } from "@/lib/api";
import { reportOverviewQueryOptions } from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";

interface OverviewPanelProps {
	date: string;
	storeId?: number;
}

const numberFormatter = new Intl.NumberFormat("en-ID");
const currencyCompact = new Intl.NumberFormat("en-ID", {
	notation: "compact",
	compactDisplay: "short",
	maximumFractionDigits: 1,
});

const CategoryBars = ({
	categories,
}: {
	categories: ReportOverview["categories"];
}) => {
	const max = categories.reduce((m, row) => Math.max(m, row.revenue), 0);
	if (categories.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">No service lines today.</p>
		);
	}
	return (
		<div className="grid gap-2">
			{categories.map((row) => {
				const pct = max === 0 ? 0 : (row.revenue / max) * 100;
				return (
					<div key={row.category_id} className="grid gap-1">
						<div className="flex items-center justify-between gap-2">
							<span className="truncate text-sm font-medium">
								{row.category_name}
							</span>
							<span className="font-mono text-sm tabular-nums">
								{formatIDRCurrency(String(row.revenue))}
							</span>
						</div>
						<div className="h-1.5 w-full bg-muted">
							<div
								className="h-full bg-foreground"
								style={{ width: `${pct}%` }}
							/>
						</div>
						<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
							{`${numberFormatter.format(row.count)} lines`}
						</span>
					</div>
				);
			})}
		</div>
	);
};

const TopServicesList = ({
	services,
}: {
	services: ReportOverview["top_services"];
}) => {
	if (services.length === 0) {
		return <p className="text-sm text-muted-foreground">No services today.</p>;
	}
	return (
		<div className="grid gap-2">
			{services.map((row) => (
				<div
					key={row.service_id}
					className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-0"
				>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium">{row.service_name}</p>
						<p className="font-mono text-[11px] tabular-nums text-muted-foreground">
							{`${numberFormatter.format(row.count)} sold`}
						</p>
					</div>
					<p className="font-mono text-sm tabular-nums">
						{formatIDRCurrency(String(row.revenue))}
					</p>
				</div>
			))}
		</div>
	);
};

const PerStoreGrid = ({
	perStore,
}: {
	perStore: ReportOverview["per_store"];
}) => {
	const max = perStore.reduce((m, row) => Math.max(m, row.revenue), 0);
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{perStore.map((row) => {
				const pct = max === 0 ? 0 : (row.revenue / max) * 100;
				return (
					<Card key={row.store_id} className="border-border/70">
						<CardContent className="grid gap-2 p-4">
							<div className="flex items-center justify-between gap-2">
								<span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
									{row.store_code}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{row.store_name}
								</span>
							</div>
							<p className="font-mono text-lg font-semibold tabular-nums">
								{formatIDRCurrency(String(row.revenue))}
							</p>
							<div className="h-1.5 w-full bg-muted">
								<div
									className="h-full bg-foreground"
									style={{ width: `${pct}%` }}
								/>
							</div>
							<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
								<span>{`${row.orders_in} in`}</span>
								<span>{`${row.orders_out} out`}</span>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export const OverviewPanel = ({ date, storeId }: OverviewPanelProps) => {
	const overviewQuery = useQuery(
		reportOverviewQueryOptions({ date, store_id: storeId, trend_days: 14 }),
	);
	const overview = overviewQuery.data;

	const trendData = (overview?.trend ?? []).map((row) => ({
		bucket: row.date,
		orders_in: row.orders_in,
		orders_out: row.orders_out,
	}));

	return (
		<div className="grid gap-6">
			<div className="flex items-end justify-between gap-3">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					{`Snapshot · ${dayjs(date).format("MMM D, YYYY")}`}
				</p>
			</div>

			<ReportKpiRow>
				<KpiTile
					label="Revenue"
					value={formatIDRCurrency(String(overview?.daily.revenue ?? 0))}
					helper="Paid minus refunded"
				/>
				<KpiTile
					label="Items processed"
					value={numberFormatter.format(overview?.daily.items_processed ?? 0)}
					helper="Moved to QC or ready"
				/>
				<KpiTile
					label="Orders in"
					value={numberFormatter.format(overview?.daily.orders_in ?? 0)}
					helper="Created today"
				/>
				<KpiTile
					label="Orders out"
					value={numberFormatter.format(overview?.daily.orders_out ?? 0)}
					helper="Picked up today"
				/>
			</ReportKpiRow>

			<AreaChartCard
				title={`Orders in vs out · last ${overview?.trend_days ?? 14} days`}
				data={trendData}
				granularity="day"
				series={[
					{
						key: "orders_in",
						label: "Orders in",
						color: "var(--chart-1)",
					},
					{
						key: "orders_out",
						label: "Orders out",
						color: "var(--chart-2)",
					},
				]}
				valueFormatter={(v) => numberFormatter.format(v)}
			/>

			<div className="grid gap-3 xl:grid-cols-2">
				<Card className="border-border/70">
					<CardHeader>
						<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
							Revenue by category
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						<CategoryBars categories={overview?.categories ?? []} />
					</CardContent>
				</Card>
				<Card className="border-border/70">
					<CardHeader>
						<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
							Top services today
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						<TopServicesList services={overview?.top_services ?? []} />
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-3">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					Per store · today
				</p>
				<PerStoreGrid perStore={overview?.per_store ?? []} />
			</div>

			<p className="font-mono text-[11px] text-muted-foreground">
				{`Overview uses the latest date (${dayjs().format("MMM D, YYYY")}). Switch to other tabs for ranged reports.`}
				{` · ${currencyCompact.format(overview?.daily.revenue ?? 0)}`}
			</p>
		</div>
	);
};

export default OverviewPanel;
