import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Sankey,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { ExportButton } from "@/features/reports/components/export-button";
import {
	csvFilename,
	downloadCsv,
	escapeCsv,
} from "@/features/reports/utils/csv";
import { percentFormatter } from "@/features/reports/utils/format";
import {
	bucketToLabel,
	bucketToTooltipLabel,
} from "@/features/reports/utils/granularity";
import type { FinancialReport, KpiDelta, ReportGranularity } from "@/lib/api";
import { financialQueryOptions } from "@/lib/query-options";
import { cn } from "@/lib/utils";
import { formatIDRCurrency } from "@/shared/utils";

interface FinancialPanelProps {
	from: string;
	to: string;
	storeId?: number;
	granularity?: ReportGranularity;
}

type SummaryCurrent = FinancialReport["summary"]["current"];
type FinancialBucket = FinancialReport["series"][number];

const TONE_BY_SIGN = {
	"-1": {
		tone: "text-destructive",
		stripe: "bg-destructive",
		Icon: ArrowDownIcon,
	},
	"0": {
		tone: "text-muted-foreground",
		stripe: "bg-muted-foreground/40",
		Icon: MinusIcon,
	},
	"1": {
		tone: "text-success",
		stripe: "bg-success",
		Icon: ArrowUpIcon,
	},
} as const;

const NEUTRAL_TONE = {
	tone: "text-muted-foreground",
	stripe: "bg-muted-foreground/40",
	Icon: MinusIcon,
} as const;

const toneForPct = (pct: number | null | undefined, invert = false) => {
	if (pct === null || pct === undefined) {
		return NEUTRAL_TONE;
	}
	const directional = invert ? -pct : pct;
	return TONE_BY_SIGN[Math.sign(directional).toString() as "-1" | "0" | "1"];
};

const formatDeltaPct = (pct: number | null | undefined): string => {
	if (pct === null || pct === undefined) {
		return "—";
	}
	const sign = pct > 0 ? "+" : "";
	return `${sign}${(pct * 100).toFixed(1)}%`;
};

const formatIDRShort = (v: number): string => {
	const abs = Math.abs(v);
	const sign = v < 0 ? "-" : "";
	if (abs >= 1_000_000_000) {
		return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}B`;
	}
	if (abs >= 1_000_000) {
		return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}M`;
	}
	if (abs >= 1_000) {
		return `${sign}Rp ${(abs / 1_000).toFixed(0)}k`;
	}
	return `${sign}Rp ${abs.toFixed(0)}`;
};

const formatAxisShort = (v: number): string => {
	const abs = Math.abs(v);
	const sign = v < 0 ? "-" : "";
	if (abs >= 1_000_000_000) {
		return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
	}
	if (abs >= 1_000_000) {
		return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
	}
	if (abs >= 1_000) {
		return `${sign}${(abs / 1_000).toFixed(0)}k`;
	}
	return `${sign}${abs.toFixed(0)}`;
};

const formatPreviousRangeLabel = (from: string, to: string): string => {
	const f = dayjs(from);
	const t = dayjs(to);
	if (f.month() === t.month() && f.year() === t.year()) {
		return `${f.format("MMM D")}-${t.format("D")}`;
	}
	return `${f.format("MMM D")}-${t.format("MMM D")}`;
};

