import { CameraIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderSectionHeader } from "@/features/orders/components/order-section-header";
import {
	PhotoLightbox,
	type PhotoLightboxItem,
} from "@/features/orders/components/photo-lightbox";
import { SinglePhotoUploadDialog } from "@/features/orders/components/photo-upload-dialog";
import { formatOrderDateTime } from "@/features/orders/lib/format";
import { uploadOrderDropoffPhoto } from "@/features/orders/utils/photo-upload";
import type { OrderDetail } from "@/lib/api";

type PickupEvent = OrderDetail["pickup_events"][number];

type DropoffOrder = Pick<
	OrderDetail,
	"id" | "created_at" | "dropoff_photo_url" | "dropoff_photo_uploaded_at"
>;

interface OrderAttachmentsCardProps {
	order: DropoffOrder;
	canManageDropoff: boolean;
	onUploaded: () => Promise<void>;
	pickupEvents: PickupEvent[];
}

export const OrderAttachmentsCard = ({
	order,
	canManageDropoff,
	onUploaded,
	pickupEvents,
}: OrderAttachmentsCardProps) => (
	<Card className="gap-0 overflow-hidden py-0">
		<OrderSectionHeader>Attachments</OrderSectionHeader>
		<div className="grid gap-6 border-t p-4 md:grid-cols-2">
			<DropoffAttachment
				canManage={canManageDropoff}
				onUploaded={onUploaded}
				order={order}
			/>
			<PickupsAttachment pickupEvents={pickupEvents} />
		</div>
	</Card>
);

const AttachmentLabel = ({ children }: { children: string }) => (
	<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
		{children}
	</p>
);

interface DropoffAttachmentProps {
	order: DropoffOrder;
	canManage: boolean;
	onUploaded: () => Promise<void>;
}

const DropoffAttachment = ({
	order,
	canManage,
	onUploaded,
}: DropoffAttachmentProps) => {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const isSaved = Boolean(order.dropoff_photo_url);

	return (
		<section className="grid content-start gap-3">
			<div className="flex items-center justify-between gap-2">
				<AttachmentLabel>Drop-off</AttachmentLabel>
				<Badge variant={isSaved ? "secondary" : "outline"}>
					{isSaved ? "Saved" : "Missing"}
				</Badge>
			</div>

			{order.dropoff_photo_url ? (
				<div className="relative overflow-hidden border bg-muted">
					<button
						aria-label="Open drop-off photo preview"
						className="block w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
						onClick={() => setIsPreviewOpen(true)}
						type="button"
					>
						<img
							alt="Order drop-off"
							className="aspect-16/10 w-full object-cover"
							height={800}
							loading="lazy"
							src={order.dropoff_photo_url}
							width={1280}
						/>
					</button>
				</div>
			) : null}

			{order.dropoff_photo_uploaded_at ? (
				<p className="text-muted-foreground text-xs">
					Uploaded {formatOrderDateTime(order.dropoff_photo_uploaded_at)}
				</p>
			) : null}

			<Button
				className="h-11 w-full"
				disabled={!canManage}
				icon={<CameraIcon className="size-4" />}
				onClick={() => setIsDialogOpen(true)}
				type="button"
				variant="outline"
			>
				{isSaved ? "Replace photo" : "Upload photo"}
			</Button>

			{order.dropoff_photo_url ? (
				<PhotoLightbox
					items={[
						{
							alt: "Order drop-off",
							created_at: order.dropoff_photo_uploaded_at ?? order.created_at,
							id: `dropoff-${order.id}`,
							image_url: order.dropoff_photo_url,
							primaryLabel: "Drop-off photo",
						},
					]}
					onOpenChange={setIsPreviewOpen}
					open={isPreviewOpen}
					title="Drop-off photo"
				/>
			) : null}

			<SinglePhotoUploadDialog
				badgeLabel="Drop-off"
				onOpenChange={setIsDialogOpen}
				onUploaded={onUploaded}
				open={isDialogOpen}
				title="Upload drop-off photo"
				uploadPhoto={(input) => uploadOrderDropoffPhoto(order.id, input)}
			/>
		</section>
	);
};

const PickupsAttachment = ({
	pickupEvents,
}: {
	pickupEvents: PickupEvent[];
}) => {
	const [previewIndex, setPreviewIndex] = useState<number | null>(null);

	const eventsWithImage = pickupEvents.filter((event) =>
		Boolean(event.image_url),
	);

	const lightboxItems: PhotoLightboxItem[] = eventsWithImage.map((event) => {
		const pickedUpAt = formatOrderDateTime(event.picked_up_at);
		const pickedUpBy = event.picked_up_by?.name ?? "unknown operator";
		return {
			alt: `Pickup on ${pickedUpAt} by ${pickedUpBy}`,
			created_at: event.picked_up_at,
			id: `pickup-${event.id}`,
			image_url: event.image_url ?? "",
			primaryLabel: `Pickup · ${pickedUpBy}`,
		};
	});

	const openPreview = (eventId: number) => {
		const index = eventsWithImage.findIndex((event) => event.id === eventId);
		if (index >= 0) {
			setPreviewIndex(index);
		}
	};

	return (
		<section className="grid content-start gap-3">
			<AttachmentLabel>Pickups</AttachmentLabel>

			{pickupEvents.length > 0 ? (
				<div className="grid grid-cols-2 gap-3">
					{pickupEvents.map((event) => {
						const pickedUpAt = formatOrderDateTime(event.picked_up_at);
						const pickedUpBy = event.picked_up_by?.name ?? "unknown operator";

						return (
							<div className="grid gap-1.5 text-sm" key={event.id}>
								{event.image_url ? (
									<button
										aria-label={`Open pickup photo from ${pickedUpAt}`}
										className="block w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
										onClick={() => openPreview(event.id)}
										type="button"
									>
										<img
											alt={`Pickup on ${pickedUpAt} by ${pickedUpBy}`}
											className="aspect-16/10 w-full border object-cover"
											height={200}
											loading="lazy"
											src={event.image_url}
											width={320}
										/>
									</button>
								) : (
									<div className="flex aspect-16/10 items-center justify-center border bg-muted text-muted-foreground text-xs">
										No photo
									</div>
								)}
								<div className="grid gap-0.5">
									<p className="font-medium leading-tight">{pickedUpAt}</p>
									<p className="text-muted-foreground text-xs">
										by {pickedUpBy}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<p className="text-muted-foreground text-sm">No pickups yet.</p>
			)}

			{lightboxItems.length > 0 ? (
				<PhotoLightbox
					initialIndex={previewIndex ?? 0}
					items={lightboxItems}
					onOpenChange={(open) => {
						if (!open) {
							setPreviewIndex(null);
						}
					}}
					open={previewIndex !== null}
					title="Pickup photo"
				/>
			) : null}
		</section>
	);
};
