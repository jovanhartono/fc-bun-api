import {
	CaretDownIcon,
	CaretUpDownIcon,
	CaretUpIcon,
} from "@phosphor-icons/react";
import {
	type Cell,
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type RowData,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type MobileCardSlot =
	| "title"
	| "eyebrow"
	| "badges"
	| "detail"
	| "footer"
	| "hidden";

interface MobileCardColumnOptions {
	slot?: MobileCardSlot;
	label?: string;
	className?: string;
	labelClassName?: string;
	valueClassName?: string;
}

declare module "@tanstack/react-table" {
	// biome-ignore lint/correctness/noUnusedVariables: TanStack declaration merging requires these generic names.
	interface ColumnMeta<TData extends RowData, TValue> {
		mobileCard?: MobileCardColumnOptions;
	}
}

interface DataTableProps<TData extends RowData> {
	columns: ColumnDef<TData, unknown>[];
	data: TData[];
	isLoading?: boolean;
	emptyMessage?: string;
	sortable?: boolean;
	cardPrimaryColumnId?: string;
	cardHiddenColumnIds?: string[];
}

function getColumnKey<TData extends RowData>(
	column: ColumnDef<TData, unknown>,
): string {
	if ("id" in column && column.id) {
		return column.id;
	}
	if ("accessorKey" in column && column.accessorKey) {
		return String(column.accessorKey);
	}
	return String(column.header ?? "column");
}

function getCellHeaderLabel<TData extends RowData>(
	cell: Cell<TData, unknown>,
): string {
	const mobileCard = cell.column.columnDef.meta?.mobileCard;
	const headerDef = cell.column.columnDef.header;

	if (mobileCard?.label) {
		return mobileCard.label;
	}

	return typeof headerDef === "string" ? headerDef : cell.column.id;
}

export const DataTable = <TData extends RowData>({
	columns,
	data,
	isLoading,
	emptyMessage = "No data found",
	sortable = false,
	cardPrimaryColumnId,
	cardHiddenColumnIds,
}: DataTableProps<TData>) => {
	const [sorting, setSorting] = useState<SortingState>([]);
	const isMobile = useIsMobile();

	const table = useReactTable({
		data,
		columns,
		state: sortable ? { sorting } : undefined,
		onSortingChange: sortable ? setSorting : undefined,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: sortable ? getSortedRowModel() : undefined,
	});

	const colSpan = Math.max(columns.length, 1);

	if (isMobile) {
		if (isLoading) {
			return (
				<div className="grid gap-2.5 md:hidden">
					{Array.from({ length: 3 }, (_, index) => (
						<div
							key={index}
							className="h-[8.5rem] animate-pulse rounded-md border border-border/80 bg-muted/40"
						/>
					))}
				</div>
			);
		}

		if (data.length === 0) {
			return (
				<div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center font-medium text-foreground text-sm md:hidden">
					{emptyMessage}
				</div>
			);
		}

		const titleColumn = columns.find(
			(column) => column.meta?.mobileCard?.slot === "title",
		);
		const primaryColumnKey =
			cardPrimaryColumnId ??
			(titleColumn
				? getColumnKey(titleColumn)
				: getColumnKey(columns[0] ?? ({} as ColumnDef<TData, unknown>)));
		const hiddenIds = new Set(cardHiddenColumnIds ?? []);

		return (
			<div className="grid gap-2.5 md:hidden">
				{table.getRowModel().rows.map((row) => {
					const visibleCells = row.getVisibleCells();
					const primaryCell = visibleCells.find(
						(cell) => cell.column.id === primaryColumnKey,
					);
					const usableCells = visibleCells.filter((cell) => {
						const slot = cell.column.columnDef.meta?.mobileCard?.slot;
						return (
							cell.column.id !== primaryColumnKey &&
							!hiddenIds.has(cell.column.id) &&
							slot !== "hidden"
						);
					});
					const eyebrowCells = usableCells.filter(
						(cell) =>
							cell.column.columnDef.meta?.mobileCard?.slot === "eyebrow",
					);
					const badgeCells = usableCells.filter(
						(cell) => cell.column.columnDef.meta?.mobileCard?.slot === "badges",
					);
					const footerCells = usableCells.filter(
						(cell) => cell.column.columnDef.meta?.mobileCard?.slot === "footer",
					);
					const detailCells = usableCells.filter((cell) => {
						const slot = cell.column.columnDef.meta?.mobileCard?.slot;
						return !slot || slot === "detail";
					});
					const primaryConfig = primaryCell?.column.columnDef.meta?.mobileCard;

					return (
						<article
							key={row.id}
							className="relative grid gap-3 overflow-hidden rounded-md border border-border/80 bg-background p-3.5 pl-4 text-sm shadow-[0_1px_0_rgba(15,23,42,0.05)] [contain-intrinsic-size:144px] [content-visibility:auto] dark:bg-muted/10"
						>
							<div className="absolute inset-y-0 left-0 w-1 bg-primary" />
							<header className="grid gap-2">
								{eyebrowCells.length > 0 ? (
									<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
										{eyebrowCells.map((cell) => {
											const mobileCard = cell.column.columnDef.meta?.mobileCard;
											return (
												<span
													key={cell.id}
													className={cn(
														"font-mono font-medium text-[11px] text-muted-foreground uppercase tracking-[0.12em]",
														mobileCard?.className,
													)}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</span>
											);
										})}
									</div>
								) : null}
								<div className="flex items-start justify-between gap-3">
									{primaryCell ? (
										<div
											className={cn(
												"min-w-0 font-semibold text-[15px] text-foreground leading-tight",
												primaryConfig?.className,
											)}
										>
											{flexRender(
												primaryCell.column.columnDef.cell,
												primaryCell.getContext(),
											)}
										</div>
									) : null}
									{footerCells.length > 0 ? (
										<div className="shrink-0 text-right">
											{footerCells.map((cell) => {
												const mobileCard =
													cell.column.columnDef.meta?.mobileCard;
												return (
													<div
														key={cell.id}
														className={cn(
															"font-mono font-semibold text-foreground text-sm tabular-nums",
															mobileCard?.className,
														)}
													>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</div>
												);
											})}
										</div>
									) : null}
								</div>
								{badgeCells.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{badgeCells.map((cell) => {
											const mobileCard = cell.column.columnDef.meta?.mobileCard;
											return (
												<div key={cell.id} className={mobileCard?.className}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</div>
											);
										})}
									</div>
								) : null}
							</header>
							{detailCells.length > 0 ? (
								<dl className="grid grid-cols-2 gap-2 border-border/70 border-t pt-3">
									{detailCells.map((cell) => {
										const mobileCard = cell.column.columnDef.meta?.mobileCard;
										const headerLabel = getCellHeaderLabel(cell);
										return (
											<div
												key={cell.id}
												className={cn("min-w-0", mobileCard?.className)}
											>
												<dt
													className={cn(
														"font-mono font-medium text-[10px] text-muted-foreground uppercase tracking-[0.12em]",
														mobileCard?.labelClassName,
													)}
												>
													{headerLabel}
												</dt>
												<dd
													className={cn(
														"mt-1 min-w-0 font-medium text-foreground text-sm",
														mobileCard?.valueClassName,
													)}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</dd>
											</div>
										);
									})}
								</dl>
							) : null}
						</article>
					);
				})}
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => {
							const canSort = sortable && header.column.getCanSort();
							const sortState = header.column.getIsSorted();
							return (
								<TableHead key={header.id}>
									{header.isPlaceholder ? null : canSort ? (
										<button
											type="button"
											onClick={header.column.getToggleSortingHandler()}
											className={cn(
												"flex items-center gap-1 font-medium text-foreground hover:text-foreground/80",
												sortState && "text-foreground",
											)}
										>
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
											{sortState === "asc" ? (
												<CaretUpIcon className="size-3" weight="bold" />
											) : sortState === "desc" ? (
												<CaretDownIcon className="size-3" weight="bold" />
											) : (
												<CaretUpDownIcon
													className="size-3 opacity-50"
													weight="bold"
												/>
											)}
										</button>
									) : (
										flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)
									)}
								</TableHead>
							);
						})}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{isLoading ? (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-20 text-center text-muted-foreground md:h-24"
						>
							Loading...
						</TableCell>
					</TableRow>
				) : table.getRowModel().rows.length ? (
					table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell
							colSpan={colSpan}
							className="h-20 text-center text-muted-foreground md:h-24"
						>
							{emptyMessage}
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
};