export const FinancialPanel = ({
	from,
	to,
	storeId,
	granularity,
}: FinancialPanelProps) => {
	const query = useQuery(
		financialQueryOptions({ from, to, store_id: storeId, granularity }),
	);
	const data = query.data;
	const summary = data?.summary.current;
	const storeBreakdown = data?.store_breakdown ?? [];
	const storeMax = storeBreakdown.reduce((m, r) => Math.max(m, r.revenue), 0);

	const handleExport = () => {
		if (!data) {
			return;
		}
		const lines: string[] = [];
		const prev = data.summary.previous;
		lines.push("Financial totals,Metric,Current,Previous");
		lines.push(
			`Totals,Gross revenue,${summary?.gross_revenue ?? 0},${prev.gross_revenue}`,
		);
		lines.push(
			`Totals,Services,${summary?.services_total ?? 0},${prev.services_total}`,
		);
		lines.push(
			`Totals,Products,${summary?.products_total ?? 0},${prev.products_total}`,
		);
		lines.push(`Totals,Discount,${summary?.discount ?? 0},${prev.discount}`);
		lines.push(
			`Totals,Net revenue,${summary?.net_revenue ?? 0},${prev.net_revenue}`,
		);
		lines.push(`Totals,COGS,${summary?.cogs ?? 0},${prev.cogs}`);
		lines.push(
			`Totals,Gross profit,${summary?.gross_profit ?? 0},${prev.gross_profit}`,
		);
		lines.push(`Totals,Refunds,${summary?.refunds ?? 0},${prev.refunds}`);
		lines.push(
			`Totals,Net income,${summary?.net_income ?? 0},${prev.net_income}`,
		);
		lines.push(
			`Totals,Net margin,${summary?.net_margin ?? 0},${prev.net_margin}`,
		);
		lines.push("");
		lines.push(
			"Financial series,Bucket,Services,Products,Gross,Discount,Net revenue,COGS,Gross profit,Refunds,Net income",
		);
		for (const row of data.series) {
			lines.push(
				`Series,${escapeCsv(row.bucket)},${row.services},${row.products},${row.gross_revenue},${row.discount},${row.net_revenue},${row.cogs},${row.gross_profit},${row.refunds},${row.net_income}`,
			);
		}
		lines.push("");
		const matrix = data.store_category_matrix;
		lines.push(
			"Branch × Category,Store code,Store name,Category,Revenue,Share within branch,Branch total",
		);
		for (const row of matrix.rows) {
			for (const cell of row.cells) {
				const col = matrix.columns.find(
					(c) => c.category_id === cell.category_id,
				);
				lines.push(
					`Branch×Category,${escapeCsv(row.store_code)},${escapeCsv(row.store_name)},${escapeCsv(col?.label ?? "")},${cell.revenue},${cell.share},${row.total}`,
				);
			}
		}
		lines.push("");
		lines.push("Branch revenue,Store code,Store name,Revenue,Orders,Share");
		for (const row of storeBreakdown) {
			lines.push(
				`Branch,${escapeCsv(row.store_code)},${escapeCsv(row.store_name)},${row.revenue},${row.orders},${row.share}`,
			);
		}
		downloadCsv(
			csvFilename("financial", data.from, data.to, data.store_id),
			lines.join("\n"),
		);
	};

	return (
		<div className="grid gap-6">
			<RevenueBreakdownCard
				data={data}
				exportDisabled={!data}
				onExport={handleExport}
			/>
			<BranchCategoryMatrix data={data} />
			<BranchList rows={storeBreakdown} max={storeMax} />
		</div>
	);
};

interface RevenueBreakdownCardProps {
	data: FinancialReport | undefined;
	exportDisabled: boolean;
	onExport: () => void;
}

const RevenueBreakdownCard = ({
	data,
	exportDisabled,
	onExport,
}: RevenueBreakdownCardProps) => {
	const summary = data?.summary.current;
	const previous = data?.summary.previous;
	const deltas = data?.summary.deltas;
	const heroPct = deltas?.net_revenue?.delta_pct;
	const heroTone = toneForPct(heroPct);
	const HeroIcon = heroTone.Icon;
	const previousLabel = data
		? formatPreviousRangeLabel(data.previous.from, data.previous.to)
		: "";

	return (
		<Card className="border-border/70">
			<CardContent className="grid gap-6 p-5 sm:p-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="grid min-w-0 gap-1.5">
						<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
							Net revenue
						</p>
						<p className="break-all font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
							{formatIDRCurrency(String(summary?.net_revenue ?? 0))}
						</p>
						<p
							className={cn(
								"flex flex-wrap items-center gap-1.5 font-mono text-xs tabular-nums",
								heroTone.tone,
							)}
						>
							<HeroIcon className="size-3" weight="bold" />
							<span className="font-medium">{formatDeltaPct(heroPct)}</span>
							{previous ? (
								<span className="text-muted-foreground">
									{`vs ${formatIDRCurrency(String(previous.net_revenue))} (${previousLabel})`}
								</span>
							) : null}
						</p>
						<p className="text-[11px] text-muted-foreground">
							Gross − discount
						</p>
					</div>
					<ExportButton disabled={exportDisabled} onClick={onExport} />
				</div>

				<RevenueLineChart
					series={data?.series ?? []}
					granularity={data?.granularity ?? "day"}
				/>

				<StatStrip
					sectionLabel="── REVENUE TRAJECTORY ──"
					cells={[
						{
							label: "Gross",
							value: summary?.gross_revenue ?? 0,
							delta: deltas?.gross_revenue,
						},
						{
							label: "Net revenue",
							value: summary?.net_revenue ?? 0,
							delta: deltas?.net_revenue,
						},
						{
							label: "Net income",
							value: summary?.net_income ?? 0,
							delta: deltas?.net_income,
						},
					]}
				/>

				<SankeyFlow summary={summary} />

				<StatStrip
					sectionLabel="── DEDUCTIONS & MARGIN ──"
					cells={[
						{
							label: "Discount",
							value: summary?.discount ?? 0,
							delta: deltas?.discount,
							invertDelta: true,
						},
						{
							label: "COGS",
							value: summary?.cogs ?? 0,
							delta: deltas?.cogs,
							invertDelta: true,
						},
						{
							label: "Refunds",
							value: summary?.refunds ?? 0,
							delta: deltas?.refunds,
							invertDelta: true,
						},
						{
							label: "Net margin",
							value: summary?.net_margin ?? 0,
							delta: deltas?.net_margin,
							isPercent: true,
						},
					]}
				/>
			</CardContent>
		</Card>
	);
};

