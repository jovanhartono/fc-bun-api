import { Plus } from "@phosphor-icons/react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { CurrencyInput } from "@/components/form/currency-input";
import { PhoneNumberField } from "@/components/form/phone-number-field";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type OrderFormState = {
	customer_name: string;
	customer_phone: string;
	customer_id: string;
	store_id: string;
	payment_method_id: string;
	payment_status: "paid" | "partial" | "unpaid";
	discount: string;
	notes: string;
	product_id: string;
	product_qty: string;
	service_id: string;
	service_qty: string;
};

type NamedOption = { id: number; name: string };

type OrderFormProps = {
	form: OrderFormState;
	setForm: Dispatch<SetStateAction<OrderFormState>>;
	isSubmitting: boolean;
	customers: NamedOption[];
	customersLoading?: boolean;
	stores: NamedOption[];
	storesLoading?: boolean;
	paymentMethods: NamedOption[];
	paymentMethodsLoading?: boolean;
	products: NamedOption[];
	productsLoading?: boolean;
	services: NamedOption[];
	servicesLoading?: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function OrderForm({
	form,
	setForm,
	isSubmitting,
	customers,
	customersLoading,
	stores,
	storesLoading,
	paymentMethods,
	paymentMethodsLoading,
	products,
	productsLoading,
	services,
	servicesLoading,
	onSubmit,
}: OrderFormProps) {
	return (
		<form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={onSubmit}>
			<Field>
				<FieldLabel htmlFor="order-customer-name">Customer Name</FieldLabel>
				<Input
					id="order-customer-name"
					placeholder="e.g. John Doe"
					value={form.customer_name}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, customer_name: event.target.value }))
					}
					disabled={isSubmitting}
					required
					className="h-10"
				/>
			</Field>

			<PhoneNumberField
				id="order-customer-phone"
				label="Customer Phone"
				value={form.customer_phone}
				placeholder="e.g. +628123456789"
				onValueChange={(nextValue) =>
					setForm((prev) => ({ ...prev, customer_phone: nextValue }))
				}
				disabled={isSubmitting}
				required
			/>

			<Field>
				<FieldLabel htmlFor="order-customer">Customer Reference</FieldLabel>
				<Combobox
					id="order-customer"
					required
					triggerClassName="h-10 w-full text-sm"
					options={customers.map((customer) => ({
						value: String(customer.id),
						label: customer.name,
					}))}
					value={form.customer_id}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, customer_id: value }))
					}
					loading={customersLoading}
					placeholder="Select customer"
					searchPlaceholder="Search customer..."
					emptyText="No customer found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-store">Store</FieldLabel>
				<Combobox
					id="order-store"
					required
					triggerClassName="h-10 w-full text-sm"
					options={stores.map((store) => ({
						value: String(store.id),
						label: store.name,
					}))}
					value={form.store_id}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, store_id: value }))
					}
					loading={storesLoading}
					placeholder="Select store"
					searchPlaceholder="Search store..."
					emptyText="No store found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-payment-method">Payment Method</FieldLabel>
				<Combobox
					id="order-payment-method"
					triggerClassName="h-10 w-full text-sm"
					options={[
						{ value: "none", label: "No payment method" },
						...paymentMethods.map((paymentMethod) => ({
							value: String(paymentMethod.id),
							label: paymentMethod.name,
						})),
					]}
					value={form.payment_method_id || "none"}
					onValueChange={(value) =>
						setForm((prev) => ({
							...prev,
							payment_method_id: !value || value === "none" ? "" : value,
						}))
					}
					loading={paymentMethodsLoading}
					placeholder="No payment method"
					searchPlaceholder="Search payment method..."
					emptyText="No payment method found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-payment-status">Payment Status</FieldLabel>
				<Combobox
					id="order-payment-status"
					required
					triggerClassName="h-10 w-full text-sm"
					options={[
						{ value: "unpaid", label: "unpaid" },
						{ value: "partial", label: "partial" },
						{ value: "paid", label: "paid" },
					]}
					value={form.payment_status}
					onValueChange={(value) =>
						setForm((prev) => ({
							...prev,
							payment_status: (value ??
								"unpaid") as OrderFormState["payment_status"],
						}))
					}
					placeholder="Select payment status"
					searchPlaceholder="Search payment status..."
					emptyText="No status found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-product">Product (optional)</FieldLabel>
				<Combobox
					id="order-product"
					triggerClassName="h-10 w-full text-sm"
					options={[
						{ value: "none", label: "No product" },
						...products.map((product) => ({
							value: String(product.id),
							label: product.name,
						})),
					]}
					value={form.product_id || "none"}
					onValueChange={(value) =>
						setForm((prev) => ({
							...prev,
							product_id: !value || value === "none" ? "" : value,
						}))
					}
					loading={productsLoading}
					placeholder="No product"
					searchPlaceholder="Search product..."
					emptyText="No product found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-product-qty">Product Qty</FieldLabel>
				<Input
					id="order-product-qty"
					type="number"
					placeholder="e.g. 1"
					min={1}
					value={form.product_qty}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, product_qty: event.target.value }))
					}
					disabled={isSubmitting}
					className="h-10"
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-service">Service (optional)</FieldLabel>
				<Combobox
					id="order-service"
					triggerClassName="h-10 w-full text-sm"
					options={[
						{ value: "none", label: "No service" },
						...services.map((service) => ({
							value: String(service.id),
							label: service.name,
						})),
					]}
					value={form.service_id || "none"}
					onValueChange={(value) =>
						setForm((prev) => ({
							...prev,
							service_id: !value || value === "none" ? "" : value,
						}))
					}
					loading={servicesLoading}
					placeholder="No service"
					searchPlaceholder="Search service..."
					emptyText="No service found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-service-qty">Service Qty</FieldLabel>
				<Input
					id="order-service-qty"
					type="number"
					placeholder="e.g. 1"
					min={1}
					value={form.service_qty}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, service_qty: event.target.value }))
					}
					disabled={isSubmitting}
					className="h-10"
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="order-discount">Discount</FieldLabel>
				<CurrencyInput
					id="order-discount"
					placeholder="Rp0"
					value={form.discount}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, discount: value }))
					}
					disabled={isSubmitting}
				/>
			</Field>

			<Field className="md:col-span-2">
				<FieldLabel htmlFor="order-notes">Notes</FieldLabel>
				<Input
					id="order-notes"
					placeholder="e.g. Customer prefers express service"
					value={form.notes}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, notes: event.target.value }))
					}
					disabled={isSubmitting}
					className="h-10"
				/>
			</Field>

			<div className="md:col-span-2 md:justify-end">
				<Button
					type="submit"
					loading={isSubmitting}
					loadingText="Creating order..."
				>
					<Plus className="size-4" weight="duotone" />
					Create Order
				</Button>
			</div>
		</form>
	);
}
