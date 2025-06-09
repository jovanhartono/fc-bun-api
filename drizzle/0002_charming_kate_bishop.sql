CREATE TABLE "customers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"phone_number" varchar(16) NOT NULL,
	"email" varchar(255),
	"address" text,
	"origin_store_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_number_unique" UNIQUE("phone_number"),
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "services_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text,
	"code" varchar(4) NOT NULL,
	"price" integer NOT NULL,
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "store_service_prices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "store_service_prices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"price" integer NOT NULL,
	"store_id" integer,
	"service_id" integer
);
--> statement-breakpoint
ALTER TABLE "stores" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "phone_number" SET DATA TYPE varchar(16);--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "phone_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "latitude" SET DATA TYPE numeric(11, 8);--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_origin_store_id_stores_id_fk" FOREIGN KEY ("origin_store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_service_prices" ADD CONSTRAINT "store_service_prices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_service_prices" ADD CONSTRAINT "store_service_prices_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "phone_number_idx" ON "customers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "store_service_unique_idx" ON "store_service_prices" USING btree ("store_id","service_id");