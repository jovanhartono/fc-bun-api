import { type SQL, relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
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
  orderServices: many(ordersServicesTable),
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
  (table) => [check("code_len_check", sql`LENGTH(TRIM(${table.code})) = 3`)],
);
export const storesRelations = relations(storesTable, ({ many }) => ({
  servicePrices: many(storeServicePricesTable),
  customers: many(customersTable),
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
    created_by: integer("created_by")
      .references(() => usersTable.id)
      .notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    updated_by: integer("updated_by")
      .references(() => usersTable.id)
      .notNull(),
  },
  (table) => [
    index("customer_name_idx").on(table.name),
    index("customer_phone_idx").on(table.phone_number),
  ],
);
export const customersRelations = relations(
  customersTable,
  ({ one, many }) => ({
    originStore: one(storesTable, {
      fields: [customersTable.origin_store_id],
      references: [storesTable.id],
    }),
    orders: many(ordersTable),
    createdBy: one(usersTable, {
      fields: [customersTable.created_by],
      references: [usersTable.id],
    }),
    updatedBy: one(usersTable, {
      fields: [customersTable.updated_by],
      references: [usersTable.id],
    }),
  }),
);

export const categoriesTable = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").notNull().default(false),
});

export const productsTable = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    category_id: integer("category_id")
      .references(() => categoriesTable.id)
      .notNull(),
    sku: varchar("sku", { length: 255 }).unique().notNull(),
    cogs: decimal("cogs", { precision: 12, scale: 2 }).default("0").notNull(),
    stock: integer("stock").default(0).notNull(),
    uom: varchar("uom", { length: 12 }).default("pcs").notNull(),
    description: text("description"),
    is_active: boolean("is_active").default(false).notNull(),
  },
  (table) => [
    index("product_name_idx").on(table.name),
    check("stock_non_negative_check", sql`${table.stock} >= 0`),
  ],
);
export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id],
  }),
  orderProducts: many(ordersProductsTable),
}));

export const servicesTable = pgTable(
  "services",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 4 }).unique().notNull(),
    cogs: decimal("cogs", { precision: 12, scale: 2 }).default("0").notNull(),
    description: text("description"),
    is_active: boolean("is_active").default(false).notNull(),
    category_id: integer("category_id")
      .references(() => categoriesTable.id)
      .notNull(),
  },
  (table) => [
    index("service_name_idx").on(table.name),
    index("service_code_idx").on(table.code),
    check(
      "code_len_check",
      sql`LENGTH(TRIM(${table.code})) >= 1 AND LENGTH(TRIM(${table.code})) <= 4`,
    ),
  ],
);
export const servicesRelations = relations(servicesTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [servicesTable.category_id],
    references: [categoriesTable.id],
  }),
  servicePrices: many(storeServicePricesTable),
  orders: many(ordersServicesTable),
}));

export const storeServicePricesTable = pgTable(
  "store_service_prices",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
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
  ],
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
  }),
);

// order
export const paymentMethodsTable = pgTable("payment_methods", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  is_active: boolean("is_active").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
export const paymentMethodsRelations = relations(
  paymentMethodsTable,
  ({ many }) => ({
    orders: many(ordersTable),
  }),
);

export const orderPaymentStatusEnum = pgEnum("order_payment_status", [
  "paid",
  "partial",
  "unpaid",
]);
export const orderStatusEnum = pgEnum("order_status_enum", [
  "created",
  "processing",
  "completed",
  "cancelled",
]);
export const ordersTable = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar("code", { length: 12 }).notNull().unique(),

    store_id: integer("store_id")
      .references(() => storesTable.id)
      .notNull(),
    customer_id: integer("customer_id")
      .references(() => customersTable.id)
      .notNull(),

    status: orderStatusEnum("status").default("created").notNull(),

    payment_method_id: integer("payment_method_id").references(
      () => paymentMethodsTable.id,
    ),
    payment_status: orderPaymentStatusEnum("payment_status")
      .default("unpaid")
      .notNull(),

    notes: text("notes"),

    // snapshot
    total: decimal("total", { precision: 12, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),

    completed_at: timestamp("completed_at"),
    cancelled_at: timestamp("cancelled_at"),

    // cashier
    created_by: integer("created_by")
      .references(() => usersTable.id)
      .notNull(),
    updated_by: integer("updated_by")
      .references(() => usersTable.id)
      .notNull(),
  },
  (table) => [
    index("order_store_idx").on(table.store_id),
    index("order_customer_idx").on(table.customer_id),
    index("order_payment_status_idx").on(table.payment_status),
    uniqueIndex("order_code_idx").on(table.code),
    check("total_non_negative_check", sql`${table.total} >= 0`),
    check("discount_non_negative_check", sql`${table.discount} >= 0`),
    check("discount_valid_check", sql`(${table.total}) >= ${table.discount}`),
  ],
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
  paymentMethod: one(paymentMethodsTable, {
    fields: [ordersTable.payment_method_id],
    references: [paymentMethodsTable.id],
  }),
  createdBy: one(usersTable, {
    fields: [ordersTable.created_by],
    references: [usersTable.id],
  }),
  updatedBy: one(usersTable, {
    fields: [ordersTable.updated_by],
    references: [usersTable.id],
  }),
  services: many(ordersServicesTable),
  products: many(ordersProductsTable),
}));

