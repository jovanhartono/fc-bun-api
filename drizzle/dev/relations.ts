import { relations } from "drizzle-orm/relations";
import { stores, customers, categories, services, users, orders, ordersServicesTable, storeServicePrices, ordersProductsTable, products } from "./schema";

export const customersRelations = relations(customers, ({one, many}) => ({
	store: one(stores, {
		fields: [customers.originStoreId],
		references: [stores.id]
	}),
	orders: many(orders),
}));

export const storesRelations = relations(stores, ({many}) => ({
	customers: many(customers),
	orders: many(orders),
	storeServicePrices: many(storeServicePrices),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	category: one(categories, {
		fields: [services.categoryId],
		references: [categories.id]
	}),
	ordersServicesTables: many(ordersServicesTable),
	storeServicePrices: many(storeServicePrices),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	services: many(services),
	products: many(products),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [orders.createdBy],
		references: [users.id],
		relationName: "orders_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [orders.updatedBy],
		references: [users.id],
		relationName: "orders_updatedBy_users_id"
	}),
	store: one(stores, {
		fields: [orders.storeId],
		references: [stores.id]
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	ordersServicesTables: many(ordersServicesTable),
	ordersProductsTables: many(ordersProductsTable),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders_createdBy: many(orders, {
		relationName: "orders_createdBy_users_id"
	}),
	orders_updatedBy: many(orders, {
		relationName: "orders_updatedBy_users_id"
	}),
}));

export const ordersServicesTableRelations = relations(ordersServicesTable, ({one}) => ({
	order: one(orders, {
		fields: [ordersServicesTable.orderId],
		references: [orders.id]
	}),
	service: one(services, {
		fields: [ordersServicesTable.serviceId],
		references: [services.id]
	}),
}));

export const storeServicePricesRelations = relations(storeServicePrices, ({one}) => ({
	store: one(stores, {
		fields: [storeServicePrices.storeId],
		references: [stores.id]
	}),
	service: one(services, {
		fields: [storeServicePrices.serviceId],
		references: [services.id]
	}),
}));

export const ordersProductsTableRelations = relations(ordersProductsTable, ({one}) => ({
	order: one(orders, {
		fields: [ordersProductsTable.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [ordersProductsTable.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	ordersProductsTables: many(ordersProductsTable),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
}));