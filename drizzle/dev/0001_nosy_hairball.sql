ALTER TABLE "orders" DROP CONSTRAINT "positive_check";--> statement-breakpoint
ALTER TABLE "stores" DROP CONSTRAINT "code_len_check";--> statement-breakpoint
ALTER TABLE "orders_services_table" DROP CONSTRAINT "price_non_negative_check";--> statement-breakpoint
ALTER TABLE "orders_services_table" DROP CONSTRAINT "qty_positive_check";--> statement-breakpoint
ALTER TABLE "store_service_prices" DROP CONSTRAINT "price_non_negative_check";--> statement-breakpoint
ALTER TABLE "orders_products_table" DROP CONSTRAINT "price_non_negative_check";--> statement-breakpoint
ALTER TABLE "orders_products_table" DROP CONSTRAINT "qty_positive_check";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "stock_non_negative_check";--> statement-breakpoint
DROP INDEX "customer_name_idx";--> statement-breakpoint
DROP INDEX "customer_phone_idx";--> statement-breakpoint
DROP INDEX "order_customer_idx";--> statement-breakpoint
DROP INDEX "order_payment_status_idx";--> statement-breakpoint
DROP INDEX "order_store_idx";--> statement-breakpoint
DROP INDEX "order_services_order_idx";--> statement-breakpoint
DROP INDEX "order_services_order_service_idx";--> statement-breakpoint
DROP INDEX "order_services_service_idx";--> statement-breakpoint
DROP INDEX "store_service_idx";--> statement-breakpoint
DROP INDEX "order_products_order_idx";--> statement-breakpoint
DROP INDEX "order_products_order_product_idx";--> statement-breakpoint
DROP INDEX "order_products_product_idx";--> statement-breakpoint
ALTER TABLE "orders_services_table" drop column "subtotal";--> statement-breakpoint
ALTER TABLE "orders_services_table" ADD COLUMN "subtotal" numeric(12, 2) GENERATED ALWAYS AS ("orders_services_table"."price" * "orders_services_table"."qty") STORED;--> statement-breakpoint
ALTER TABLE "orders_products_table" drop column "subtotal";--> statement-breakpoint
ALTER TABLE "orders_products_table" ADD COLUMN "subtotal" numeric(12, 2) GENERATED ALWAYS AS ("orders_products_table"."price" * "orders_products_table"."qty") STORED;--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "order_customer_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "order_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "order_store_idx" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "order_services_order_idx" ON "orders_services_table" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_services_order_service_idx" ON "orders_services_table" USING btree ("order_id","service_id");--> statement-breakpoint
CREATE INDEX "order_services_service_idx" ON "orders_services_table" USING btree ("service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_service_idx" ON "store_service_prices" USING btree ("store_id","service_id");--> statement-breakpoint
CREATE INDEX "order_products_order_idx" ON "orders_products_table" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_products_order_product_idx" ON "orders_products_table" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "order_products_product_idx" ON "orders_products_table" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "positive_check" CHECK ("orders"."total_amount" >= 0 AND "orders"."discount_amount" >= 0);--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "code_len_check" CHECK (LENGTH(TRIM("stores"."code")) = 3);--> statement-breakpoint
ALTER TABLE "orders_services_table" ADD CONSTRAINT "price_non_negative_check" CHECK ("orders_services_table"."price" >= 0);--> statement-breakpoint
ALTER TABLE "orders_services_table" ADD CONSTRAINT "qty_positive_check" CHECK ("orders_services_table"."qty" > 0);--> statement-breakpoint
ALTER TABLE "store_service_prices" ADD CONSTRAINT "price_non_negative_check" CHECK ("store_service_prices"."price" >= 0);--> statement-breakpoint
ALTER TABLE "orders_products_table" ADD CONSTRAINT "price_non_negative_check" CHECK ("orders_products_table"."price" >= 0);--> statement-breakpoint
ALTER TABLE "orders_products_table" ADD CONSTRAINT "qty_positive_check" CHECK ("orders_products_table"."qty" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "stock_non_negative_check" CHECK ("products"."stock" >= 0);