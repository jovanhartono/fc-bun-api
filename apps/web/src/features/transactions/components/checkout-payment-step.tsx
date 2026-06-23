import { CameraIcon, ReceiptIcon, StorefrontIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { CurrencyInput } from "@/components/form/currency-input";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import type { ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { CampaignAutocomplete } from "@/features/orders/components/campaign-autocomplete";
import { SinglePhotoCaptureDialog } from "@/features/orders/components/photo-upload-dialog";
import type { TransactionDraftValues } from "@/features/transactions/cart/cart";
import { CampaignSummaryCard } from "@/features/transactions/components/campaign-summary-card";
import { useCheckoutPricing } from "@/features/transactions/hooks/useCheckoutPricing";
import { useTransactionsPageContext } from "@/features/transactions/lib/transactions-context";
import {
	paymentMethodsQueryOptions,
	usersPageQueryOptions,
} from "@/lib/query-options";
import { formatIDRCurrency } from "@/shared/utils";
import { useTransactionsPageStore } from "@/stores/transactions-store";

export const CheckoutPaymentStep = () => {
	const { visibleStores } = useTransactionsPageContext();
	const { subtotal, selectedCampaigns, pricing } = useCheckoutPricing();
	const form = useFormContext<TransactionDraftValues>();
	const [paymentStatus = "unpaid", selectedStoreId = ""] = useWatch<
		TransactionDraftValues,
		["paymentStatus", "selectedStoreId"]
	>({ name: ["paymentStatus", "selectedStoreId"] });

	const paymentMethodsQuery = useQuery(paymentMethodsQueryOptions());
	const couriersQuery = useQuery(
		usersPageQueryOptions({ role: "courier", is_active: true }),
	);

	const paymentMethodOptions = useMemo<ComboboxOption[]>(
		() =>
			(paymentMethodsQuery.data ?? []).map((paymentMethod) => ({
				value: String(paymentMethod.id),
				label: paymentMethod.name,
			})),
		[paymentMethodsQuery.data],
	);

	const courierOptions = useMemo<ComboboxOption[]>(
		() => [
			{ value: "none", label: "Walk-in (no courier)" },
			...(couriersQuery.data?.items ?? []).map((courier) => ({
				value: String(courier.id),
				label: courier.name,
			})),
		],
		[couriersQuery.data],
	);

	const selectedStoreNumber =
		selectedStoreId && Number.isFinite(Number(selectedStoreId))
			? Number(selectedStoreId)
			: undefined;
	const selectedStore = selectedStoreNumber
		? visibleStores.find((store) => store.id === selectedStoreNumber)
		: undefined;

	return (
		<div className="grid gap-5">
			<Controller
				name="selectedCampaignIds"
				control={form.control}
				render={({ field, fieldState }) => (
					<CampaignAutocomplete
						id="transaction-campaign"
						label="Campaigns"
						storeId={selectedStoreId}
						grossTotal={subtotal}
						values={field.value}
						onValuesChange={field.onChange}
						error={fieldState.error}
					/>
				)}
			/>

			<Controller
				name="paymentStatus"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel>Payment Status</FieldLabel>
						<div className="grid grid-cols-2 gap-2">
							<Button
								type="button"
								variant={field.value === "unpaid" ? "default" : "outline"}
								className="h-11"
								onClick={() => {
									field.onChange("unpaid");
									// A method is "how money arrived" — an unpaid order has none.
									form.setValue("selectedPaymentMethodId", "");
								}}
							>
								Unpaid
							</Button>
							<Button
								type="button"
								variant={field.value === "paid" ? "default" : "outline"}
								className="h-11"
								onClick={() => field.onChange("paid")}
							>
								Paid
							</Button>
						</div>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			{paymentStatus === "paid" ? (
				<Controller
					name="selectedPaymentMethodId"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="transaction-payment-method">
								Payment Method
							</FieldLabel>
							<SelectField
								id="transaction-payment-method"
								items={paymentMethodOptions}
								value={field.value}
								onValueChange={field.onChange}
								placeholder="Select payment method"
								size="lg"
								className="w-full text-sm"
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>
			) : null}

			{selectedCampaigns.length > 0 ? (
				<div className="grid gap-2">
					{selectedCampaigns.map((campaign) => (
						<CampaignSummaryCard key={campaign.id} campaign={campaign} />
					))}
				</div>
			) : null}

			<Controller
				name="manualDiscount"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="transaction-discount">
							Manual Discount
						</FieldLabel>
						<CurrencyInput
							id="transaction-discount"
							value={field.value}
							onValueChange={field.onChange}
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<Controller
				name="selectedCourierId"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="transaction-courier">
							Collected by courier
						</FieldLabel>
						<SelectField
							id="transaction-courier"
							items={courierOptions}
							value={field.value || "none"}
							onValueChange={(value) =>
								field.onChange(value === "none" ? "" : value)
							}
							placeholder="Walk-in (no courier)"
							size="lg"
							className="w-full text-sm"
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<Controller
				name="notes"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="transaction-notes">Notes</FieldLabel>
						<Textarea
							id="transaction-notes"
							value={field.value}
							onChange={field.onChange}
							placeholder="Add notes"
						/>
						<FieldError errors={[fieldState.error]} />
					</Field>
				)}
			/>

			<div className="grid gap-3 border border-border/70 p-4">
				<div className="flex items-center justify-between gap-3 text-sm">
					<div className="flex items-center gap-2">
						<StorefrontIcon className="size-4 text-muted-foreground" />
						<span className="text-muted-foreground">Store</span>
					</div>
					<span className="font-medium">{selectedStore?.name ?? "-"}</span>
				</div>
				<div className="flex items-center justify-between gap-3 text-sm">
					<div className="flex items-center gap-2">
						<ReceiptIcon className="size-4 text-muted-foreground" />
						<span className="text-muted-foreground">Subtotal</span>
					</div>
					<span className="font-medium">
						{formatIDRCurrency(String(subtotal))}
					</span>
				</div>
				{pricing.campaignBreakdown.map(({ campaign, amount }) => (
					<div
						key={campaign.id}
						className="flex items-center justify-between gap-3 text-sm"
					>
						<span className="text-muted-foreground">
							{campaign.code} ({campaign.name})
						</span>
						<span className="font-medium">
							-{formatIDRCurrency(String(amount))}
						</span>
					</div>
				))}
				<div className="flex items-center justify-between gap-3 text-sm">
					<span className="text-muted-foreground">Manual Discount</span>
					<span className="font-medium">
						-{formatIDRCurrency(String(pricing.manualDiscount))}
					</span>
				</div>
				<div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-base font-semibold">
					<span>Total Payment</span>
					<span>{formatIDRCurrency(String(Math.round(pricing.total)))}</span>
				</div>
			</div>

			<CheckoutDropoffPhotoField />
		</div>
	);
};

