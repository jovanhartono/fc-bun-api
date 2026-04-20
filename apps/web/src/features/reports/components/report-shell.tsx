import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type DatePreset,
	getPresets,
	matchPreset,
} from "@/features/reports/utils/report-filters";
import { storesQueryOptions } from "@/lib/query-options";
import { cn } from "@/lib/utils";

export interface ReportTab {
	id: string;
	label: string;
}

interface ReportShellProps {
	tabs: ReportTab[];
	activeTab: string;
	onTabChange: (tab: string) => void;
	from: string;
	to: string;
	onRangeChange: (range: { from: string; to: string }) => void;
	storeId?: number;
	onStoreChange: (storeId: number | undefined) => void;
	showRangeFilters?: boolean;
	action?: ReactNode;
	children: ReactNode;
}

export const ReportShell = ({
	tabs,
	activeTab,
	onTabChange,
	from,
	to,
	onRangeChange,
	storeId,
	onStoreChange,
	showRangeFilters = true,
	action,
	children,
}: ReportShellProps) => {
	const presets = getPresets();
	const storesQuery = useQuery(storesQueryOptions());
	const stores = storesQuery.data ?? [];
	const activePreset = matchPreset(presets, from, to);

	const panelId = `reports-panel-${activeTab}`;

	return (
		<div className="grid gap-6">
			<nav aria-label="Reports" className="border-border/70 border-b">
				<div role="tablist" className="flex flex-wrap gap-1">
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id;
						return (
							<button
								type="button"
								key={tab.id}
								id={`reports-tab-${tab.id}`}
								role="tab"
								aria-selected={isActive}
								aria-controls={`reports-panel-${tab.id}`}
								tabIndex={isActive ? 0 : -1}
								onClick={() => onTabChange(tab.id)}
								className={cn(
									"-mb-px px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em]",
									"border-b-2",
									isActive
										? "border-foreground text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</nav>

			<div className="flex flex-wrap items-end gap-3">
				{showRangeFilters && (
					<>
						<div className="grid gap-1">
							<span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
								Preset
							</span>
							<div className="flex flex-wrap gap-1">
								{presets.map((preset) => (
									<button
										type="button"
										key={preset.id}
										onClick={() =>
											onRangeChange({ from: preset.from, to: preset.to })
										}
										className={cn(
											"border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em]",
											activePreset === (preset.id as DatePreset)
												? "border-foreground bg-foreground text-background"
												: "border-border/70 text-muted-foreground hover:text-foreground",
										)}
									>
										{preset.label}
									</button>
								))}
							</div>
						</div>
						<div className="grid gap-1">
							<span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
								Range
							</span>
							<DateRangePicker
								from={from}
								to={to}
								commitOnComplete
								onChange={(next) => {
									if (next.from && next.to) {
										onRangeChange({ from: next.from, to: next.to });
									}
								}}
							/>
						</div>
					</>
				)}
				<div className="grid gap-1">
					<span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
						Store
					</span>
					<Select
						value={storeId !== undefined ? String(storeId) : "all"}
						onValueChange={(value) =>
							onStoreChange(
								!value || value === "all" ? undefined : Number(value),
							)
						}
					>
						<SelectTrigger size="md" className="min-w-48">
							<SelectValue placeholder="All stores" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All stores</SelectItem>
							{stores.map((store) => (
								<SelectItem key={store.id} value={String(store.id)}>
									{store.code} · {store.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{action && <div className="ml-auto">{action}</div>}
			</div>

			<div
				id={panelId}
				role="tabpanel"
				aria-labelledby={`reports-tab-${activeTab}`}
			>
				{children}
			</div>
		</div>
	);
};

interface ExportButtonProps {
	disabled?: boolean;
	onClick: () => void;
}

export const ExportButton = ({ disabled, onClick }: ExportButtonProps) => {
	return (
		<Button
			type="button"
			variant="outline"
			disabled={disabled}
			onClick={onClick}
		>
			Export CSV
		</Button>
	);
};
