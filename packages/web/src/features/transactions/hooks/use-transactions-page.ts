import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { handleCreatedOrderSuccess } from "@/features/orders/lib/create-order-workflow";
import {
	buildCategoryTabs,
	getCampaignDiscount,
	getEntityCategoryName,
	isCampaignAvailable,
	type ProductCartDisplayLine,
	type ServiceCartDisplayLine,
	toTransactionPayload,
} from "@/features/transactions/lib/transactions";
import { useTransactionsStore } from "@/features/transactions/store";
import {
	createOrder,
	type PaymentMethod,
	type Product,
	type Service,
	type Store,
} from "@/lib/api";
import {
	campaignsQueryOptions,
	categoriesQueryOptions,
	currentUserDetailQueryOptions,
	customersQueryOptions,
	paymentMethodsQueryOptions,
	productsQueryOptions,
	servicesQueryOptions,
	storesQueryOptions,
} from "@/lib/query-options";
import { getCurrentUser } from "@/stores/auth-store";

export function useTransactionsPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const currentUser = getCurrentUser();
	const state = useTransactionsStore(
		useShallow((store) => ({
			mode: store.mode,
			searchTerm: store.searchTerm,
			activeProductCategory: store.activeProductCategory,
			activeServiceCategory: store.activeServiceCategory,
			selectedStoreId: store.selectedStoreId,
			selectedCustomerId: store.selectedCustomerId,
			selectedCampaignId: store.selectedCampaignId,
			selectedPaymentMethodId: store.selectedPaymentMethodId,
			paymentStatus: store.paymentStatus,
			manualDiscount: store.manualDiscount,
			notes: store.notes,
			productCart: store.productCart,
			serviceCart: store.serviceCart,
			submitError: store.submitError,
			setMode: store.setMode,
			setSearchTerm: store.setSearchTerm,
			setActiveProductCategory: store.setActiveProductCategory,
			setActiveServiceCategory: store.setActiveServiceCategory,
			setSelectedStoreId: store.setSelectedStoreId,
			setSelectedCustomerId: store.setSelectedCustomerId,
			setSelectedCampaignId: store.setSelectedCampaignId,
			setSelectedPaymentMethodId: store.setSelectedPaymentMethodId,
			setPaymentStatus: store.setPaymentStatus,
			setManualDiscount: store.setManualDiscount,
			setNotes: store.setNotes,
			setSubmitError: store.setSubmitError,
			addProductToCart: store.addProductToCart,
			addServiceToCart: store.addServiceToCart,
			updateProductQty: store.updateProductQty,
			updateServiceQty: store.updateServiceQty,
			updateServiceLine: store.updateServiceLine,
			removeProductFromCart: store.removeProductFromCart,
			removeServiceFromCart: store.removeServiceFromCart,
			resetCart: store.resetCart,
		})),
	);

	const deferredSearchTerm = useDeferredValue(state.searchTerm);

	const storesQuery = useQuery(storesQueryOptions());
	const categoriesQuery = useQuery(categoriesQueryOptions());
	const productsQuery = useQuery(productsQueryOptions());
	const servicesQuery = useQuery(servicesQueryOptions());
	const customersQuery = useQuery(customersQueryOptions());
	const paymentMethodsQuery = useQuery(paymentMethodsQueryOptions());
	const currentUserDetailQuery = useQuery({
		...currentUserDetailQueryOptions(currentUser?.id ?? -1),
		enabled: !!currentUser,
	});

	const userStoreIds =
		currentUserDetailQuery.data?.userStores?.map((item) => item.store_id) ?? [];

	const visibleStores = useMemo(() => {
		const stores = storesQuery.data ?? [];

		if (currentUser?.role === "admin") {
			return stores;
		}

		return stores.filter((store) => userStoreIds.includes(store.id));
	}, [currentUser?.role, storesQuery.data, userStoreIds]);

	useEffect(() => {
		if (currentUser?.role === "admin" || state.selectedStoreId) {
			return;
		}

		const firstStoreId = userStoreIds[0];

		if (firstStoreId) {
			state.setSelectedStoreId(String(firstStoreId));
		}
	}, [
		currentUser?.role,
		state.selectedStoreId,
		state.setSelectedStoreId,
		userStoreIds,
	]);

	const selectedStoreNumber =
		state.selectedStoreId && Number.isFinite(Number(state.selectedStoreId))
			? Number(state.selectedStoreId)
			: undefined;

	const campaignsQuery = useQuery({
		...campaignsQueryOptions({
			store_id: selectedStoreNumber,
			is_active: true,
		}),
		enabled: selectedStoreNumber !== undefined,
	});

	const isBootstrapping =
		storesQuery.isPending ||
		categoriesQuery.isPending ||
		productsQuery.isPending ||
		servicesQuery.isPending ||
		customersQuery.isPending ||
		paymentMethodsQuery.isPending ||
		currentUserDetailQuery.isPending;

	const categoryMap = useMemo(
		() =>
			new Map(
				(categoriesQuery.data ?? []).map((category) => [category.id, category]),
			),
		[categoriesQuery.data],
	);

	const products = useMemo(
		() => (productsQuery.data ?? []).filter((product) => product.is_active),
		[productsQuery.data],
	);
	const services = useMemo(
		() => (servicesQuery.data ?? []).filter((service) => service.is_active),
		[servicesQuery.data],
	);
	const productMap = useMemo(
		() => new Map(products.map((product) => [product.id, product])),
		[products],
	);
	const serviceMap = useMemo(
		() => new Map(services.map((service) => [service.id, service])),
		[services],
	);

	const searchValue = deferredSearchTerm.trim().toLowerCase();
	const productTabs = useMemo(
		() => buildCategoryTabs({ items: products, categoryMap }),
		[categoryMap, products],
	);
	const serviceTabs = useMemo(
		() => buildCategoryTabs({ items: services, categoryMap }),
		[categoryMap, services],
	);

	const filteredProducts = useMemo(
		() =>
			products.filter((product) => {
				const categoryName = getEntityCategoryName(
					product,
					categoryMap,
				).toLowerCase();
				const matchesCategory =
					state.activeProductCategory === "all" ||
					product.category_id === state.activeProductCategory;
				const matchesSearch =
					searchValue.length === 0 ||
					product.name.toLowerCase().includes(searchValue) ||
					(product.description ?? "").toLowerCase().includes(searchValue) ||
					categoryName.includes(searchValue);

				return matchesCategory && matchesSearch;
			}),
		[categoryMap, products, searchValue, state.activeProductCategory],
	);
	const filteredServices = useMemo(
		() =>
			services.filter((service) => {
				const categoryName = getEntityCategoryName(
					service,
					categoryMap,
				).toLowerCase();
				const matchesCategory =
					state.activeServiceCategory === "all" ||
					service.category_id === state.activeServiceCategory;
				const matchesSearch =
					searchValue.length === 0 ||
					service.name.toLowerCase().includes(searchValue) ||
					(service.description ?? "").toLowerCase().includes(searchValue) ||
					categoryName.includes(searchValue);

				return matchesCategory && matchesSearch;
			}),
		[categoryMap, searchValue, services, state.activeServiceCategory],
	);

	const activeItems =
		state.mode === "products" ? filteredProducts : filteredServices;

	const customerOptions = useMemo(
		() =>
			(customersQuery.data ?? []).map((customer) => ({
				value: String(customer.id),
				label: `${customer.name} ${customer.phone_number}`,
			})),
		[customersQuery.data],
	);
	const paymentMethodOptions = useMemo(
		() => [
			{ value: "none", label: "No payment method" },
			...(paymentMethodsQuery.data ?? []).map(
				(paymentMethod: PaymentMethod) => ({
					value: String(paymentMethod.id),
					label: paymentMethod.name,
				}),
			),
		],
		[paymentMethodsQuery.data],
	);
	const availableCampaigns = useMemo(() => {
		const now = new Date();
		return (campaignsQuery.data ?? []).filter((campaign) =>
			isCampaignAvailable(campaign, now),
		);
	}, [campaignsQuery.data]);
	const campaignOptions = useMemo(
		() => [
			{ value: "none", label: "No campaign" },
			...availableCampaigns.map((campaign) => ({
				value: String(campaign.id),
				label: `${campaign.code} - ${campaign.name}`,
			})),
		],
		[availableCampaigns],
	);

	const selectedCampaign = useMemo(
		() =>
			state.selectedCampaignId
				? availableCampaigns.find(
						(campaign) => campaign.id === Number(state.selectedCampaignId),
					)
				: undefined,
		[availableCampaigns, state.selectedCampaignId],
	);
	const selectedStore = useMemo(
		() =>
			selectedStoreNumber
				? visibleStores.find((store: Store) => store.id === selectedStoreNumber)
				: undefined,
		[selectedStoreNumber, visibleStores],
	);

	const cartProductRows = useMemo(
		() =>
			state.productCart
				.map((line) => ({
					...line,
					product: productMap.get(line.id),
				}))
				.filter(
					(line): line is ProductCartDisplayLine => line.product !== undefined,
				),
		[state.productCart, productMap],
	);
	const cartServiceRows = useMemo(
		() =>
			state.serviceCart
				.map((line) => ({
					...line,
					service: serviceMap.get(line.id),
				}))
				.filter(
					(line): line is ServiceCartDisplayLine => line.service !== undefined,
				),
		[state.serviceCart, serviceMap],
	);

	const productCartQtyById = useMemo(
		() => new Map(state.productCart.map((line) => [line.id, line.qty])),
		[state.productCart],
	);
	const serviceCartQtyById = useMemo(
		() => new Map(state.serviceCart.map((line) => [line.id, line.qty])),
		[state.serviceCart],
	);

	const productSubtotal = cartProductRows.reduce(
		(total, line) => total + Number(line.product.price) * line.qty,
		0,
	);
	const serviceSubtotal = cartServiceRows.reduce(
		(total, line) => total + Number(line.service.price) * line.qty,
		0,
	);
	const subtotal = productSubtotal + serviceSubtotal;
	const campaignDiscount = getCampaignDiscount(subtotal, selectedCampaign);
	const discountValue = Number(state.manualDiscount || 0);
	const totalDiscount = Math.min(subtotal, discountValue + campaignDiscount);
	const total = Math.max(0, subtotal - totalDiscount);
	const cartCount =
		state.productCart.reduce((sum, item) => sum + item.qty, 0) +
		state.serviceCart.reduce((sum, item) => sum + item.qty, 0);

	const createMutation = useMutation({
		mutationKey: ["create-pos-order"],
		mutationFn: createOrder,
	});

	const handleAddProduct = (product: Product) => {
		state.addProductToCart(product.id, Number(product.stock ?? 0));
	};

	const handleAddService = (service: Service) => {
		state.addServiceToCart(service.id);
	};

	const handleSubmit = async () => {
		state.setSubmitError("");

		if (!state.selectedStoreId) {
			state.setSubmitError("Store is required before creating a transaction.");
			return;
		}

		if (!state.selectedCustomerId) {
			state.setSubmitError("Customer reference is required.");
			return;
		}

		if (state.productCart.length === 0 && state.serviceCart.length === 0) {
			state.setSubmitError("Add at least one product or service to the cart.");
			return;
		}

		const incompleteService = state.serviceCart.find(
			(line) =>
				line.shoe_brand.trim().length === 0 ||
				line.shoe_size.trim().length === 0,
		);

		if (incompleteService) {
			state.setSubmitError(
				"Every service line needs a shoe brand and shoe size.",
			);
			return;
		}

		try {
			const created = await createMutation.mutateAsync(
				toTransactionPayload({
					selectedCustomerId: state.selectedCustomerId,
					selectedStoreId: state.selectedStoreId,
					selectedCampaignId: state.selectedCampaignId,
					selectedPaymentMethodId: state.selectedPaymentMethodId,
					paymentStatus: state.paymentStatus,
					manualDiscount: state.manualDiscount,
					notes: state.notes,
					productCart: state.productCart,
					serviceCart: state.serviceCart,
				}),
			);

			await handleCreatedOrderSuccess({
				created,
				queryClient,
				onFallbackNavigate: () => {
					state.resetCart();
					void navigate({ to: "/orders", search: { page: 1 } });
				},
				onOrderDetailNavigate: (orderId) => {
					state.resetCart();
					void navigate({
						to: "/orders/$orderId",
						params: { orderId: String(orderId) },
					});
				},
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create transaction";
			state.setSubmitError(message);
			toast.error("Unable to create transaction", {
				description: message,
			});
		}
	};

	return {
		isAdmin: currentUser?.role === "admin",
		isBootstrapping,
		mode: state.mode,
		searchTerm: state.searchTerm,
		activeProductCategory: state.activeProductCategory,
		activeServiceCategory: state.activeServiceCategory,
		selectedStoreId: state.selectedStoreId,
		selectedCustomerId: state.selectedCustomerId,
		selectedCampaignId: state.selectedCampaignId,
		selectedPaymentMethodId: state.selectedPaymentMethodId,
		paymentStatus: state.paymentStatus,
		manualDiscount: state.manualDiscount,
		notes: state.notes,
		submitError: state.submitError,
		products,
		services,
		visibleStores,
		selectedStoreNumber,
		selectedStore,
		selectedCampaign,
		categoryMap,
		productTabs,
		serviceTabs,
		activeItems,
		customerOptions,
		campaignOptions,
		paymentMethodOptions,
		campaignsLoading: campaignsQuery.isFetching,
		customersLoading: customersQuery.isFetching,
		paymentMethodsLoading: paymentMethodsQuery.isFetching,
		cartProductRows,
		cartServiceRows,
		productCartQtyById,
		serviceCartQtyById,
		campaignDiscount,
		discountValue,
		subtotal,
		total,
		cartCount,
		isSubmitting: createMutation.isPending,
		setMode: state.setMode,
		setSearchTerm: state.setSearchTerm,
		setActiveProductCategory: state.setActiveProductCategory,
		setActiveServiceCategory: state.setActiveServiceCategory,
		setSelectedStoreId: state.setSelectedStoreId,
		setSelectedCustomerId: state.setSelectedCustomerId,
		setSelectedCampaignId: state.setSelectedCampaignId,
		setSelectedPaymentMethodId: state.setSelectedPaymentMethodId,
		setPaymentStatus: state.setPaymentStatus,
		setManualDiscount: state.setManualDiscount,
		setNotes: state.setNotes,
		resetCart: state.resetCart,
		removeProductFromCart: state.removeProductFromCart,
		removeServiceFromCart: state.removeServiceFromCart,
		updateProductQty: state.updateProductQty,
		updateServiceQty: state.updateServiceQty,
		updateServiceBrand: (serviceId: number, value: string) =>
			state.updateServiceLine(serviceId, { shoe_brand: value }),
		updateServiceSize: (serviceId: number, value: string) =>
			state.updateServiceLine(serviceId, { shoe_size: value }),
		handleAddProduct,
		handleAddService,
		handleSubmit,
	};
}
