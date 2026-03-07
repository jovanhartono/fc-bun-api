import {
	MagnifyingGlass,
	Package,
	Plus,
	Scissors,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
	CatalogMode,
	CategoryFilter,
	CategoryTab,
} from "@/features/transactions/lib/transactions";
import { getEntityCategoryName } from "@/features/transactions/lib/transactions";
import type { Category, Product, Service, Store } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatIDRCurrency } from "@/shared/utils";

const listButtonClassName =
	"rounded-none border px-3 py-2 text-left text-xs transition-colors sm:text-sm";

type TransactionsCatalogProps = {
	mode: CatalogMode;
	searchTerm: string;
	isAdmin: boolean;
	visibleStores: Store[];
	selectedStoreId: string;
	products: Product[];
	services: Service[];
	productTabs: CategoryTab[];
	serviceTabs: CategoryTab[];
	activeProductCategory: CategoryFilter;
	activeServiceCategory: CategoryFilter;
	activeItems: Product[] | Service[];
	categoryMap: Map<number, Category>;
	productCartQtyById: Map<number, number>;
	serviceCartQtyById: Map<number, number>;
	onSearchTermChange: (value: string) => void;
	onStoreChange: (value: string) => void;
	onModeChange: (mode: CatalogMode) => void;
	onProductCategoryChange: (category: CategoryFilter) => void;
	onServiceCategoryChange: (category: CategoryFilter) => void;
	onAddProduct: (product: Product) => void;
	onAddService: (service: Service) => void;
};

export function TransactionsCatalog({
	mode,
	searchTerm,
	isAdmin,
	visibleStores,
	selectedStoreId,
	products,
	services,
	productTabs,
	serviceTabs,
	activeProductCategory,
	activeServiceCategory,
	activeItems,
	categoryMap,
	productCartQtyById,
	serviceCartQtyById,
	onSearchTermChange,
	onStoreChange,
	onModeChange,
	onProductCategoryChange,
	onServiceCategoryChange,
	onAddProduct,
	onAddService,
}: TransactionsCatalogProps) {
	return (
		<div className="grid gap-5 self-start xl:sticky xl:top-24">
			<Card className="border-border/70">
				<CardContent className="grid gap-4 p-4 sm:p-5">
					<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
						<div>
							<div className="relative">
								<MagnifyingGlass
									className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
									weight="duotone"
								/>
								<Input
									value={searchTerm}
									onChange={(event) => onSearchTermChange(event.target.value)}
									placeholder="Search products, services, or categories"
									className="h-11 pl-9"
								/>
							</div>
						</div>
						<Field>
							<FieldLabel htmlFor="transaction-store" asterisk>
								Store Context
							</FieldLabel>
							<Combobox
								id="transaction-store"
								required
								triggerClassName="h-11 w-full text-sm"
								options={visibleStores.map((store) => ({
									value: String(store.id),
									label: `${store.code} - ${store.name}`,
								}))}
								value={selectedStoreId}
								onValueChange={onStoreChange}
								placeholder="Select store"
								searchPlaceholder="Search store..."
								emptyText="No store available"
								disabled={!isAdmin}
							/>
							<FieldDescription>
								{isAdmin
									? "Store controls campaign availability and final order destination."
									: "Cashier store is prefilled from assigned access."}
							</FieldDescription>
						</Field>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={cn(
								listButtonClassName,
								mode === "products"
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background hover:bg-muted",
							)}
							onClick={() => onModeChange("products")}
						>
							<span className="flex items-center gap-2">
								<Package className="size-4" weight="duotone" />
								Products
								<Badge variant={mode === "products" ? "secondary" : "outline"}>
									{products.length}
								</Badge>
							</span>
						</button>
						<button
							type="button"
							className={cn(
								listButtonClassName,
								mode === "services"
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background hover:bg-muted",
							)}
							onClick={() => onModeChange("services")}
						>
							<span className="flex items-center gap-2">
								<Scissors className="size-4" weight="duotone" />
								Services
								<Badge variant={mode === "services" ? "secondary" : "outline"}>
									{services.length}
								</Badge>
							</span>
						</button>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={cn(
								listButtonClassName,
								(mode === "products"
									? activeProductCategory
									: activeServiceCategory) === "all"
									? "border-primary bg-primary text-primary-foreground"
									: "border-border bg-background hover:bg-muted",
							)}
							onClick={() => {
								if (mode === "products") {
									onProductCategoryChange("all");
									return;
								}

								onServiceCategoryChange("all");
							}}
						>
							All
						</button>
						{(mode === "products" ? productTabs : serviceTabs).map((tab) => {
							const activeCategory =
								mode === "products"
									? activeProductCategory
									: activeServiceCategory;

							return (
								<button
									key={`${mode}-${tab.id}`}
									type="button"
									className={cn(
										listButtonClassName,
										activeCategory === tab.id
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-background hover:bg-muted",
									)}
									onClick={() => {
										if (mode === "products") {
											onProductCategoryChange(tab.id);
											return;
										}

										onServiceCategoryChange(tab.id);
									}}
								>
									<span className="flex items-center gap-2">
										{tab.label}
										<Badge
											variant={
												activeCategory === tab.id ? "secondary" : "outline"
											}
										>
											{tab.count}
										</Badge>
									</span>
								</button>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
				{activeItems.map((item) => {
					const isProduct = mode === "products";
					const itemCount = isProduct
						? (productCartQtyById.get(item.id) ?? 0)
						: (serviceCartQtyById.get(item.id) ?? 0);
					const isOutOfStock =
						isProduct && Number((item as Product).stock ?? 0) <= itemCount;

					return (
						<Card
							key={`${mode}-${item.id}`}
							className="overflow-hidden border-border/70 transition-colors hover:border-primary/60"
						>
							<CardContent className="grid h-full gap-4 p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-semibold sm:text-base">
											{item.name}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
											{getEntityCategoryName(item, categoryMap)}
										</p>
									</div>
									<Badge variant={isProduct ? "info" : "warning"}>
										{isProduct
											? `${Number((item as Product).stock ?? 0)} stock`
											: "Service"}
									</Badge>
								</div>

								<p className="min-h-12 text-sm text-muted-foreground">
									{item.description?.trim() ||
										"Ready to add into a live transaction."}
								</p>

								<div className="mt-auto flex items-end justify-between gap-3">
									<div>
										<p className="text-lg font-semibold">
											{formatIDRCurrency(String(item.price))}
										</p>
										<p className="text-xs text-muted-foreground">
											{itemCount > 0
												? `${itemCount} line${itemCount === 1 ? "" : "s"} currently in cart`
												: "Not in cart yet"}
										</p>
									</div>
									<Button
										type="button"
										onClick={() =>
											isProduct
												? onAddProduct(item as Product)
												: onAddService(item as Service)
										}
										disabled={Boolean(isOutOfStock)}
										icon={<Plus className="size-4" weight="duotone" />}
									>
										{isOutOfStock ? "Max stock" : "Add to cart"}
									</Button>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{activeItems.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center text-sm text-muted-foreground">
						No catalog items match the current filters.
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
