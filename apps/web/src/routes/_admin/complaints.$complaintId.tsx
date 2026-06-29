import { ArrowClockwiseIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResolveComplaintForm } from "@/features/complaints/components/resolve-complaint-form";
import {
	useAddReworkMutation,
	useResolveComplaintMutation,
} from "@/features/complaints/hooks/useComplaintMutations";
import {
	formatComplaintResolution,
	formatComplaintStatus,
	getComplaintResolutionBadgeVariant,
	getComplaintStatusBadgeVariant,
} from "@/features/complaints/lib/format";
import { complaintDetailQueryOptions } from "@/lib/query-options";
import {
	formatOrderServiceStatus,
	getOrderServiceStatusBadgeVariant,
} from "@/lib/status";
import { useDialog } from "@/stores/dialog-store";

interface DetailProps {
	label: string;
	children: ReactNode;
}

const Detail = ({ label, children }: DetailProps) => (
	<div className="flex flex-col gap-0.5">
		<span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
			{label}
		</span>
		<span className="text-sm">{children}</span>
	</div>
);

const ComplaintDetailPage = () => {
	const { complaintId } = Route.useParams();
	const id = Number(complaintId);

	const complaintQuery = useQuery(complaintDetailQueryOptions(id));
	const openDialog = useDialog((state) => state.openDialog);
	const closeDialog = useDialog((state) => state.closeDialog);

	// 0 until data loads; the rework button only renders after the guard below.
	const orderId = complaintQuery.data?.orderService?.order?.id ?? 0;
	const reworkMutation = useAddReworkMutation(id, orderId);
	const resolveMutation = useResolveComplaintMutation(id, orderId);

	const detail = complaintQuery.data;

	if (!detail?.orderService?.order) {
		return (
			<>
				<PageHeader title="Complaint" />
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground text-sm">
						{complaintQuery.isPending ? "Loading…" : "Complaint not found"}
					</CardContent>
				</Card>
			</>
		);
	}

	const subject = detail.orderService;
	const order = detail.orderService.order;
	const isOpen = detail.status === "open";

	const handleResolve = () => {
		openDialog({
			title: "Resolve complaint",
			description: "Record how this complaint was resolved.",
			content: () => (
				<ResolveComplaintForm
					closeDialog={closeDialog}
					defaultVoucherPromised={detail.voucher_promised}
					mutation={resolveMutation}
				/>
			),
		});
	};

	return (
		<>
			<PageHeader
				title={`Complaint #${detail.id}`}
				actions={
					isOpen ? (
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => reworkMutation.mutate()}
								disabled={reworkMutation.isPending}
								icon={<ArrowClockwiseIcon className="size-4" />}
							>
								Start rework
							</Button>
							<Button
								onClick={handleResolve}
								icon={<CheckCircleIcon className="size-4" />}
							>
								Resolve
							</Button>
						</div>
					) : null
				}
			/>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex flex-wrap items-center gap-2">
							Complaint
							<Badge variant={getComplaintStatusBadgeVariant(detail.status)}>
								{formatComplaintStatus(detail.status)}
							</Badge>
							{detail.resolution ? (
								<Badge
									variant={getComplaintResolutionBadgeVariant(
										detail.resolution,
									)}
								>
									{formatComplaintResolution(detail.resolution)}
								</Badge>
							) : null}
							{detail.voucher_promised ? (
								<Badge variant="info">Voucher promised</Badge>
							) : null}
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid grid-cols-2 gap-4">
							<Detail label="Order">
								<Link
									to="/orders/$orderId"
									params={{ orderId: String(order.id) }}
									className="font-mono font-semibold"
								>
									{order.code}
								</Link>
							</Detail>
							<Detail label="Store">{order.store?.name ?? "—"}</Detail>
							<Detail label="Customer">{order.customer?.name ?? "—"}</Detail>
							<Detail label="Phone">
								{order.customer?.phone_number ?? "—"}
							</Detail>
						</div>

						<Detail label="Complained item">
							<span className="flex flex-wrap items-center gap-2">
								<span>{subject.service?.name ?? "Service"}</span>
								<span className="font-mono text-muted-foreground text-xs">
									{subject.item_code ?? `#${subject.id}`}
								</span>
								<Badge
									variant={getOrderServiceStatusBadgeVariant(subject.status)}
								>
									{formatOrderServiceStatus(subject.status)}
								</Badge>
							</span>
						</Detail>

						<Detail label="Reason">
							<span className="whitespace-pre-wrap">{detail.reason}</span>
						</Detail>

						<div className="grid grid-cols-2 gap-4">
							<Detail label="Opened by">{detail.openedBy?.name ?? "—"}</Detail>
							<Detail label="Opened at">
								{dayjs(detail.created_at).format("DD MMM YYYY HH:mm")}
							</Detail>
						</div>

						{detail.status === "closed" ? (
							<div className="grid gap-4 border-t pt-4">
								<div className="grid grid-cols-2 gap-4">
									<Detail label="Closed by">
										{detail.closedBy?.name ?? "—"}
									</Detail>
									<Detail label="Closed at">
										{detail.closed_at
											? dayjs(detail.closed_at).format("DD MMM YYYY HH:mm")
											: "—"}
									</Detail>
								</div>
								{detail.resolution_note ? (
									<Detail label="Resolution note">
										<span className="whitespace-pre-wrap">
											{detail.resolution_note}
										</span>
									</Detail>
								) : null}
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Rework lines ({detail.reworkLines.length})</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2">
						{detail.reworkLines.length === 0 ? (
							<p className="py-6 text-center text-muted-foreground text-sm">
								No rework started.
							</p>
						) : (
							detail.reworkLines.map((line) => (
								<div
									key={line.id}
									className="flex flex-wrap items-center justify-between gap-2 border p-3"
								>
									<div className="flex flex-col gap-0.5">
										<span className="font-mono text-sm">
											{line.item_code ?? `#${line.id}`}
										</span>
										<span className="text-muted-foreground text-xs">
											{line.service?.name ?? "Service"} ·{" "}
											{line.handler?.name ?? "Unassigned"}
										</span>
									</div>
									<Badge
										variant={getOrderServiceStatusBadgeVariant(line.status)}
									>
										{formatOrderServiceStatus(line.status)}
									</Badge>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
};

export const Route = createFileRoute("/_admin/complaints/$complaintId")({
	loader: async ({ context, params }) => {
		const id = Number(params.complaintId);

		if (!Number.isInteger(id) || id <= 0) {
			return;
		}

		await context.queryClient.ensureQueryData(complaintDetailQueryOptions(id));
	},
	component: ComplaintDetailPage,
});
