import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiTileProps {
	label: string;
	value: ReactNode;
	helper?: ReactNode;
	className?: string;
}

export const KpiTile = ({ label, value, helper, className }: KpiTileProps) => {
	return (
		<Card className={cn("border-border/70", className)}>
			<CardContent className="grid gap-1 p-4">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</p>
				<p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
				{helper ? (
					<p className="text-muted-foreground text-xs">{helper}</p>
				) : null}
			</CardContent>
		</Card>
	);
};

interface ReportKpiRowProps {
	children: ReactNode;
}

export const ReportKpiRow = ({ children }: ReportKpiRowProps) => {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
	);
};
