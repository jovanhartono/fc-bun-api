import { POSTServiceSchema } from "@fresclean/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { CurrencyInput } from "@/components/form/currency-input";
import { Button } from "@/components/ui/button";
  import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CategoryAutocomplete } from "@/features/orders/components/category-autocomplete";

const serviceFormResolverSchema = z.object({
	...POSTServiceSchema.shape,
	category_id: z.preprocess(
		(value) => Number(value),
		POSTServiceSchema.shape.category_id,
	),
});

export type ServiceFormState = z.infer<typeof serviceFormResolverSchema>;

const defaultForm: ServiceFormState = {
	category_id: 0,
	code: "",
	cogs: "",
	price: "",
	name: "",
	description: "",
	is_active: true,
};

type ServiceFormProps = {
	defaultValues?: ServiceFormState;
	handleOnSubmit: (values: ServiceFormState) => Promise<void> | void;
	isEditing: boolean;
	onReset: () => void;
};

export function ServiceForm({
	defaultValues,
	handleOnSubmit,
	isEditing,
	onReset,
}: ServiceFormProps) {
	const form = useForm({
		resolver: zodResolver(serviceFormResolverSchema),
		defaultValues: defaultValues ?? defaultForm,
	});
	const isSubmitting = form.formState.isSubmitting;

	return (
		<form onSubmit={form.handleSubmit(handleOnSubmit)}>
			<FieldGroup>
				<Controller
					name="category_id"
					control={form.control}
					render={({ field, fieldState }) => (
						<CategoryAutocomplete
							value={field.value ? String(field.value) : ""}
							onValueChange={(value) => field.onChange(Number(value))}
							required
							disabled={isSubmitting}
							error={fieldState.error}
						/>
					)}
				/>

				<Controller
					name="code"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="service-code">Code</FieldLabel>
							<Input
								{...field}
								id="service-code"
								placeholder="e.g. SVC-001"
								aria-invalid={fieldState.invalid}
								disabled={isSubmitting}
								required
								className="h-10"
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
							<FieldLabel htmlFor="service-name">Name</FieldLabel>
							<Input
								{...field}
								id="service-name"
								placeholder="e.g. Dry Clean Premium"
								aria-invalid={fieldState.invalid}
								disabled={isSubmitting}
								required
								className="h-10"
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="description"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid} className="md:col-span-2">
							<FieldLabel htmlFor="service-description">Description</FieldLabel>
							<Input
								{...field}
								id="service-description"
								placeholder="e.g. 24-hour turnaround"
								aria-invalid={fieldState.invalid}
								value={field.value ?? ""}
								disabled={isSubmitting}
								className="h-10"
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="cogs"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="service-cogs">COGS</FieldLabel>
							<CurrencyInput
								id="service-cogs"
								placeholder="Rp0"
								value={field.value}
								onValueChange={field.onChange}
								disabled={isSubmitting}
								required
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="price"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="service-price">Price</FieldLabel>
							<CurrencyInput
								id="service-price"
								placeholder="Rp0"
								value={field.value}
								onValueChange={field.onChange}
								disabled={isSubmitting}
								required
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					name="is_active"
					control={form.control}
					render={({ field }) => (
						<Field className="flex-row items-center justify-between md:col-span-2">
							<FieldLabel htmlFor="service-active">Active</FieldLabel>
							<Switch
								id="service-active"
								checked={field.value}
								onCheckedChange={(checked) => field.onChange(!!checked)}
								disabled={isSubmitting}
							/>
						</Field>
					)}
				/>

				<div className="flex flex-wrap gap-2 md:col-span-2 md:justify-end">
					{isEditing ? (
						<Button
							type="button"
							variant="outline"
							onClick={onReset}
							disabled={isSubmitting}
						>
							Cancel edit
						</Button>
					) : null}
					<Button
						type="submit"
						loading={isSubmitting}
						icon={<PlusIcon className="size-4" weight="duotone" />}
					>
						{isEditing ? "Update Service" : "Create Service"}
					</Button>
				</div>
			</FieldGroup>
		</form>
	);
}
