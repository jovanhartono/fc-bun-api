import { create } from "zustand";
import type {
	CatalogMode,
	CategoryFilter,
	ProductCartLine,
	ServiceCartLine,
} from "@/features/transactions/lib/transactions";
import type { CreateOrderPayload } from "@/lib/api";

type TransactionsStore = {
	mode: CatalogMode;
	searchTerm: string;
	activeProductCategory: CategoryFilter;
	activeServiceCategory: CategoryFilter;
	selectedStoreId: string;
	selectedCustomerId: string;
	selectedCampaignId: string;
	selectedPaymentMethodId: string;
	paymentStatus: CreateOrderPayload["payment_status"];
	manualDiscount: string;
	notes: string;
	productCart: ProductCartLine[];
	serviceCart: ServiceCartLine[];
	submitError: string;
	setMode: (mode: CatalogMode) => void;
	setSearchTerm: (searchTerm: string) => void;
	setActiveProductCategory: (category: CategoryFilter) => void;
	setActiveServiceCategory: (category: CategoryFilter) => void;
	setSelectedStoreId: (storeId: string) => void;
	setSelectedCustomerId: (customerId: string) => void;
	setSelectedCampaignId: (campaignId: string) => void;
	setSelectedPaymentMethodId: (paymentMethodId: string) => void;
	setPaymentStatus: (
		paymentStatus: CreateOrderPayload["payment_status"],
	) => void;
	setManualDiscount: (manualDiscount: string) => void;
	setNotes: (notes: string) => void;
	setSubmitError: (submitError: string) => void;
	addProductToCart: (productId: number, maxStock: number) => void;
	addServiceToCart: (serviceId: number) => void;
	updateProductQty: (
		productId: number,
		nextQty: number,
		maxStock?: number,
	) => void;
	updateServiceQty: (serviceId: number, nextQty: number) => void;
	updateServiceLine: (
		serviceId: number,
		patch: Partial<ServiceCartLine>,
	) => void;
	removeProductFromCart: (productId: number) => void;
	removeServiceFromCart: (serviceId: number) => void;
	resetCart: () => void;
};

const defaultDraftState = {
	mode: "products" as CatalogMode,
	searchTerm: "",
	activeProductCategory: "all" as CategoryFilter,
	activeServiceCategory: "all" as CategoryFilter,
	selectedCustomerId: "",
	selectedCampaignId: "",
	selectedPaymentMethodId: "",
	paymentStatus: "unpaid" as CreateOrderPayload["payment_status"],
	manualDiscount: "",
	notes: "",
	productCart: [] as ProductCartLine[],
	serviceCart: [] as ServiceCartLine[],
	submitError: "",
};

export const useTransactionsStore = create<TransactionsStore>((set) => ({
	...defaultDraftState,
	selectedStoreId: "",
	setMode: (mode) => set({ mode }),
	setSearchTerm: (searchTerm) => set({ searchTerm }),
	setActiveProductCategory: (activeProductCategory) =>
		set({ activeProductCategory }),
	setActiveServiceCategory: (activeServiceCategory) =>
		set({ activeServiceCategory }),
	setSelectedStoreId: (selectedStoreId) =>
		set({
			selectedStoreId,
			selectedCampaignId: "",
			submitError: "",
		}),
	setSelectedCustomerId: (selectedCustomerId) =>
		set({ selectedCustomerId, submitError: "" }),
	setSelectedCampaignId: (selectedCampaignId) => set({ selectedCampaignId }),
	setSelectedPaymentMethodId: (selectedPaymentMethodId) =>
		set({ selectedPaymentMethodId }),
	setPaymentStatus: (paymentStatus) => set({ paymentStatus }),
	setManualDiscount: (manualDiscount) => set({ manualDiscount }),
	setNotes: (notes) => set({ notes }),
	setSubmitError: (submitError) => set({ submitError }),
	addProductToCart: (productId, maxStock) =>
		set((state) => {
			const existing = state.productCart.find((line) => line.id === productId);

			if (existing) {
				if (maxStock > 0 && existing.qty >= maxStock) {
					return state;
				}

				return {
					productCart: state.productCart.map((line) =>
						line.id === productId ? { ...line, qty: line.qty + 1 } : line,
					),
					submitError: "",
				};
			}

			if (maxStock <= 0) {
				return state;
			}

			return {
				productCart: [
					...state.productCart,
					{ kind: "product", id: productId, qty: 1 },
				],
				submitError: "",
			};
		}),
	addServiceToCart: (serviceId) =>
		set((state) => {
			const existing = state.serviceCart.find((line) => line.id === serviceId);

			if (existing) {
				return {
					serviceCart: state.serviceCart.map((line) =>
						line.id === serviceId ? { ...line, qty: line.qty + 1 } : line,
					),
					submitError: "",
				};
			}

			return {
				serviceCart: [
					...state.serviceCart,
					{
						kind: "service",
						id: serviceId,
						qty: 1,
						shoe_brand: "",
						shoe_size: "",
					},
				],
				submitError: "",
			};
		}),
	updateProductQty: (productId, nextQty, maxStock) =>
		set((state) => ({
			productCart: state.productCart.flatMap((line) => {
				if (line.id !== productId) {
					return [line];
				}

				if (nextQty <= 0) {
					return [];
				}

				return [
					{
						...line,
						qty:
							maxStock && maxStock > 0 ? Math.min(nextQty, maxStock) : nextQty,
					},
				];
			}),
		})),
	updateServiceQty: (serviceId, nextQty) =>
		set((state) => ({
			serviceCart: state.serviceCart.flatMap((line) => {
				if (line.id !== serviceId) {
					return [line];
				}

				if (nextQty <= 0) {
					return [];
				}

				return [{ ...line, qty: nextQty }];
			}),
		})),
	updateServiceLine: (serviceId, patch) =>
		set((state) => ({
			serviceCart: state.serviceCart.map((line) =>
				line.id === serviceId ? { ...line, ...patch } : line,
			),
		})),
	removeProductFromCart: (productId) =>
		set((state) => ({
			productCart: state.productCart.filter((line) => line.id !== productId),
		})),
	removeServiceFromCart: (serviceId) =>
		set((state) => ({
			serviceCart: state.serviceCart.filter((line) => line.id !== serviceId),
		})),
	resetCart: () =>
		set((state) => ({
			...defaultDraftState,
			selectedStoreId: state.selectedStoreId,
		})),
}));
