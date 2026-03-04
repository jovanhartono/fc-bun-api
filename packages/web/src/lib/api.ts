import { type InferResponseType, parseResponse } from "hono/client";
import { rpc, rpcWithAuth } from "@/lib/rpc";

interface ApiSuccess<T> {
	success: true;
	message?: string;
	data: T;
}

async function parseSuccess<T>(
	request: Parameters<typeof parseResponse>[0],
): Promise<T> {
	const response = (await parseResponse(request)) as ApiSuccess<T>;
	return response.data;
}

const loginRoute = rpc.api.auth.login.$post;
const customersRoute = rpc.api.admin.customers.$get;
const usersRoute = rpc.api.admin.users.$get;
const storesRoute = rpc.api.admin.stores.$get;
const categoriesRoute = rpc.api.admin.categories.$get;
const servicesRoute = rpc.api.admin.services.$get;
const productsRoute = rpc.api.admin.products.$get;
const paymentMethodsRoute = rpc.api.admin["payment-methods"].$get;
const ordersRoute = rpc.api.admin.orders.$get;
type LoginSuccessResponse = Extract<
	InferResponseType<typeof loginRoute>,
	{ success: true }
>;

export type Customer = InferResponseType<typeof customersRoute>["data"][number];
export type User = InferResponseType<typeof usersRoute>["data"][number];
export type Store = InferResponseType<typeof storesRoute>["data"][number];
export type Category = InferResponseType<
	typeof categoriesRoute
>["data"][number];
export type Service = InferResponseType<typeof servicesRoute>["data"][number];
export type Product = InferResponseType<typeof productsRoute>["data"][number];
export type PaymentMethod = InferResponseType<
	typeof paymentMethodsRoute
>["data"][number];
export type Order = InferResponseType<typeof ordersRoute>["data"][number];
export type LoginPayload = {
	username: string;
	password: string;
};

export const queryKeys = {
	customers: ["customers"] as const,
	users: ["users"] as const,
	stores: ["stores"] as const,
	categories: ["categories"] as const,
	services: ["services"] as const,
	products: ["products"] as const,
	paymentMethods: ["payment-methods"] as const,
	orders: ["orders"] as const,
	dashboard: ["dashboard"] as const,
};

export async function login(payload: LoginPayload) {
	return parseSuccess<LoginSuccessResponse["data"]>(
		rpc.api.auth.login.$post({ json: payload }),
	);
}

export async function fetchCustomers() {
	return parseSuccess<Customer[]>(rpcWithAuth().api.admin.customers.$get());
}

export async function fetchUsers() {
	return parseSuccess<User[]>(rpcWithAuth().api.admin.users.$get());
}

export async function fetchStores() {
	return parseSuccess<Store[]>(rpcWithAuth().api.admin.stores.$get());
}

export async function fetchCategories() {
	return parseSuccess<Category[]>(rpcWithAuth().api.admin.categories.$get());
}

export async function fetchServices() {
	return parseSuccess<Service[]>(rpcWithAuth().api.admin.services.$get());
}

export async function fetchProducts() {
	return parseSuccess<Product[]>(rpcWithAuth().api.admin.products.$get());
}

export async function fetchPaymentMethods() {
	return parseSuccess<PaymentMethod[]>(
		rpcWithAuth().api.admin["payment-methods"].$get(),
	);
}

export async function fetchOrders() {
	return parseSuccess<Order[]>(rpcWithAuth().api.admin.orders.$get());
}

export async function fetchDashboardCounts() {
	const [
		customers,
		users,
		stores,
		categories,
		services,
		products,
		paymentMethods,
		orders,
	] = await Promise.all([
		fetchCustomers(),
		fetchUsers(),
		fetchStores(),
		fetchCategories(),
		fetchServices(),
		fetchProducts(),
		fetchPaymentMethods(),
		fetchOrders(),
	]);

	return {
		customers: customers.length,
		users: users.length,
		stores: stores.length,
		categories: categories.length,
		services: services.length,
		products: products.length,
		paymentMethods: paymentMethods.length,
		orders: orders.length,
	};
}
