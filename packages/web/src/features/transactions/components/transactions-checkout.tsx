import {
	CreditCard,
	ShoppingCart,
	Storefront,
	Trash,
	X,
} from "@phosphor-icons/react";
import { CurrencyInput } from "@/components/form/currency-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
	ProductCartDisplayLine,
	ServiceCartDisplayLine,
} from "@/features/transactions/lib/transactions";
import { getEntityCategoryName } from "@/features/transactions/lib/transactions";
import type { Campaign, Category, Store } from "@/lib/api";
import { formatIDRCurrency } from "@/shared/utils";

type TransactionsCheckoutProps = {
	selectedStore?: Store;
	cartCount: number;
	selectedCustomerId: string;
	selectedCampaignId: string;
	selectedPaymentMethodId: string;
	selectedCampaign?: Campaign;
	selectedStoreNumber?: number;
	paymentStatus: "paid" | "unpaid";
	manualDiscount: string;
	notes: string;
	submitError: string;
	customerOptions: ComboboxOption[];
	campaignOptions: ComboboxOption[];
	paymentMethodOptions: ComboboxOption[];
	campaignsLoading: boolean;
	customersLoading: boolean;
	paymentMethodsLoading: boolean;
	cartProductRows: ProductCartDisplayLine[];
	cartServiceRows: ServiceCartDisplayLine[];
	categoryMap: Map<number, Category>;
	campaignDiscount: number;
	discountValue: number;
	subtotal: number;
	total: number;
	isSubmitting: boolean;
	onResetCart: () => void;
	onSelectedCustomerIdChange: (value: string) => void;
	onSelectedCampaignIdChange: (value: string) => void;
	onSelectedPaymentMethodIdChange: (value: string) => void;
	onPaymentStatusChange: (value: "paid" | "unpaid") => void;
	onManualDiscountChange: (value: string) => void;
	onNotesChange: (value: string) => void;
	onRemoveProduct: (productId: number) => void;
	onUpdateProductQty: (
		productId: number,
		nextQty: number,
		maxStock: number,
	) => void;
	onRemoveService: (serviceId: number) => void;
	onUpdateServiceQty: (serviceId: number, nextQty: number) => void;
	onUpdateServiceBrand: (serviceId: number, value: string) => void;
	onUpdateServiceSize: (serviceId: number, value: string) => void;
	onSubmit: () => void;
};

