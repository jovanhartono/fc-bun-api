import { gte, relations, SQL, sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "cashier",
  "cleaner",
]);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  role: userRoleEnum("role").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", {
    length: 255,
  }).notNull(),
  is_active: boolean().default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export const usersRelations = relations(usersTable, ({ many }) => ({
  orders: many(ordersTable),
}));

// store
export const storesTable = pgTable(
  "stores",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 3 }).unique().notNull(),
    phone_number: varchar("phone_number", { length: 16 }).unique().notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    latitude: decimal("latitude", { precision: 11, scale: 8 }).notNull(),
    longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
    is_active: boolean().default(false).notNull(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => [check("code_len_check", sql`LENGTH(TRIM(${table.code})) = 3`)]
);
export const storesRelations = relations(storesTable, ({ many }) => ({
  store_service_prices: many(storeServicePricesTable),
  created_customers: many(customersTable),
  orders: many(ordersTable),
}));

// customer
export const customersTable = pgTable(
  "customers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    phone_number: varchar("phone_number", { length: 16 }).notNull().unique(),
    email: varchar("email", { length: 255 }).unique(),
    address: text("address"),
    origin_store_id: integer("origin_store_id")
      .references(() => storesTable.id)
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("customer_name_idx").on(table.name),
    index("customer_phone_idx").on(table.phone_number),
  ]
);
export const customersRelations = relations(
  customersTable,
  ({ one, many }) => ({
    origin_store: one(storesTable, {
      fields: [customersTable.origin_store_id],
      references: [storesTable.id],
    }),
    orders: many(ordersTable),
  })
);

export const servicesTable = pgTable(
  "services",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 4 }).unique().notNull(),
    description: text("description"),
    is_active: boolean("is_active").default(false).notNull(),
  },
  (table) => [check("code_len_check", sql`LENGTH(TRIM(${table.code})) = 4`)]
);
export const servicesRelations = relations(servicesTable, ({ many }) => ({
  store_service_prices: many(storeServicePricesTable),
  orders: many(ordersServicesTable),
}));

export const storeServicePricesTable = pgTable(
  "store_service_prices",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    price: integer("price").notNull(),
    store_id: integer("store_id").references(() => storesTable.id, {
      onDelete: "cascade",
    }),
    service_id: integer("service_id").references(() => servicesTable.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("store_service_idx").on(table.store_id, table.service_id),
    check("price_non_negative_check", sql`${table.price} >= 0`),
  ]
);
export const storeServicePricesRelations = relations(
  storeServicePricesTable,
  ({ one }) => ({
    store: one(storesTable, {
      fields: [storeServicePricesTable.store_id],
      references: [storesTable.id],
    }),
    service: one(servicesTable, {
      fields: [storeServicePricesTable.service_id],
      references: [servicesTable.id],
    }),
  })
);

// order
export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "paid",
  "partial",
  "unpaid",
]);
export const ordersTable = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar("code", { length: 12 }).notNull().unique(),

    payment_status: orderPaymentStatusEnum("payment_status")
      .default("unpaid")
      .notNull(),
    total_amount: decimal("total_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    discount_amount: decimal("discount_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    created_by: integer("created_by")
      .references(() => usersTable.id)
      .notNull(),
    updated_by: integer("updated_by")
      .references(() => usersTable.id)
      .notNull(),

    store_id: integer("store_id")
      .references(() => storesTable.id)
      .notNull(),
    customer_id: integer("customer_id")
      .references(() => customersTable.id)
      .notNull(),
  },
  (table) => [
    index("order_store_idx").on(table.store_id),
    index("order_customer_idx").on(table.customer_id),
    index("order_payment_status_idx").on(table.payment_status),
    check(
      "positive_check",
      sql`${table.total_amount} >= 0 AND ${table.discount_amount} >= 0`
    ),
  ]
);
export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  store: one(storesTable, {
    fields: [ordersTable.store_id],
    references: [storesTable.id],
  }),
  customer: one(customersTable, {
    fields: [ordersTable.customer_id],
    references: [customersTable.id],
  }),
  created_by: one(usersTable, {
    fields: [ordersTable.created_by],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [ordersTable.updated_by],
    references: [usersTable.id],
  }),
  services: many(ordersServicesTable),
}));

export const ordersServicesTable = pgTable(
  "orders_services_table",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    order_id: integer("order_id").references(() => ordersTable.id, {
      onDelete: "cascade",
    }),
    service_id: integer("service_id").references(() => servicesTable.id, {
      onDelete: "cascade",
    }),

    qty: integer("qty").notNull().default(1),

    // snapshot
    price: decimal("price", { precision: 12, scale: 2 }).default("0"),

    subtotal: decimal("subtotal", {
      precision: 12,
      scale: 2,
    }).generatedAlwaysAs(
      (): SQL => sql`${ordersServicesTable.price} * ${ordersServicesTable.qty}`
    ),
  },
  (table) => [
    index("order_services_order_idx").on(table.order_id),
    index("order_services_service_idx").on(table.service_id),
    index("order_services_order_service_idx").on(
      table.order_id,
      table.service_id
    ),
    check("price_non_negative_check", sql`${table.price} >= 0`),
    check("qty_positive_check", sql`${table.qty} > 0`),
  ]
);
export const ordersServicesRelations = relations(
  ordersServicesTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [ordersServicesTable.order_id],
      references: [ordersTable.id],
    }),
    service: one(servicesTable, {
      fields: [ordersServicesTable.service_id],
      references: [servicesTable.id],
    }),
  })
);
