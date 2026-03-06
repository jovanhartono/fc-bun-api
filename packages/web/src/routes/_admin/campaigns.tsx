import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { useGlobalSheet } from "@/stores/sheet-store";

export const Route = createFileRoute("/_admin/campaigns")({
	component: CampaignsPage,
});

const campaignFormSchema = z.object({
	code: z.string().trim().min(1),
	name: z.string().trim().min(1),
	discount_type: z.enum(["fixed", "percentage"]),
	discount_value: z.string().trim().min(1),
	min_order_total: z.string().trim().min(1),
	max_discount: z.string().trim().optional(),
	starts_at: z.string().trim().optional(),
	ends_at: z.string().trim().optional(),
	is_active: z.boolean(),
	store_ids: z.array(z.number().int().positive()),
});

type CampaignFormState = z.infer<typeof campaignFormSchema>;

function toDateTimeLocal(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return adjusted.toISOString().slice(0, 16);
}

function toCampaignPayload(values: CampaignFormState): CampaignPayload {
	return {
		code: values.code,
		name: values.name,
		discount_type: values.discount_type,
		discount_value: values.discount_value,
		min_order_total: values.min_order_total,
		max_discount: values.max_discount?.trim() ? values.max_discount : null,
		starts_at: values.starts_at ? new Date(values.starts_at) : null,
		ends_at: values.ends_at ? new Date(values.ends_at) : null,
		is_active: values.is_active,
		store_ids: values.store_ids,
	};
}

type CampaignFormProps = {
	defaultValues: CampaignFormState;
	isSubmitting: boolean;
	stores: Array<{ id: number; name: string; code: string }>;
	handleOnSubmit: (payload: CampaignPayload) => Promise<void>;
};

function CampaignForm({
	defaultValues,
	isSubmitting,
	stores,
	handleOnSubmit,
}: CampaignFormProps) {
	const form = useForm<CampaignFormState>({
		resolver: zodResolver(campaignFormSchema),
		defaultValues,
	});

	return (
		<form
			className="grid gap-4 p-4"
			onSubmit={form.handleSubmit(async (values) => {
				await handleOnSubmit(toCampaignPayload(values));
			})}
		>
			<div className="grid gap-4 md:grid-cols-2">
				<Controller
					name="code"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-code" asterisk>
								Code
							</FieldLabel>
							<Input
								{...field}
								id="campaign-code"
								placeholder="e.g. MARCH10"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="name"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-name" asterisk>
								Name
							</FieldLabel>
							<Input
								{...field}
								id="campaign-name"
								placeholder="e.g. March Promo"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="discount_type"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-discount-type" asterisk>
								Discount Type
							</FieldLabel>
							<Select
								value={field.value}
								onValueChange={(value) =>
									field.onChange((value ?? "fixed") as "fixed" | "percentage")
								}
								disabled={isSubmitting}
							>
								<SelectTrigger
									id="campaign-discount-type"
									className="h-10 w-full"
								>
									<SelectValue placeholder="Select discount type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="fixed">Fixed</SelectItem>
									<SelectItem value="percentage">Percentage</SelectItem>
								</SelectContent>
							</Select>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="discount_value"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-discount-value" asterisk>
								Discount Value
							</FieldLabel>
							<Input
								{...field}
								id="campaign-discount-value"
								placeholder="e.g. 10000 or 10"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="min_order_total"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-min-order">
								Min Order Total
							</FieldLabel>
							<Input
								{...field}
								id="campaign-min-order"
								placeholder="0"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="max_discount"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-max-discount">
								Max Discount
							</FieldLabel>
							<Input
								{...field}
								id="campaign-max-discount"
								placeholder="optional"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="starts_at"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-starts-at">Starts At</FieldLabel>
							<Input
								{...field}
								id="campaign-starts-at"
								type="datetime-local"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="ends_at"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="campaign-ends-at">Ends At</FieldLabel>
							<Input
								{...field}
								id="campaign-ends-at"
								type="datetime-local"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			</div>

			<Controller
				name="store_ids"
				control={form.control}
				render={({ field }) => (
					<Field>
						<FieldLabel>Stores (empty = all stores)</FieldLabel>
						<div className="grid gap-2 rounded-none border p-3 md:grid-cols-2">
							{stores.map((store) => {
								const checked = field.value.includes(store.id);
								return (
									<label
										key={store.id}
										className="flex items-center gap-2 text-sm"
									>
										<input
											type="checkbox"
											checked={checked}
											onChange={(event) => {
												if (event.target.checked) {
													field.onChange([...field.value, store.id]);
													return;
												}
												field.onChange(
													field.value.filter((id: number) => id !== store.id),
												);
											}}
											disabled={isSubmitting}
										/>
										<span>{`${store.code} - ${store.name}`}</span>
									</label>
								);
							})}
						</div>
					</Field>
				)}
			/>

			<Controller
				name="is_active"
				control={form.control}
				render={({ field }) => (
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={field.value}
							onChange={(event) => field.onChange(event.target.checked)}
							disabled={isSubmitting}
						/>
						<span>Campaign is active</span>
					</label>
				)}
			/>

			<div className="flex justify-end">
				<Button type="submit" loading={isSubmitting}>
					Save Campaign
				</Button>
			</div>
		</form>
	);
}

function CampaignsPage() {
	const user = getCurrentUser();
	const isAdmin = user?.role === "admin";
	const queryClient = useQueryClient();
	const { openSheet, closeSheet } = useGlobalSheet();
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
					defaultValues={{
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
					}}
					isSubmitting={createMutation.isPending}
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
					isSubmitting={updateMutation.isPending}
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
