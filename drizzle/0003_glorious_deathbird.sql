ALTER TYPE "public"."user_role" ADD VALUE 'cleaner';--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(12) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DROP INDEX "phone_number_idx";--> statement-breakpoint
DROP INDEX "name_idx";--> statement-breakpoint
DROP INDEX "store_service_unique_idx";--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "code" varchar(3);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_code_idx" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_phone_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "service_code_idx" ON "services" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "store_service_idx" ON "store_service_prices" USING btree ("store_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_code_idx" ON "stores" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_code_unique" UNIQUE("code");