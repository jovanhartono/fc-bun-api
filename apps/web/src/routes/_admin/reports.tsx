import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import {
	ReportShell,
	type ReportTab,
} from "@/features/reports/components/report-shell";
import {
	defaultRange,
	jakartaToday,
} from "@/features/reports/utils/report-filters";
import {
	campaignEffectivenessQueryOptions,
	customerAcquisitionQueryOptions,
	ordersFlowQueryOptions,
	paymentMixQueryOptions,
	refundTrendQueryOptions,
	reportOverviewQueryOptions,
	revenueTrendQueryOptions,
	storesQueryOptions,
	workerProductivityQueryOptions,
} from "@/lib/query-options";

const OverviewPanel = lazy(
	() => import("@/features/reports/panels/overview-panel"),
);
const RevenuePanel = lazy(
	() => import("@/features/reports/panels/revenue-panel"),
);
const OperationsPanel = lazy(
	() => import("@/features/reports/panels/operations-panel"),
);
const PaymentsPanel = lazy(
	() => import("@/features/reports/panels/payments-panel"),
);
const CustomersPanel = lazy(
	() => import("@/features/reports/panels/customers-panel"),
);
const QualityPanel = lazy(
	() => import("@/features/reports/panels/quality-panel"),
);
const WorkersPanel = lazy(
	() => import("@/features/reports/panels/workers-panel"),
);
const CampaignsPanel = lazy(
	() => import("@/features/reports/panels/campaigns-panel"),
);

const tabs: ReportTab[] = [
	{ id: "overview", label: "Overview" },
	{ id: "revenue", label: "Revenue" },
	{ id: "operations", label: "Operations" },
	{ id: "payments", label: "Payments" },
	{ id: "customers", label: "Customers" },
	{ id: "quality", label: "Quality" },
	{ id: "workers", label: "Workers" },
	{ id: "campaigns", label: "Campaigns" },
];

const tabSchema = z.enum([
	"overview",
	"revenue",
	"operations",
	"payments",
	"customers",
	"quality",
	"workers",
	"campaigns",
]);

type Tab = z.infer<typeof tabSchema>;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const reportsSearchSchema = z
	.object({
		tab: tabSchema.catch(() => "overview" as const),
		from: z
			.string()
			.regex(dateRegex)
			.catch(() => defaultRange().from),
		to: z
			.string()
			.regex(dateRegex)
			.catch(() => defaultRange().to),
		store_id: z.coerce.number().int().positive().optional().catch(undefined),
	})
	.transform((value) => {
		if (value.from > value.to) {
			return { ...value, from: value.to };
		}
		return value;
	});

type ReportsSearch = z.infer<typeof reportsSearchSchema>;

function prefetchForTab(queryClient: QueryClient, search: ReportsSearch) {
	const range = {
		from: search.from,
		to: search.to,
		store_id: search.store_id,
	};
	switch (search.tab) {
		case "overview":
			return queryClient.ensureQueryData(
				reportOverviewQueryOptions({
					date: jakartaToday(),
					store_id: search.store_id,
					trend_days: 14,
				}),
			);
		case "revenue":
			return queryClient.ensureQueryData(revenueTrendQueryOptions(range));
		case "operations":
			return queryClient.ensureQueryData(ordersFlowQueryOptions(range));
		case "payments":
			return queryClient.ensureQueryData(paymentMixQueryOptions(range));
		case "customers":
			return queryClient.ensureQueryData(
				customerAcquisitionQueryOptions(range),
			);
		case "quality":
			return queryClient.ensureQueryData(refundTrendQueryOptions(range));
		case "workers":
			return queryClient.ensureQueryData(workerProductivityQueryOptions(range));
		case "campaigns":
			return queryClient.ensureQueryData(
				campaignEffectivenessQueryOptions(range),
			);
		default:
			return Promise.resolve();
	}
}

export const Route = createFileRoute("/_admin/reports")({
	validateSearch: (search) => reportsSearchSchema.parse(search),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(storesQueryOptions()),
			prefetchForTab(context.queryClient, deps),
		]),
	component: ReportsPage,
});

const PanelSkeleton = () => (
	<div className="grid gap-6">
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<div className="h-24 animate-pulse bg-muted/40" />
			<div className="h-24 animate-pulse bg-muted/40" />
			<div className="h-24 animate-pulse bg-muted/40" />
			<div className="h-24 animate-pulse bg-muted/40" />
		</div>
		<div className="h-[320px] animate-pulse bg-muted/40" />
		<div className="h-[320px] animate-pulse bg-muted/40" />
	</div>
);

const descriptions: Record<Tab, string> = {
	overview: "Today's revenue, throughput, and order flow.",
	revenue: "Services vs products and category mix.",
	operations: "Dropoff and pickup volume over time.",
	payments: "Revenue share per payment method.",
	customers: "Acquisition and retention trends.",
	quality: "Refund volume and root-cause mix.",
	workers: "Items completed and shift productivity.",
	campaigns: "Orders, revenue and discount cost per campaign.",
};

function ReportsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	const currentTab = search.tab as Tab;

	return (
		<>
			<PageHeader title="Reports" description={descriptions[currentTab]} />
			<ReportShell
				tabs={tabs}
				activeTab={currentTab}
				onTabChange={(tab) => {
					void navigate({
						search: (prev) => ({ ...prev, tab: tab as Tab }),
					});
				}}
				from={search.from}
				to={search.to}
				onRangeChange={(range) => {
					void navigate({
						search: (prev) => ({ ...prev, from: range.from, to: range.to }),
					});
				}}
				storeId={search.store_id}
				onStoreChange={(storeId) => {
					void navigate({
						search: (prev) => ({ ...prev, store_id: storeId }),
					});
				}}
				showRangeFilters={currentTab !== "overview"}
			>
				<Suspense fallback={<PanelSkeleton />}>
					{currentTab === "overview" && (
						<OverviewPanel date={jakartaToday()} storeId={search.store_id} />
					)}
					{currentTab === "revenue" && (
						<RevenuePanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "operations" && (
						<OperationsPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "payments" && (
						<PaymentsPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "customers" && (
						<CustomersPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "quality" && (
						<QualityPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "workers" && (
						<WorkersPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
					{currentTab === "campaigns" && (
						<CampaignsPanel
							from={search.from}
							to={search.to}
							storeId={search.store_id}
						/>
					)}
				</Suspense>
			</ReportShell>
		</>
	);
}