export function TransactionsCheckout({
	selectedStore,
	cartCount,
	selectedCustomerId,
	selectedCampaignId,
	selectedPaymentMethodId,
	selectedCampaign,
	selectedStoreNumber,
	paymentStatus,
	manualDiscount,
	notes,
	submitError,
	customerOptions,
	campaignOptions,
	paymentMethodOptions,
	campaignsLoading,
	customersLoading,
	paymentMethodsLoading,
	cartProductRows,
	cartServiceRows,
	categoryMap,
	campaignDiscount,
	discountValue,
	subtotal,
	total,
	isSubmitting,
	onResetCart,
	onSelectedCustomerIdChange,
	onSelectedCampaignIdChange,
	onSelectedPaymentMethodIdChange,
	onPaymentStatusChange,
	onManualDiscountChange,
	onNotesChange,
	onRemoveProduct,
	onUpdateProductQty,
	onRemoveService,
	onUpdateServiceQty,
	onUpdateServiceBrand,
	onUpdateServiceSize,
	onSubmit,
}: TransactionsCheckoutProps) {
	return (
		<div className="grid gap-5 xl:sticky xl:top-24 xl:self-start">
			<Card className="border-border/70">
				<CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
					<div>
						<CardTitle className="flex items-center gap-2">
							<ShoppingCart className="size-4" weight="duotone" />
							Cart Summary
						</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							{selectedStore ? selectedStore.name : "Select store"} |{" "}
							{cartCount} item
							{cartCount === 1 ? "" : "s"}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onResetCart}
						disabled={
							cartCount === 0 && !selectedCustomerId && !selectedCampaignId
						}
						icon={<Trash className="size-4" weight="duotone" />}
					>
						Reset
					</Button>
				</CardHeader>
				<CardContent className="grid gap-5">
					<div className="grid gap-4">
						<Field>
							<FieldLabel htmlFor="transaction-customer" asterisk>
								Customer
							</FieldLabel>
							<Combobox
								id="transaction-customer"
								required
								triggerClassName="h-10 w-full text-sm"
								options={customerOptions}
								value={selectedCustomerId}
								onValueChange={onSelectedCustomerIdChange}
								loading={customersLoading}
								placeholder="Select customer"
								searchPlaceholder="Search customer..."
								emptyText="No customer found"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="transaction-campaign">Campaign</FieldLabel>
							<Combobox
								id="transaction-campaign"
								triggerClassName="h-10 w-full text-sm"
								options={campaignOptions}
								value={selectedCampaignId || "none"}
								onValueChange={(value) =>
									onSelectedCampaignIdChange(value === "none" ? "" : value)
								}
								loading={campaignsLoading}
								placeholder={
									selectedStoreNumber
										? "No campaign"
										: "Select store first to unlock campaigns"
								}
								searchPlaceholder="Search campaign..."
								emptyText={
									selectedStoreNumber
										? "No campaign found"
										: "Select store first"
								}
								disabled={selectedStoreNumber === undefined}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="transaction-payment-method">
								Payment Method
							</FieldLabel>
							<Combobox
								id="transaction-payment-method"
								triggerClassName="h-10 w-full text-sm"
								options={paymentMethodOptions}
								value={selectedPaymentMethodId || "none"}
								onValueChange={(value) =>
									onSelectedPaymentMethodIdChange(value === "none" ? "" : value)
								}
								loading={paymentMethodsLoading}
								placeholder="No payment method"
								searchPlaceholder="Search payment method..."
								emptyText="No payment method found"
							/>
						</Field>

						<div className="grid gap-2">
							<FieldLabel>Payment Status</FieldLabel>
							<div className="grid grid-cols-2 gap-2">
								<Button
									type="button"
									variant={paymentStatus === "unpaid" ? "default" : "outline"}
									onClick={() => onPaymentStatusChange("unpaid")}
								>
									Unpaid
								</Button>
								<Button
									type="button"
									variant={paymentStatus === "paid" ? "default" : "outline"}
									onClick={() => onPaymentStatusChange("paid")}
								>
									Paid
								</Button>
							</div>
						</div>
					</div>

					<div className="grid gap-3">
						{cartProductRows.length === 0 && cartServiceRows.length === 0 ? (
							<div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
								Cart is empty. Add products or services from the catalog.
							</div>
						) : null}

						{cartProductRows.map((line) => (
							<div
								key={`product-${line.id}`}
								className="grid gap-3 border border-border/70 p-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium">{line.product.name}</p>
										<p className="text-xs text-muted-foreground">
											Product |{" "}
											{getEntityCategoryName(line.product, categoryMap)}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="icon-xs"
										onClick={() => onRemoveProduct(line.id)}
										icon={<X className="size-4" weight="duotone" />}
									/>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											onClick={() =>
												onUpdateProductQty(
													line.id,
													line.qty - 1,
													Number(line.product.stock ?? line.qty),
												)
											}
										>
											-
										</Button>
										<div className="min-w-10 text-center text-sm font-medium">
											{line.qty}
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											onClick={() =>
												onUpdateProductQty(
													line.id,
													line.qty + 1,
													Number(line.product.stock ?? line.qty),
												)
											}
											disabled={
												line.qty >= Number(line.product.stock ?? line.qty)
											}
										>
											+
										</Button>
									</div>
									<p className="text-sm font-semibold">
										{formatIDRCurrency(
											String(Number(line.product.price) * line.qty),
										)}
									</p>
								</div>
							</div>
						))}

						{cartServiceRows.map((line) => (
							<div
								key={`service-${line.id}`}
								className="grid gap-3 border border-border/70 p-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium">{line.service.name}</p>
										<p className="text-xs text-muted-foreground">
											Service |{" "}
											{getEntityCategoryName(line.service, categoryMap)}
										</p>
									</div>
									<Button
										type="button"
										variant="outline"
										size="icon-xs"
										onClick={() => onRemoveService(line.id)}
										icon={<X className="size-4" weight="duotone" />}
									/>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor={`service-brand-${line.id}`} asterisk>
											Shoe Brand
										</FieldLabel>
										<Input
											id={`service-brand-${line.id}`}
											value={line.shoe_brand}
											onChange={(event) =>
												onUpdateServiceBrand(line.id, event.target.value)
											}
											placeholder="e.g. Nike"
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor={`service-size-${line.id}`} asterisk>
											Shoe Size
										</FieldLabel>
										<Input
											id={`service-size-${line.id}`}
											value={line.shoe_size}
											onChange={(event) =>
												onUpdateServiceSize(line.id, event.target.value)
											}
											placeholder="e.g. 42"
										/>
									</Field>
								</div>
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											onClick={() => onUpdateServiceQty(line.id, line.qty - 1)}
										>
											-
										</Button>
										<div className="min-w-10 text-center text-sm font-medium">
											{line.qty}
										</div>
										<Button
											type="button"
											variant="outline"
											size="icon-xs"
											onClick={() => onUpdateServiceQty(line.id, line.qty + 1)}
										>
											+
										</Button>
									</div>
									<p className="text-sm font-semibold">
										{formatIDRCurrency(
											String(Number(line.service.price) * line.qty),
										)}
									</p>
								</div>
							</div>
						))}
					</div>

					<div className="grid gap-4 border-t border-border/70 pt-4">
						{selectedCampaign ? (
							<div className="flex items-center justify-between gap-3 border border-emerald-300/60 bg-emerald-50/70 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
								<div>
									<p className="font-medium">{selectedCampaign.name}</p>
									<p className="text-xs text-muted-foreground">
										{selectedCampaign.code} active on this store
									</p>
								</div>
								<Badge variant="success">
									{selectedCampaign.discount_type === "percentage"
										? `${selectedCampaign.discount_value}%`
										: formatIDRCurrency(
												String(selectedCampaign.discount_value),
											)}
								</Badge>
							</div>
						) : null}

						<Field>
							<FieldLabel htmlFor="transaction-discount">
								Manual Discount
							</FieldLabel>
							<CurrencyInput
								id="transaction-discount"
								value={manualDiscount}
								onValueChange={onManualDiscountChange}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="transaction-notes">Notes</FieldLabel>
							<Textarea
								id="transaction-notes"
								value={notes}
								onChange={(event) => onNotesChange(event.target.value)}
								placeholder="Add cashier notes or customer preferences"
							/>
						</Field>

						<div className="grid gap-2 border border-border/70 p-4">
							<div className="flex items-center justify-between gap-3 text-sm">
								<div className="flex items-center gap-2">
									<Storefront
										className="size-4 text-muted-foreground"
										weight="duotone"
									/>
									<span className="text-muted-foreground">Store</span>
								</div>
								<span className="font-medium">
									{selectedStore?.name ?? "-"}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 text-sm">
								<div className="flex items-center gap-2">
									<CreditCard
										className="size-4 text-muted-foreground"
										weight="duotone"
									/>
									<span className="text-muted-foreground">Payment</span>
								</div>
								<span className="font-medium capitalize">{paymentStatus}</span>
							</div>
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-muted-foreground">Subtotal</span>
								<span className="font-medium">
									{formatIDRCurrency(String(subtotal))}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-muted-foreground">Campaign Discount</span>
								<span className="font-medium">
									-{formatIDRCurrency(String(Math.round(campaignDiscount)))}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="text-muted-foreground">Manual Discount</span>
								<span className="font-medium">
									-{formatIDRCurrency(String(discountValue))}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-base font-semibold">
								<span>Total Payment</span>
								<span>{formatIDRCurrency(String(Math.round(total)))}</span>
							</div>
						</div>

						<FieldError
							errors={submitError ? [{ message: submitError }] : []}
						/>

						<Button
							type="button"
							size="lg"
							onClick={onSubmit}
							loading={isSubmitting}
							loadingText="Creating order..."
							disabled={cartCount === 0}
						>
							Continue
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
