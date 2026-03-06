import { POSTOrderSchema } from "@fresclean/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "@phosphor-icons/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { CurrencyInput } from "@/components/form/currency-input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerAutocomplete } from "@/features/orders/components/customer-autocomplete";
import { PaymentMethodAutocomplete } from "@/features/orders/components/payment-method-autocomplete";
import { ProductAutocomplete } from "@/features/orders/components/product-autocomplete";
import { ServiceAutocomplete } from "@/features/orders/components/service-autocomplete";
import { StoreAutocomplete } from "@/features/orders/components/store-autocomplete";
import type { CreateOrderPayload } from "@/lib/api";

export type OrderFormState = {
	customer_id: string;
	store_id: string;
	payment_method_id: string;
	payment_status: "paid" | "partial" | "unpaid";
	discount: string;
	notes: string;
	products: Array<{
		id: string;
		qty: string;
	}>;
	services: Array<{
		id: string;
		qty: string;
	}>;
};

const defaultForm: OrderFormState = {
	customer_id: "",
	store_id: "",
	payment_method_id: "",
	payment_status: "unpaid",
	discount: "0",
	notes: "",
	products: [{ id: "", qty: "1" }],
	services: [{ id: "", qty: "1" }],
};

function toOrderPayload(values: OrderFormState): CreateOrderPayload {
	return {
		customer_id: Number(values.customer_id),
		store_id: Number(values.store_id),
		products: values.products
			.filter((product) => !!product.id)
			.map((product) => ({
				id: Number(product.id),
				qty: Number(product.qty),
				notes: undefined,
			})),
		services: values.services
			.filter((service) => !!service.id)
			.map((service) => ({
				id: Number(service.id),
				qty: Number(service.qty),
				notes: undefined,
			})),
		discount: values.discount ?? "0",
		payment_method_id: values.payment_method_id
			? Number(values.payment_method_id)
			: undefined,
		payment_status: values.payment_status,
		notes: values.notes || undefined,
	};
}

const orderFormResolverSchema = z
	.object({
		...POSTOrderSchema.shape,
		customer_id: z.string().trim().min(1, "Customer is required"),
		store_id: z.string().trim().min(1, "Store ID is required"),
		payment_method_id: z.string(),
		discount: z.string(),
		notes: z.string(),
		products: z.array(
			z.object({
				id: z.string(),
				qty: z.string(),
				notes: z.string().optional(),
			}),
		),
		services: z.array(
			z.object({
				id: z.string(),
				qty: z.string(),
				notes: z.string().optional(),
			}),
		),
	})
	.superRefine((values, ctx) => {
		const parsed = POSTOrderSchema.safeParse(toOrderPayload(values));
		if (parsed.success) {
			return;
		}

		for (const issue of parsed.error.issues) {
			const issuePath = String(issue.path[0] ?? "");
			let path = issue.path;
			if (issuePath === "products_ids") {
				path = ["products", 0, "id"];
			}
			if (issuePath === "services_ids") {
				path = ["services", 0, "id"];
			}
			ctx.addIssue({
				code: "custom",
				path,
				message: issue.message,
			});
		}
	});

type OrderFormProps = {
	defaultValues?: OrderFormState;
	handleOnSubmit: (values: CreateOrderPayload) => Promise<void> | void;
	isSubmitting?: boolean;
};