const GROSS_COLOR = "#94A3B8";
const NET_REVENUE_COLOR = "#3B82F6";
const NET_INCOME_COLOR = "#22C55E";

const LINE_CHART_CONFIG: ChartConfig = {
	gross_revenue: { label: "Gross", color: GROSS_COLOR },
	net_revenue: { label: "Net revenue", color: NET_REVENUE_COLOR },
	net_income: { label: "Net income", color: NET_INCOME_COLOR },
};

interface RevenueLineChartProps {
	series: FinancialBucket[];
	granularity: ReportGranularity;
}

const RevenueLineChart = ({ series, granularity }: RevenueLineChartProps) => {
	const isEmpty =
		series.length === 0 ||
		series.every(
			(row) =>
				row.gross_revenue === 0 &&
				row.net_revenue === 0 &&
				row.net_income === 0,
		);
	if (isEmpty) {
		return (
			<div className="flex h-[240px] items-center justify-center border border-border/40 text-sm text-muted-foreground">
				No revenue in range.
			</div>
		);
	}
	return (
		<div className="grid gap-2">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<span
						className="h-0.5 w-3"
						style={{ backgroundColor: GROSS_COLOR, opacity: 0.6 }}
					/>
					Gross
				</span>
				<span className="flex items-center gap-1.5">
					<span
						className="h-0.5 w-3"
						style={{ backgroundColor: NET_REVENUE_COLOR }}
					/>
					Net revenue
				</span>
				<span className="flex items-center gap-1.5">
					<span
						className="h-0.5 w-3"
						style={{ backgroundColor: NET_INCOME_COLOR }}
					/>
					Net income
				</span>
			</div>
			<ChartContainer
				className="aspect-auto w-full"
				config={LINE_CHART_CONFIG}
				style={{ height: 240 }}
			>
				<LineChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
					<CartesianGrid vertical={false} strokeDasharray="3 3" />
					<XAxis
						axisLine={false}
						dataKey="bucket"
						minTickGap={24}
						tickFormatter={(value: string) => bucketToLabel(value, granularity)}
						tickLine={false}
						tickMargin={8}
					/>
					<YAxis
						axisLine={false}
						tickFormatter={(v: number) => formatAxisShort(v)}
						tickLine={false}
						tickMargin={8}
						width={56}
					/>
					<ChartTooltip
						content={
							<ChartTooltipContent
								formatter={(value, name) => (
									<div className="flex flex-1 items-center justify-between gap-3">
										<span className="text-muted-foreground">
											{LINE_CHART_CONFIG[name as string]?.label ?? name}
										</span>
										<span className="font-mono font-medium text-foreground tabular-nums">
											{formatIDRCurrency(String(Number(value)))}
										</span>
									</div>
								)}
								labelFormatter={(value) =>
									bucketToTooltipLabel(value as string, granularity)
								}
							/>
						}
						cursor={false}
					/>
					<Line
						dataKey="gross_revenue"
						dot={false}
						stroke={GROSS_COLOR}
						strokeOpacity={0.6}
						strokeWidth={1.5}
						type="monotone"
					/>
					<Line
						dataKey="net_revenue"
						dot={false}
						stroke={NET_REVENUE_COLOR}
						strokeWidth={1.75}
						type="monotone"
					/>
					<Line
						dataKey="net_income"
						dot={false}
						stroke={NET_INCOME_COLOR}
						strokeWidth={2}
						type="monotone"
					/>
				</LineChart>
			</ChartContainer>
		</div>
	);
};

