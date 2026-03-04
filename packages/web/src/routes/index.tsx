import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { fetchDashboardCounts, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
	beforeLoad: requireAuth,
	component: DashboardPage,
});

const cards = [
	{ key: "customers", label: "Customers" },
	{ key: "users", label: "Users" },
	{ key: "stores", label: "Stores" },
	{ key: "categories", label: "Categories" },
	{ key: "services", label: "Services" },
	{ key: "products", label: "Products" },
	{ key: "paymentMethods", label: "Payment Methods" },
	{ key: "orders", label: "Orders" },
] as const;

function DashboardPage() {
	const { data, isPending, isFetching } = useQuery({
		queryKey: queryKeys.dashboard,
		queryFn: fetchDashboardCounts,
	});

	return (
		<AppShell
			title="Dashboard"
			description="React + TanStack migration baseline with shared API contracts."
		>
			<div className="mb-4 flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Overview count from live admin endpoints.
				</p>
				<Badge variant={isFetching ? "secondary" : "outline"}>
					{isFetching ? "Refreshing" : "Live"}
				</Badge>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{cards.map((card) => (
					<Card key={card.key}>
						<CardHeader className="pb-3">
							<CardDescription>{card.label}</CardDescription>
							<CardTitle className="text-2xl">
								{isPending ? "..." : (data?.[card.key] ?? 0)}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-xs text-muted-foreground">
								Total records currently available.
							</p>
						</CardContent>
					</Card>
				))}
			</div>
		</AppShell>
	);
}