const CheckoutDropoffPhotoField = () => {
	const dropoffPhoto = useTransactionsPageStore((state) => state.dropoffPhoto);
	const setDropoffPhoto = useTransactionsPageStore(
		(state) => state.setDropoffPhoto,
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!dropoffPhoto) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(dropoffPhoto);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [dropoffPhoto]);

	return (
		<Field>
			<FieldLabel>
				Drop-off photo <span className="text-muted-foreground">(required)</span>
			</FieldLabel>
			<div className="aspect-4/3 w-full overflow-hidden border bg-muted sm:aspect-16/10">
				{previewUrl ? (
					<img
						src={previewUrl}
						alt="Drop-off preview"
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
						<CameraIcon className="size-8 opacity-50" />
						<p className="text-sm">Photo of the items at intake</p>
					</div>
				)}
			</div>
			<Button
				type="button"
				variant="outline"
				className="h-11 w-full"
				icon={<CameraIcon className="size-4" />}
				onClick={() => setIsDialogOpen(true)}
			>
				{dropoffPhoto ? "Replace photo" : "Add photo"}
			</Button>
			<SinglePhotoCaptureDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				title="Drop-off photo"
				badgeLabel="Drop-off"
				onCapture={setDropoffPhoto}
			/>
		</Field>
	);
};
