import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useMemo } from "react";
import { z } from "zod";
import { DataTable } from "@/components/data-table";
import { DebouncedSearchInput } from "@/components/debounced-search-input";
import { SelectField } from "@/components/form/select-field";
import { PageHeader } from "@/components/page-header";
import { TablePagination } from "@/components/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	formatComplaintResolution,
	formatComplaintStatus,
	getComplaintResolutionBadgeVariant,
	getComplaintStatusBadgeVariant,
} from "@/features/complaints/lib/format";
import type { ComplaintListItem, FetchComplaintsQuery } from "@/lib/api";
import { complaintsPageQueryOptions } from "@/lib/query-options";

const complaintsSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1),
	search: z.string().trim().min(1).max(100).optional().catch(undefined),
	status: z.enum(["open", "closed"]).optional().catch(undefined),
});

type ComplaintsSearch = z.infer<typeof complaintsSearchSchema>;

const PAGE_SIZE = 25;

const STATUS_FILTER_ITEMS = {
	"": "All statuses",
	open: "Open",
	closed: "Closed",
} as const;

function buildComplaintsListParams(
	search: ComplaintsSearch,
): FetchComplaintsQuery {
	return {
		limit: PAGE_SIZE,
		offset: (search.page - 1) * PAGE_SIZE,
		...(search.search ? { search: search.search } : {}),
		...(search.status ? { status: search.status } : {}),
	};
}

const ComplaintsPage = () => {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	const complaintsQuery = useQuery(
		complaintsPageQueryOptions(buildComplaintsListParams(search)),
	);
	const complaints = complaintsQuery.data?.items ?? [];

	const handleSearchChange = (next: string) => {
		void navigate({
			search: (prev) => ({
				...prev,
				page: 1,
				search: next || undefined,
			}),
		});
	};

	const handleStatusChange = (value: string) => {
		void navigate({
			search: (prev) => ({
				...prev,
				page: 1,
				status: value === "" ? undefined : (value as "open" | "closed"),
			}),
		});
	};

	const columns = useMemo<ColumnDef<ComplaintListItem>[]>(
		() => [
			{
				id: "complaint",
				header: "Complaint",
				meta: { mobileCard: { slot: "title" } },
				cell: ({ row }) => (
					<div className="flex flex-col gap-0.5">
						<Link
							to="/complaints/$complaintId"
							params={{ complaintId: String(row.original.id) }}
							className="font-mono font-semibold"
						>
							{row.original.order_code}
						</Link>
						<span className="text-[11px] text-muted-foreground">
							{row.original.service_name ?? "—"}
						</span>
					</div>
				),
			},
			{
				accessorKey: "customer_name",
				header: "Customer",
				meta: { mobileCard: { label: "Customer" } },
			},
			{
				accessorKey: "store_name",
				header: "Store",
				meta: { mobileCard: { slot: "eyebrow" } },
			},
			{
				accessorKey: "status",
				header: "Status",
				meta: { mobileCard: { slot: "badges" } },
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1">
						<Badge
							variant={getComplaintStatusBadgeVariant(row.original.status)}
						>
							{formatComplaintStatus(row.original.status)}
						</Badge>
						{row.original.resolution ? (
							<Badge
								variant={getComplaintResolutionBadgeVariant(
									row.original.resolution,
								)}
							>
								{formatComplaintResolution(row.original.resolution)}
							</Badge>
						) : null}
						{row.original.voucher_promised ? (
							<Badge variant="info">Voucher</Badge>
						) : null}
					</div>
				),
			},
			{
				id: "opened",
				header: () => <div className="text-right">Opened</div>,
				meta: { mobileCard: { slot: "footer" } },
				cell: ({ row }) => (
					<div className="text-right text-muted-foreground tabular-nums">
						{dayjs(row.original.created_at).format("DD MMM HH:mm")}
					</div>
				),
			},
		],
		[],
	);

	return (
		<>
			<PageHeader title="Complaints" />
			<div className="grid gap-4">
				<Card>
					<CardContent>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<DebouncedSearchInput
								id="complaints-search"
								value={search.search ?? ""}
								onDebouncedChange={handleSearchChange}
								placeholder="Search order code or customer…"
								ariaLabel="Search complaints"
								className="flex-1"
							/>
							<SelectField
								items={STATUS_FILTER_ITEMS}
								value={search.status ?? ""}
								onValueChange={handleStatusChange}
								className="sm:w-44"
							/>
						</div>
						<div className="mt-4 grid gap-4">
							<DataTable
								columns={columns}
								data={complaints}
								isLoading={complaintsQuery.isPending}
							/>
							<TablePagination
								meta={complaintsQuery.data?.meta}
								isLoading={complaintsQuery.isPending}
								onPageChange={(page) => {
									void navigate({
										search: (prev) => ({ ...prev, page }),
									});
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</>
	);
};

export const Route = createFileRoute("/_admin/complaints/")({
	validateSearch: (search) => complaintsSearchSchema.parse(search),
	loaderDeps: ({ search }) => search,
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(
			complaintsPageQueryOptions(buildComplaintsListParams(deps)),
		);
	},
	component: ComplaintsPage,
});
