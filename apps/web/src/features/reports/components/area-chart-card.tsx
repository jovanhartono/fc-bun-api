import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	bucketToLabel,
	bucketToTooltipLabel,
} from "@/features/reports/utils/granularity";
import type { ReportGranularity } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface AreaSeries {
	key: string;
	label: string;
	color: string;
}

interface AreaChartCardProps {
	title: string;
	description?: string;
	data: Array<Record<string, number | string>>;
	series: AreaSeries[];
	granularity: ReportGranularity;
	stacked?: boolean;
	valueFormatter?: (value: number) => string;
	className?: string;
	action?: ReactNode;
	emptyState?: ReactNode;
	height?: number;
}

export const AreaChartCard = ({
	title,
	description,
	data,
	series,
	granularity,
	stacked = false,
	valueFormatter,
	className,
	action,
	emptyState,
	height = 260,
}: AreaChartCardProps) => {
	const config = series.reduce<ChartConfig>((acc, s) => {
		acc[s.key] = { label: s.label, color: s.color };
		return acc;
	}, {});

	const isEmpty =
		data.length === 0 ||
		data.every((row) =>
			series.every((s) => {
				const value = row[s.key];
				return typeof value !== "number" || value === 0;
			}),
		);

	return (
		<Card className={cn("border-border/70", className)}>
			<CardHeader className="flex flex-row items-center justify-between gap-3">
				<div className="grid gap-1">
					<CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						{title}
					</CardTitle>
					{description ? (
						<p className="text-xs text-muted-foreground">{description}</p>
					) : null}
				</div>
				{action}
			</CardHeader>
			<CardContent className="p-4 pt-0">
				{isEmpty ? (
					(emptyState ?? (
						<div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
							No data in range.
						</div>
					))
				) : (
					<ChartContainer
						config={config}
						className="aspect-auto w-full"
						style={{ height }}
					>
						<AreaChart data={data} margin={{ left: 12, right: 12, top: 10 }}>
							<defs>
								{series.map((s) => (
									<linearGradient
										id={`fill-${s.key}`}
										key={s.key}
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="5%" stopColor={s.color} stopOpacity={0.7} />
										<stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
									</linearGradient>
								))}
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey="bucket"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								minTickGap={24}
								tickFormatter={(value: string) =>
									bucketToLabel(value, granularity)
								}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								width={60}
								tickFormatter={(value: number) =>
									valueFormatter
										? valueFormatter(value)
										: new Intl.NumberFormat("en-ID", {
												notation: "compact",
											}).format(value)
								}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={(value) =>
											bucketToTooltipLabel(value as string, granularity)
										}
										formatter={(value, name) => (
											<div className="flex flex-1 items-center justify-between gap-3">
												<span className="text-muted-foreground">
													{config[name as string]?.label ?? name}
												</span>
												<span className="font-mono font-medium text-foreground tabular-nums">
													{valueFormatter
														? valueFormatter(Number(value))
														: Number(value).toLocaleString("en-ID")}
												</span>
											</div>
										)}
									/>
								}
							/>
							{series.map((s) => (
								<Area
									key={s.key}
									dataKey={s.key}
									type="monotone"
									fill={`url(#fill-${s.key})`}
									fillOpacity={0.4}
									stroke={s.color}
									strokeWidth={2}
									stackId={stacked ? "stack" : undefined}
								/>
							))}
							{series.length > 1 ? (
								<ChartLegend content={<ChartLegendContent />} />
							) : null}
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
};
