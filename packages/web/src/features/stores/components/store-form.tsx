import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus } from "@phosphor-icons/react";
import { PhoneNumberField } from "@/components/form/phone-number-field";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export type StoreFormState = {
	code: string;
	name: string;
	phone_number: string;
	address: string;
	latitude: string;
	longitude: string;
	is_active: boolean;
};

type StoreFormProps = {
	form: StoreFormState;
	setForm: Dispatch<SetStateAction<StoreFormState>>;
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onReset: () => void;
};

export function StoreForm({
	form,
	setForm,
	isSubmitting,
	isEditing,
	onSubmit,
	onReset,
}: StoreFormProps) {
	return (
		<form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={onSubmit}>
			<Field>
				<FieldLabel htmlFor="store-code">Code</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="store-code"
					placeholder="e.g. STR-JKT-01"
					value={form.code}
					onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
					disabled={isSubmitting}
					required
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="store-name">Name</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="store-name"
					placeholder="e.g. Fresclean Sudirman"
					value={form.name}
					onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
					disabled={isSubmitting}
					required
				/>
			</Field>
			<PhoneNumberField
				id="store-phone"
				label="Phone"
				value={form.phone_number}
				placeholder="e.g. +628123456789"
				onValueChange={(nextValue) =>
					setForm((prev) => ({ ...prev, phone_number: nextValue }))
				}
				disabled={isSubmitting}
				required
			/>
			<Field className="md:col-span-2">
				<FieldLabel htmlFor="store-address">Address</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="store-address"
					placeholder="e.g. Jl. Sudirman No. 10"
					value={form.address}
					onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
					disabled={isSubmitting}
					required
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="store-latitude">Latitude</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="store-latitude"
					placeholder="e.g. -6.200000"
					value={form.latitude}
					onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
					disabled={isSubmitting}
					required
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="store-longitude">Longitude</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="store-longitude"
					placeholder="e.g. 106.816666"
					value={form.longitude}
					onChange={(e) =>
						setForm((p) => ({ ...p, longitude: e.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>
			<Field className="flex-row items-center justify-between md:col-span-2">
				<FieldLabel htmlFor="store-active">Active</FieldLabel>
				<Switch
					id="store-active"
					checked={form.is_active}
					onCheckedChange={(checked) =>
						setForm((p) => ({ ...p, is_active: !!checked }))
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
					{isEditing ? "Update Store" : "Create Store"}
				</Button>
			</div>
		</form>
	);
}