export function OrderForm({ defaultValues, handleOnSubmit }: OrderFormProps) {
	const form = useForm({
		resolver: zodResolver(orderFormResolverSchema),
		defaultValues: defaultValues ?? defaultForm,
	});
	const isSubmitting = form.formState.isSubmitting;

	const productFields = useFieldArray({
		control: form.control,
		name: "products",
	});
	const serviceFields = useFieldArray({
		control: form.control,
		name: "services",
	});

	return (
		<form
			onSubmit={form.handleSubmit(async (values) => {
				await handleOnSubmit(toOrderPayload(values));
			})}
		>
			<FieldGroup>
				<Controller
					name="customer_id"
					control={form.control}
					render={({ field, fieldState }) => (
						<CustomerAutocomplete
							value={field.value}
							onValueChange={field.onChange}
							disabled={isSubmitting}
							required
							error={fieldState.error}
						/>
					)}
				/>

				<Controller
					name="store_id"
					control={form.control}
					render={({ field, fieldState }) => (
						<StoreAutocomplete
							value={field.value}
							onValueChange={field.onChange}
							disabled={isSubmitting}
							required
							error={fieldState.error}
						/>
					)}
				/>

				<Controller
					name="payment_method_id"
					control={form.control}
					render={({ field, fieldState }) => (
						<PaymentMethodAutocomplete
							value={field.value}
							onValueChange={field.onChange}
							disabled={isSubmitting}
							error={fieldState.error}
						/>
					)}
				/>

				<Controller
					name="payment_status"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="order-payment-status" asterisk>
								Payment Status
							</FieldLabel>
							<Combobox
								id="order-payment-status"
								required
								triggerClassName="h-10 w-full text-sm"
								options={[
									{ value: "unpaid", label: "unpaid" },
									{ value: "partial", label: "partial" },
									{ value: "paid", label: "paid" },
								]}
								value={field.value}
								onValueChange={(value) =>
									field.onChange(
										(value ?? "unpaid") as OrderFormState["payment_status"],
									)
								}
								placeholder="Select payment status"
								searchPlaceholder="Search payment status..."
								emptyText="No status found"
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<div className="grid gap-3">
					<div className="flex items-center justify-between">
						<FieldLabel>Products</FieldLabel>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={isSubmitting}
							onClick={() =>
								productFields.append({
									id: "",
									qty: "1",
								})
							}
						>
							Add Product
						</Button>
					</div>
					<FieldError
						errors={[form.formState.errors.products as { message?: string }]}
					/>
					{productFields.fields.map((item, index) => (
						<div key={item.id} className="grid gap-3 md:grid-cols-2">
							<Controller
								name={`products.${index}.id`}
								control={form.control}
								render={({ field, fieldState }) => (
									<ProductAutocomplete
										id={`order-product-${index}`}
										label={`Product ${index + 1} (optional)`}
										value={field.value}
										onValueChange={field.onChange}
										disabled={isSubmitting}
										error={fieldState.error}
									/>
								)}
							/>

							<Controller
								name={`products.${index}.qty`}
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`order-product-qty-${index}`}>
											Qty
										</FieldLabel>
										<Input
											{...field}
											id={`order-product-qty-${index}`}
											type="number"
											placeholder="e.g. 1"
											min={1}
											aria-invalid={fieldState.invalid}
											disabled={isSubmitting}
											className="h-10 w-full text-sm md:h-10"
										/>
										<FieldError errors={[fieldState.error]} />
									</Field>
								)}
							/>

							{productFields.fields.length > 1 ? (
								<div className="md:col-span-2 md:justify-self-end">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isSubmitting}
										onClick={() => productFields.remove(index)}
									>
										Remove
									</Button>
								</div>
							) : null}
						</div>
					))}
				</div>

				<div className="grid gap-3">
					<div className="flex items-center justify-between">
						<FieldLabel>Services</FieldLabel>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={isSubmitting}
							onClick={() =>
								serviceFields.append({
									id: "",
									qty: "1",
								})
							}
						>
							Add Service
						</Button>
					</div>
					<FieldError
						errors={[form.formState.errors.services as { message?: string }]}
					/>
					{serviceFields.fields.map((item, index) => (
						<div key={item.id} className="grid gap-3 md:grid-cols-2">
							<Controller
								name={`services.${index}.id`}
								control={form.control}
								render={({ field, fieldState }) => (
									<ServiceAutocomplete
										id={`order-service-${index}`}
										label={`Service ${index + 1} (optional)`}
										value={field.value}
										onValueChange={field.onChange}
										disabled={isSubmitting}
										error={fieldState.error}
									/>
								)}
							/>

							<Controller
								name={`services.${index}.qty`}
								control={form.control}
								render={({ field, fieldState }) => (
									<Field data-invalid={fieldState.invalid}>
										<FieldLabel htmlFor={`order-service-qty-${index}`}>
											Qty
										</FieldLabel>
										<Input
											{...field}
											id={`order-service-qty-${index}`}
											type="number"
											placeholder="e.g. 1"
											min={1}
											aria-invalid={fieldState.invalid}
											disabled={isSubmitting}
											className="h-10 w-full text-sm md:h-10"
										/>
										<FieldError errors={[fieldState.error]} />
									</Field>
								)}
							/>

							{serviceFields.fields.length > 1 ? (
								<div className="md:col-span-2 md:justify-self-end">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={isSubmitting}
										onClick={() => serviceFields.remove(index)}
									>
										Remove
									</Button>
								</div>
							) : null}
						</div>
					))}
				</div>

				<Controller
					name="discount"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="order-discount">Discount</FieldLabel>
							<CurrencyInput
								id="order-discount"
								placeholder="Rp0"
								value={field.value ?? "0"}
								onValueChange={field.onChange}
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="notes"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} className="md:col-span-2">
							<FieldLabel htmlFor="order-notes">Notes</FieldLabel>
							<Textarea
								{...field}
								id="order-notes"
								placeholder="e.g. Customer prefers express service"
								aria-invalid={fieldState.invalid}
								disabled={isSubmitting}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<div className="md:col-span-2 md:justify-end">
					<Button
						type="submit"
						loading={isSubmitting}
						loadingText="Creating order..."
						icon={<Plus className="size-4" weight="duotone" />}
					>
						Create Order
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
