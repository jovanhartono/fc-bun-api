CREATE TABLE "stores" (
	"id" integer GENERATED ALWAYS AS IDENTITY (sequence name "stores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"phone_number" varchar(255),
	"address" varchar(255) NOT NULL,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stores_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;