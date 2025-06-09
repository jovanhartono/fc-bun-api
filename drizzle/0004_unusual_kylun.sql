CREATE TYPE "public"."order_payment_status" AS ENUM('paid', 'partial', 'unpaid');--> statement-breakpoint
CREATE TABLE "orders_services_table" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_services_table_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer,
	"service_id" integer,
	"qty" integer DEFAULT 1 NOT NULL,
	"price" numeric(12, 2) DEFAULT '0',
	"subtotal" numeric(12, 2) GENERATED ALWAYS AS ("orders_services_table"."price" * "orders_services_table"."qty") STORED,
	CONSTRAINT "price_non_negative_check" CHECK ("orders_services_table"."price" >= 0),
	CONSTRAINT "qty_positive_check" CHECK ("orders_services_table"."qty" > 0)
);
--> statement-breakpoint
DROP INDEX "order_code_idx";--> statement-breakpoint
DROP INDEX "service_code_idx";--> statement-breakpoint
DROP INDEX "store_code_idx";--> statement-breakpoint
DROP INDEX "user_username_idx";--> statement-breakpoint
DROP INDEX "customer_phone_idx";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "updated_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" "order_payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "orders_services_table" ADD CONSTRAINT "orders_services_table_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders_services_table" ADD CONSTRAINT "orders_services_table_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_services_order_idx" ON "orders_services_table" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_services_service_idx" ON "orders_services_table" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "order_services_order_service_idx" ON "orders_services_table" USING btree ("order_id","service_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_store_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "order_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "positive_check" CHECK ("orders"."total_amount" >= 0 AND "orders"."discount_amount" >= 0);--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "code_len_check" CHECK (LENGTH(TRIM("services"."code")) = 4);--> statement-breakpoint
ALTER TABLE "store_service_prices" ADD CONSTRAINT "price_non_negative_check" CHECK ("store_service_prices"."price" >= 0);--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "code_len_check" CHECK (LENGTH(TRIM("stores"."code")) = 3);