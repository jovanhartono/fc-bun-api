import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CampaignForm,
	type CampaignFormState,
} from "@/features/campaigns/components/campaign-form";
import {
	type Campaign,
	type CampaignPayload,
	createCampaign,
	deleteCampaign,
	fetchCampaigns,
	fetchStores,
	queryKeys,
	updateCampaign,
} from "@/lib/api";
import { getCurrentUser } from "@/stores/auth-store";
import { useSheet } from "@/stores/sheet-store";

export const Route = createFileRoute("/_admin/campaigns")({
	component: CampaignsPage,
});

const defaultCampaignForm: CampaignFormState = {
	code: "",
	name: "",
	discount_type: "fixed",
	discount_value: "0",
	min_order_total: "0",
	max_discount: "",
	starts_at: "",
	ends_at: "",
	is_active: true,
	store_ids: [],
};

function toDateTimeLocal(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return adjusted.toISOString().slice(0, 16);
}

function CampaignsPage() {
	const user = getCurrentUser();
	const isAdmin = user?.role === "admin";
	const queryClient = useQueryClient();
	const { openSheet, closeSheet } = useSheet();
	const [statusFilter, setStatusFilter] = useState<
		"all" | "active" | "inactive"
	>("all");

	const campaignQueryFilters =
		statusFilter === "all"
			? undefined
			: { is_active: statusFilter === "active" };

	const campaignsQuery = useQuery({
		queryKey: queryKeys.campaigns(campaignQueryFilters),
		queryFn: () => fetchCampaigns(campaignQueryFilters),
	});

	const storesQuery = useQuery({
		queryKey: queryKeys.stores,
		queryFn: fetchStores,
	});

	const stores = storesQuery.data ?? [];
	const campaigns = campaignsQuery.data ?? [];

	const createMutation = useMutation({
		mutationKey: ["create-campaign"],
		mutationFn: createCampaign,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			closeSheet();
		},
	});

	const updateMutation = useMutation({
		mutationKey: ["update-campaign"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Partial<CampaignPayload>;
		}) => updateCampaign(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			closeSheet();
		},
	});

	const deleteMutation = useMutation({
		mutationKey: ["delete-campaign"],
		mutationFn: (id: number) => deleteCampaign(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
		},
	});

	const handleOpenCreateSheet = () => {
		openSheet({
			title: "Add Campaign",
			description: "Create a new campaign",
			content: (
				<CampaignForm
					defaultValues={defaultCampaignForm}
					isEditing={false}
					onReset={closeSheet}
					stores={stores}
					handleOnSubmit={async (payload) => {
						await createMutation.mutateAsync(payload);
					}}
				/>
			),
		});
	};

	const handleOpenEditSheet = (campaign: Campaign) => {
		openSheet({
			title: "Edit Campaign",
			description: `Editing campaign ${campaign.code}`,
			content: (
				<CampaignForm
					defaultValues={{
						code: campaign.code,
						name: campaign.name,
						discount_type: campaign.discount_type,
						discount_value: String(campaign.discount_value),
						min_order_total: String(campaign.min_order_total),
						max_discount: campaign.max_discount
							? String(campaign.max_discount)
							: "",
						starts_at: toDateTimeLocal(campaign.starts_at),
						ends_at: toDateTimeLocal(campaign.ends_at),
						is_active: campaign.is_active,
						store_ids: campaign.stores.map((item) => item.store_id),
					}}
					isEditing
					onReset={closeSheet}
					stores={stores}
					handleOnSubmit={async (payload) => {
						await updateMutation.mutateAsync({
							id: campaign.id,
							payload,
						});
					}}
				/>
			),
		});
	};

	const columns: ColumnDef<Campaign>[] = [
		{ accessorKey: "code", header: "Code" },
		{ accessorKey: "name", header: "Name" },
		{
			id: "discount",
			header: "Discount",
			cell: ({ row }) =>
				`${row.original.discount_type} ${row.original.discount_value}`,
		},
		{
			id: "stores",
			header: "Stores",
			cell: ({ row }) => {
				if (row.original.stores.length === 0) {
					return "All Stores";
				}

				return row.original.stores
					.map((item) => item.store?.code ?? String(item.store_id))
					.join(", ");
			},
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => (
				<Badge variant={row.original.is_active ? "success" : "danger"}>
					{row.original.is_active ? "Active" : "Inactive"}
				</Badge>
			),
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => (
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!isAdmin}
						onClick={() => handleOpenEditSheet(row.original)}
						icon={<PencilSimpleLine className="size-4" weight="duotone" />}
					>
						Edit
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={!isAdmin || deleteMutation.isPending}
						onClick={async () => {
							await deleteMutation.mutateAsync(row.original.id);
						}}
						icon={<Trash className="size-4" weight="duotone" />}
					>
						Delete
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="grid gap-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle>Campaign List</CardTitle>
					<div className="flex items-center gap-2">
						<Select
							value={statusFilter}
							onValueChange={(value) =>
								setStatusFilter((value ?? "all") as typeof statusFilter)
							}
						>
							<SelectTrigger className="h-10 min-w-40">
								<SelectValue placeholder="Filter status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All status</SelectItem>
								<SelectItem value="active">Active only</SelectItem>
								<SelectItem value="inactive">Inactive only</SelectItem>
							</SelectContent>
						</Select>
						<Badge variant={campaignsQuery.isPending ? "secondary" : "outline"}>
							{`${campaigns.length} items`}
						</Badge>
						<Button
							onClick={handleOpenCreateSheet}
							disabled={!isAdmin}
							icon={<Plus className="size-4" weight="duotone" />}
						>
							Add Campaign
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={campaigns}
						isLoading={campaignsQuery.isPending || storesQuery.isPending}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