export const ordersServicesTable = pgTable(
  "orders_services",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    order_id: integer("order_id").references(() => ordersTable.id, {
      onDelete: "cascade",
    }),
    service_id: integer("service_id").references(() => servicesTable.id, {
      onDelete: "cascade",
    }),
    notes: text("notes"),

    qty: smallint("qty").notNull().default(1),

    // snapshot
    price: decimal("price", { precision: 12, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    handler_id: integer("handler_id").references(() => usersTable.id),

    subtotal: decimal("subtotal", {
      precision: 12,
      scale: 2,
    }).generatedAlwaysAs(
      (): SQL =>
        sql`(${ordersServicesTable.price} * ${ordersServicesTable.qty}) - ${ordersServicesTable.discount}`,
    ),
  },
  (table) => [
    index("order_services_order_idx").on(table.order_id),
    index("order_services_service_idx").on(table.service_id),
    index("order_services_order_service_idx").on(
      table.order_id,
      table.service_id,
    ),
    check("price_non_negative_check", sql`${table.price} >= 0`),
    check("qty_positive_check", sql`${table.qty} > 0`),
    check(
      "discount_valid_check",
      sql`(${table.price} * ${table.qty}) >= ${table.discount}`,
    ),
  ],
);
export const ordersServicesRelations = relations(
  ordersServicesTable,
  ({ one, many }) => ({
    order: one(ordersTable, {
      fields: [ordersServicesTable.order_id],
      references: [ordersTable.id],
    }),
    service: one(servicesTable, {
      fields: [ordersServicesTable.service_id],
      references: [servicesTable.id],
    }),
    images: many(orderServicesImagesTable),
    handler: one(usersTable, {
      fields: [ordersServicesTable.handler_id],
      references: [usersTable.id],
    }),
  }),
);

export const orderServicesImagesTable = pgTable("order_services_images", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  order_service_id: integer("order_service_id").references(
    () => ordersServicesTable.id,
    { onDelete: "cascade" },
  ),
  image_url: varchar("image_url", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
export const orderServicesImagesRelations = relations(
  orderServicesImagesTable,
  ({ one }) => ({
    orderService: one(ordersServicesTable, {
      fields: [orderServicesImagesTable.order_service_id],
      references: [ordersServicesTable.id],
    }),
  }),
);

export const ordersProductsTable = pgTable(
  "orders_products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    order_id: integer("order_id").references(() => ordersTable.id, {
      onDelete: "cascade",
    }),
    product_id: integer("product_id").references(() => productsTable.id, {
      onDelete: "cascade",
    }),
    notes: text("notes"),

    qty: smallint("qty").notNull().default(1),

    // snapshot
    price: decimal("price", { precision: 12, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    subtotal: decimal("subtotal", {
      precision: 12,
      scale: 2,
    }).generatedAlwaysAs(
      (): SQL =>
        sql`(${ordersProductsTable.price} * ${ordersProductsTable.qty}) - ${ordersProductsTable.discount}`,
    ),
  },
  (table) => [
    index("order_products_order_idx").on(table.order_id),
    index("order_products_product_idx").on(table.product_id),
    index("order_products_order_product_idx").on(
      table.order_id,
      table.product_id,
    ),
    check("price_non_negative_check", sql`${table.price} >= 0`),
    check("qty_positive_check", sql`${table.qty} > 0`),
    check(
      "discount_valid_check",
      sql`(${table.price} * ${table.qty}) >= ${table.discount}`,
    ),
  ],
);
export const ordersProductsRelations = relations(
  ordersProductsTable,
  ({ one }) => ({
    order: one(ordersTable, {
      fields: [ordersProductsTable.order_id],
      references: [ordersTable.id],
    }),
    product: one(productsTable, {
      fields: [ordersProductsTable.product_id],
      references: [productsTable.id],
    }),
  }),
);