interface SankeyNodeDatum {
	name: string;
	opacity: number;
	displayValue: number;
}

interface SankeyFlowProps {
	summary: SummaryCurrent | undefined;
}

const SankeyFlow = ({ summary }: SankeyFlowProps) => {
	const sectionLabel = (
		<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
			── FLOW ──
		</p>
	);

	if (!summary || summary.gross_revenue <= 0) {
		return (
			<div className="grid gap-2">
				{sectionLabel}
				<div className="flex h-[240px] items-center justify-center border border-border/40 text-sm text-muted-foreground">
					No revenue to flow.
				</div>
			</div>
		);
	}

	const netIncomePositive = Math.max(summary.net_income, 0);
	const nodes: SankeyNodeDatum[] = [
		{
			name: "Gross revenue",
			opacity: 0.45,
			displayValue: summary.gross_revenue,
		},
		{ name: "Discount", opacity: 0.3, displayValue: summary.discount },
		{ name: "Net revenue", opacity: 0.7, displayValue: summary.net_revenue },
		{ name: "COGS", opacity: 0.3, displayValue: summary.cogs },
		{ name: "Refunds", opacity: 0.3, displayValue: summary.refunds },
		{ name: "Net income", opacity: 1, displayValue: netIncomePositive },
	];

	const linkCandidates = [
		{ source: 0, target: 1, value: summary.discount },
		{ source: 0, target: 2, value: summary.net_revenue },
		{ source: 2, target: 3, value: summary.cogs },
		{ source: 2, target: 4, value: summary.refunds },
		{ source: 2, target: 5, value: netIncomePositive },
	];
	const links = linkCandidates.filter((l) => l.value > 0);

	if (links.length === 0) {
		return (
			<div className="grid gap-2">
				{sectionLabel}
				<div className="flex h-[240px] items-center justify-center border border-border/40 text-sm text-muted-foreground">
					No revenue to flow.
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-2">
			{sectionLabel}
			<div className="w-full" style={{ height: 280 }}>
				<ResponsiveContainer height="100%" width="100%">
					<Sankey
						data={{ nodes, links }}
						link={{
							fillOpacity: 1,
							stroke: "var(--foreground)",
						}}
						margin={{ bottom: 8, left: 8, right: 110, top: 8 }}
						node={(props) => <SankeyNode {...props} />}
						nodePadding={28}
						nodeWidth={6}
					/>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

interface SankeyNodeRenderProps {
	x: number;
	y: number;
	width: number;
	height: number;
	payload: unknown;
}

const SankeyNode = ({
	x,
	y,
	width,
	height,
	payload,
}: SankeyNodeRenderProps) => {
	const datum = payload as SankeyNodeDatum;
	const labelX = x + width + 6;
	const labelY = y + height / 2;
	return (
		<g>
			<rect
				fill="var(--foreground)"
				fillOpacity={datum.opacity}
				height={height}
				width={width}
				x={x}
				y={y}
			/>
			<text fontSize={10} x={labelX} y={labelY - 1}>
				<tspan
					fill="var(--muted-foreground)"
					fontFamily="ui-monospace, SFMono-Regular, monospace"
				>
					{datum.name}
				</tspan>
			</text>
			<text fontSize={10} fontWeight={600} x={labelX} y={labelY + 11}>
				<tspan
					fill="var(--foreground)"
					fontFamily="ui-monospace, SFMono-Regular, monospace"
				>
					{formatIDRShort(datum.displayValue)}
				</tspan>
			</text>
		</g>
	);
};

interface StatCell {
	label: string;
	value: number;
	delta?: Pick<KpiDelta, "delta_pct"> | null;
	invertDelta?: boolean;
	isPercent?: boolean;
}

interface StatStripProps {
	sectionLabel: string;
	cells: StatCell[];
}

const StatStrip = ({ sectionLabel, cells }: StatStripProps) => (
	<div className="grid gap-3">
		<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
			{sectionLabel}
		</p>
		<div
			className={cn(
				"grid grid-cols-2",
				cells.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4",
			)}
		>
			{cells.map((cell, idx) => {
				const pct = cell.delta?.delta_pct;
				const tone = toneForPct(pct, cell.invertDelta);
				const Icon = tone.Icon;
				return (
					<div
						className={cn(
							"grid gap-1 px-3 py-2 sm:px-4",
							idx > 0 && "lg:border-l lg:border-border/40",
						)}
						key={cell.label}
					>
						<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
							{cell.label}
						</p>
						<p className="break-all font-mono text-sm font-semibold tabular-nums">
							{cell.isPercent
								? percentFormatter.format(cell.value)
								: formatIDRCurrency(String(cell.value))}
						</p>
						<p
							className={cn(
								"flex items-center gap-1 font-mono text-[11px] tabular-nums",
								tone.tone,
							)}
						>
							{pct === null || pct === undefined ? null : (
								<Icon className="size-2.5" weight="bold" />
							)}
							{formatDeltaPct(pct)}
						</p>
					</div>
				);
			})}
		</div>
	</div>
);

type StoreCategoryMatrix = FinancialReport["store_category_matrix"];
type MatrixColumn = StoreCategoryMatrix["columns"][number];
type MatrixRow = StoreCategoryMatrix["rows"][number];

interface BranchCategoryMatrixProps {
	data: FinancialReport | undefined;
}

const BranchCategoryMatrix = ({ data }: BranchCategoryMatrixProps) => {
	const matrix = data?.store_category_matrix;
	const columns = matrix?.columns ?? [];
	const rows = matrix?.rows ?? [];
	const omittedStores = matrix?.omitted_stores ?? 0;

	const grandTotal = rows.reduce((s, r) => s + r.total, 0);
	const columnTotals = columns.map((col) =>
		rows.reduce((s, r) => {
			const cell = r.cells.find((c) => c.category_id === col.category_id);
			return s + (cell?.revenue ?? 0);
		}, 0),
	);

	const isEmpty = rows.length === 0 || grandTotal === 0;

	return (
		<Card className="border-border/70">
			<CardContent className="grid gap-3 p-5 sm:p-6">
				<div className="grid gap-1">
					<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						Branch × Category
					</p>
					<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
						{`// share within branch · top ${columns.length} categor${columns.length === 1 ? "y" : "ies"}`}
					</p>
				</div>

				{isEmpty ? (
					<p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
						{"// no category revenue in range"}
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-separate border-spacing-0 font-mono text-[11px] tabular-nums">
							<thead>
								<tr>
									<th
										className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
										scope="col"
									>
										Branch
									</th>
									{columns.map((col) => (
										<MatrixHeaderCell column={col} key={col.category_id} />
									))}
									<th
										className="border-l border-border/40 px-2 py-1.5 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
										scope="col"
									>
										Total
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => (
									<MatrixBranchRow
										columns={columns}
										grandTotal={grandTotal}
										key={row.store_id}
										row={row}
									/>
								))}
							</tbody>
							<tfoot>
								<tr>
									<th
										className="sticky left-0 z-10 border-t border-border/40 bg-card px-2 py-2 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
										scope="row"
									>
										Total
									</th>
									{columns.map((col, idx) => (
										<td
											className="border-t border-border/40 px-2 py-2 text-center text-muted-foreground"
											key={col.category_id}
										>
											{formatIDRShort(columnTotals[idx] ?? 0)}
										</td>
									))}
									<td className="border-l border-t border-border/40 px-2 py-2 text-right font-semibold">
										{formatIDRShort(grandTotal)}
									</td>
								</tr>
							</tfoot>
						</table>
					</div>
				)}

				{omittedStores > 0 ? (
					<p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
						{`(+${omittedStores} branch${omittedStores === 1 ? "" : "es"} not shown)`}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
};

interface MatrixHeaderCellProps {
	column: MatrixColumn;
}

const MatrixHeaderCell = ({ column }: MatrixHeaderCellProps) => (
	<th
		className="px-2 py-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
		scope="col"
		title={column.label}
	>
		<span className="block max-w-[88px] truncate">{column.label}</span>
	</th>
);

interface MatrixBranchRowProps {
	row: MatrixRow;
	columns: MatrixColumn[];
	grandTotal: number;
}

const MatrixBranchRow = ({
	row,
	columns,
	grandTotal,
}: MatrixBranchRowProps) => (
	<tr className="group">
		<th
			className="sticky left-0 z-10 border-t border-border/40 bg-card px-2 py-2 text-left align-top group-hover:bg-muted/40"
			scope="row"
		>
			<span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
				{row.store_code}
			</span>
			<span className="block max-w-[140px] truncate text-foreground">
				{row.store_name}
			</span>
		</th>
		{columns.map((col) => {
			const cell = row.cells.find((c) => c.category_id === col.category_id);
			return (
				<MatrixCell
					branchTotal={row.total}
					cellRevenue={cell?.revenue ?? 0}
					cellShare={cell?.share ?? 0}
					columnLabel={col.label}
					grandTotal={grandTotal}
					key={col.category_id}
					storeCode={row.store_code}
					storeName={row.store_name}
				/>
			);
		})}
		<td className="border-l border-t border-border/40 px-2 py-2 text-right font-semibold group-hover:bg-muted/40">
			{formatIDRShort(row.total)}
		</td>
	</tr>
);

interface MatrixCellProps {
	cellShare: number;
	cellRevenue: number;
	branchTotal: number;
	grandTotal: number;
	columnLabel: string;
	storeCode: string;
	storeName: string;
}

const MatrixCell = ({
	cellShare,
	cellRevenue,
	branchTotal,
	grandTotal,
	columnLabel,
	storeCode,
	storeName,
}: MatrixCellProps) => {
	const opacity = cellRevenue === 0 ? 0 : Math.max(0.05, cellShare ** 0.7);
	const isInverted = opacity > 0.5;
	const branchSharePct = branchTotal > 0 ? cellShare * 100 : 0;
	const grandSharePct = grandTotal > 0 ? (cellRevenue / grandTotal) * 100 : 0;
	const tooltip = `${storeCode} ${storeName} · ${columnLabel}\nRp ${cellRevenue.toLocaleString("id-ID")} · ${branchSharePct.toFixed(1)}% of branch · ${grandSharePct.toFixed(1)}% of total`;

	return (
		<td
			className="relative border-t border-border/40 px-2 py-2 text-center align-middle"
			title={tooltip}
		>
			<div
				aria-hidden
				className="absolute inset-0"
				style={{ backgroundColor: "var(--foreground)", opacity }}
			/>
			<span
				className={cn(
					"relative",
					isInverted ? "text-background" : "text-foreground",
					cellRevenue === 0 && "text-muted-foreground",
				)}
			>
				{cellRevenue === 0 ? "·" : `${Math.round(cellShare * 100)}%`}
			</span>
		</td>
	);
};

type BranchRow = FinancialReport["store_breakdown"][number];

interface BranchListProps {
	rows: BranchRow[];
	max: number;
}

const BranchList = ({ rows, max }: BranchListProps) => {
	if (rows.length === 0) {
		return null;
	}
	return (
		<Card className="border-border/70">
			<CardContent className="grid gap-4 p-5 sm:p-6">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					Branch leaderboard
				</p>
				<div className="grid gap-3">
					{rows.map((row) => {
						const widthPct = max === 0 ? 0 : (row.revenue / max) * 100;
						return (
							<div className="grid gap-1" key={row.store_id}>
								<div className="flex items-center justify-between gap-2">
									<span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
										<span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
											{row.store_code}
										</span>
										<span className="truncate">{row.store_name}</span>
									</span>
									<span className="font-mono text-sm tabular-nums">
										{formatIDRCurrency(String(row.revenue))}
									</span>
								</div>
								<div className="h-1.5 w-full bg-muted">
									<div
										className="h-full bg-foreground"
										style={{ width: `${widthPct}%` }}
									/>
								</div>
								<div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
									<span>{`${row.orders} orders`}</span>
									<span>{percentFormatter.format(row.share)}</span>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
};

export default FinancialPanel;
