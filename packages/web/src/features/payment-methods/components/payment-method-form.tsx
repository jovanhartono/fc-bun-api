import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export type PaymentMethodFormState = {
	name: string;
	code: string;
	is_active: boolean;
};

type PaymentMethodFormProps = {
	form: PaymentMethodFormState;
	setForm: Dispatch<SetStateAction<PaymentMethodFormState>>;
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onReset: () => void;
};

export function PaymentMethodForm({
	form,
	setForm,
	isSubmitting,
	isEditing,
	onSubmit,
	onReset,
}: PaymentMethodFormProps) {
	return (
		<form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={onSubmit}>
			<Field>
				<FieldLabel htmlFor="payment-method-name">Name</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="payment-method-name"
					placeholder="e.g. Cash"
					value={form.name}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, name: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="payment-method-code">Code</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="payment-method-code"
					placeholder="e.g. CASH"
					value={form.code}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, code: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field className="flex-row items-center justify-between md:col-span-2">
				<FieldLabel htmlFor="payment-method-active">Active</FieldLabel>
				<Switch
					id="payment-method-active"
					checked={form.is_active}
					onCheckedChange={(checked) =>
						setForm((prev) => ({ ...prev, is_active: !!checked }))
					}
					disabled={isSubmitting}
				/>
			</Field>

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
				<Button type="submit" disabled={isSubmitting}>
					<Plus className="size-4" weight="duotone" />
					{isEditing ? "Update Method" : "Create Method"}
				</Button>
			</div>
		</form>
	);
}
