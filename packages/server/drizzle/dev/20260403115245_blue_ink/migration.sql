ALTER TABLE "order_services_images" ALTER COLUMN "photo_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_services_images" ALTER COLUMN "photo_type" DROP DEFAULT;--> statement-breakpoint
UPDATE "order_services_images" SET "photo_type" = 'progress' WHERE "photo_type" = 'refund';--> statement-breakpoint
DROP TYPE "order_service_photo_type_enum";--> statement-breakpoint
CREATE TYPE "order_service_photo_type_enum" AS ENUM('dropoff', 'progress', 'pickup');--> statement-breakpoint
ALTER TABLE "order_services_images" ALTER COLUMN "photo_type" SET DATA TYPE "order_service_photo_type_enum" USING "photo_type"::"order_service_photo_type_enum";--> statement-breakpoint
ALTER TABLE "order_services_images" ALTER COLUMN "photo_type" SET DEFAULT 'progress'::"order_service_photo_type_enum";--> statement-breakpoint
ALTER TABLE "order_service_status_logs" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_service_status_logs" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders_services" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders_services" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
UPDATE "orders_services" SET "status" = 'queued' WHERE "status" = 'received';--> statement-breakpoint
UPDATE "order_service_status_logs" SET "from_status" = 'queued' WHERE "from_status" = 'received';--> statement-breakpoint
UPDATE "order_service_status_logs" SET "to_status" = 'queued' WHERE "to_status" = 'received';--> statement-breakpoint
DROP TYPE "order_service_status_enum";--> statement-breakpoint
CREATE TYPE "order_service_status_enum" AS ENUM('queued', 'processing', 'quality_check', 'ready_for_pickup', 'picked_up', 'refunded', 'cancelled');--> statement-breakpoint
ALTER TABLE "order_service_status_logs" ALTER COLUMN "from_status" SET DATA TYPE "order_service_status_enum" USING "from_status"::"order_service_status_enum";--> statement-breakpoint
ALTER TABLE "order_service_status_logs" ALTER COLUMN "to_status" SET DATA TYPE "order_service_status_enum" USING "to_status"::"order_service_status_enum";--> statement-breakpoint
ALTER TABLE "orders_services" ALTER COLUMN "status" SET DATA TYPE "order_service_status_enum" USING "status"::"order_service_status_enum";--> statement-breakpoint
ALTER TABLE "orders_services" ALTER COLUMN "status" SET DEFAULT 'queued'::"order_service_status_enum";