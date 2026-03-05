import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus } from "@phosphor-icons/react";
import { CurrencyInput } from "@/components/form/currency-input";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export type ProductFormState = {
	name: string;
	description: string;
	is_active: boolean;
	sku: string;
	uom: string;
	stock: string;
	category_id: string;
	cogs: string;
	price: string;
};

type ProductFormProps = {
	form: ProductFormState;
	setForm: Dispatch<SetStateAction<ProductFormState>>;
	categories: Array<{ id: number; name: string }>;
	categoriesLoading?: boolean;
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onReset: () => void;
};

export function ProductForm({
	form,
	setForm,
	categories,
	categoriesLoading,
	isSubmitting,
	isEditing,
	onSubmit,
	onReset,
}: ProductFormProps) {
	return (
		<form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={onSubmit}>
			<Field>
				<FieldLabel htmlFor="product-name">Name</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="product-name"
					placeholder="e.g. Liquid Detergent"
					value={form.name}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, name: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-sku">SKU</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="product-sku"
					placeholder="e.g. PRD-001"
					value={form.sku}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, sku: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-category">Category</FieldLabel>
				<Combobox
					id="product-category"
					required
					triggerClassName="h-10 w-full text-sm"
					options={categories.map((category) => ({
						value: String(category.id),
						label: category.name,
					}))}
					value={form.category_id}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, category_id: value }))
					}
					loading={categoriesLoading}
					placeholder="Select category"
					searchPlaceholder="Search category..."
					emptyText="No category found"
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-uom">UOM</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="product-uom"
					placeholder="e.g. pcs"
					value={form.uom}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, uom: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-stock">Stock</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="product-stock"
					type="number"
					placeholder="e.g. 100"
					value={form.stock}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, stock: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field className="md:col-span-2">
				<FieldLabel htmlFor="product-description">Description</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="product-description"
					placeholder="e.g. 1L refill bottle"
					value={form.description}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, description: event.target.value }))
					}
					disabled={isSubmitting}
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-cogs">COGS</FieldLabel>
				<CurrencyInput
					id="product-cogs"
					placeholder="Rp0"
					value={form.cogs}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, cogs: value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="product-price">Price</FieldLabel>
				<CurrencyInput
					id="product-price"
					placeholder="Rp0"
					value={form.price}
					onValueChange={(value) =>
						setForm((prev) => ({ ...prev, price: value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field className="flex-row items-center justify-between md:col-span-2">
				<FieldLabel htmlFor="product-active">Active</FieldLabel>
				<Switch
					id="product-active"
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
					{isEditing ? "Update Product" : "Create Product"}
				</Button>
			</div>
		</form>
	);
}
