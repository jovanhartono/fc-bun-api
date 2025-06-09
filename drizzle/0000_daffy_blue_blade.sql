CREATE TYPE "public"."user_role" AS ENUM('admin', 'cashier');--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"role" "user_role",
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
