import {
	CameraIcon,
	ImageSquareIcon,
	WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	memo,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { useCameraCapture } from "@/features/orders/hooks/useCameraCapture";
import {
	ACCEPTED_IMAGE_TYPES,
	isAcceptedImage,
} from "@/features/orders/utils/photo-upload";
import {
	createOrderPickupEvent,
	type OrderDetail,
	presignOrderPickupEvent,
	queryKeys,
	uploadFileToPresignedUrl,
} from "@/lib/api";
import { formatOrderServiceItemDetails } from "@/lib/order-service-item-details";

type ReadyService = OrderDetail["services"][number];

type PickupDialogContextValue = {
	orderId: number;
	readyServices: ReadyService[];
	selectedIds: Set<number>;
	toggleService: (serviceId: number) => void;
	selectAll: () => void;
	clearSelection: () => void;
	file: File | null;
	previewUrl: string | null;
	setFile: (file: File | null) => void;
	submit: () => Promise<void>;
	isPending: boolean;
};

type PickupCodeContextValue = {
	pickupCode: string;
	setPickupCode: (value: string) => void;
};

const PickupDialogContext = createContext<PickupDialogContextValue | null>(
	null,
);

const PickupCodeContext = createContext<PickupCodeContextValue | null>(null);

const usePickupDialog = () => {
	const context = use(PickupDialogContext);
	if (!context) {
		throw new Error(
			"usePickupDialog must be used within OrderPickupEventDialog",
		);
	}
	return context;
};

const usePickupCode = () => {
	const context = use(PickupCodeContext);
	if (!context) {
		throw new Error("usePickupCode must be used within OrderPickupEventDialog");
	}
	return context;
};

type OrderPickupEventDialogProps = {
	closeDialog: () => void;
	orderId: number;
	readyServices: ReadyService[];
};

export const OrderPickupEventDialog = ({
	closeDialog,
	orderId,
	readyServices,
}: OrderPickupEventDialogProps) => {
	const queryClient = useQueryClient();
	const [selectedIds, setSelectedIds] = useState<Set<number>>(
		() => new Set(readyServices.map((service) => service.id)),
	);
	const [file, setFileState] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [pickupCode, setPickupCode] = useState("");

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const setFile = useCallback((nextFile: File | null) => {
		setFileState(nextFile);
		setPreviewUrl((previous) => {
			if (previous) {
				URL.revokeObjectURL(previous);
			}
			return nextFile ? URL.createObjectURL(nextFile) : null;
		});
	}, []);

	const toggleService = useCallback((serviceId: number) => {
		setSelectedIds((previous) => {
			const next = new Set(previous);
			if (next.has(serviceId)) {
				next.delete(serviceId);
			} else {
				next.add(serviceId);
			}
			return next;
		});
	}, []);

	const selectAll = useCallback(() => {
		setSelectedIds(new Set(readyServices.map((service) => service.id)));
	}, [readyServices]);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const pickupMutation = useMutation({
		mutationFn: async () => {
			if (!file) {
				throw new Error("A pickup photo is required");
			}
			if (!isAcceptedImage(file.type)) {
				throw new Error("Unsupported image type");
			}
			if (!/^\d{6}$/.test(pickupCode)) {
				throw new Error("Enter the 6-digit pickup code");
			}
			const serviceIds = Array.from(selectedIds);
			if (serviceIds.length === 0) {
				throw new Error("Select at least one item to pick up");
			}

			const presigned = await presignOrderPickupEvent(orderId, {
				content_type: file.type,
			});
			await uploadFileToPresignedUrl(presigned.upload_url, file, file.type);
			return createOrderPickupEvent(orderId, {
				image_path: presigned.key,
				pickup_code: pickupCode,
				service_ids: serviceIds,
			});
		},
		onSuccess: async () => {
			toast.success("Pickup recorded");
			await queryClient.invalidateQueries({
				queryKey: queryKeys.orderDetail(orderId),
			});
			await queryClient.invalidateQueries({ queryKey: ["orders"] });
			closeDialog();
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to record pickup");
		},
	});

	const { mutateAsync: mutatePickup, isPending } = pickupMutation;
	const submit = useCallback(async () => {
		await mutatePickup();
	}, [mutatePickup]);

	const dialogValue = useMemo<PickupDialogContextValue>(
		() => ({
			clearSelection,
			file,
			isPending,
			orderId,
			previewUrl,
			readyServices,
			selectAll,
			selectedIds,
			setFile,
			submit,
			toggleService,
		}),
		[
			clearSelection,
			file,
			isPending,
			orderId,
			previewUrl,
			readyServices,
			selectAll,
			selectedIds,
			setFile,
			submit,
			toggleService,
		],
	);

	const codeValue = useMemo<PickupCodeContextValue>(
		() => ({ pickupCode, setPickupCode }),
		[pickupCode],
	);

	return (
		<PickupDialogContext.Provider value={dialogValue}>
			<PickupCodeContext.Provider value={codeValue}>
				<div className="flex flex-col gap-5">
					<PickupServiceList />
					<PickupCodeField />
					<PickupPhotoField />
					<PickupActions onCancel={closeDialog} />
				</div>
			</PickupCodeContext.Provider>
		</PickupDialogContext.Provider>
	);
};

const PickupCodeField = memo(() => {
	const { pickupCode, setPickupCode } = usePickupCode();

	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">
				Pickup code{" "}
				<span className="text-muted-foreground">(6 digits, from customer)</span>
			</p>
			<InputOTP
				maxLength={6}
				value={pickupCode}
				onChange={setPickupCode}
				autoComplete="one-time-code"
				inputMode="numeric"
				pattern="[0-9]*"
				containerClassName="justify-start"
			>
				<InputOTPGroup>
					<InputOTPSlot index={0} className="size-11 text-base" />
					<InputOTPSlot index={1} className="size-11 text-base" />
					<InputOTPSlot index={2} className="size-11 text-base" />
					<InputOTPSlot index={3} className="size-11 text-base" />
					<InputOTPSlot index={4} className="size-11 text-base" />
					<InputOTPSlot index={5} className="size-11 text-base" />
				</InputOTPGroup>
			</InputOTP>
		</div>
	);
});
PickupCodeField.displayName = "PickupCodeField";

const PickupServiceList = memo(() => {
	const {
		readyServices,
		selectedIds,
		toggleService,
		selectAll,
		clearSelection,
	} = usePickupDialog();

	if (readyServices.length === 0) {
		return (
			<p className="text-muted-foreground border bg-muted/30 px-3 py-4 text-sm">
				Nothing is ready for pickup yet.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium">
					Collecting {selectedIds.size} of {readyServices.length}
				</p>
				<div className="flex gap-1.5">
					<Button type="button" size="sm" variant="outline" onClick={selectAll}>
						Select all
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={clearSelection}
					>
						Clear
					</Button>
				</div>
			</div>
			<ul className="grid max-h-64 gap-2 overflow-y-auto">
				{readyServices.map((service) => (
					<PickupServiceRow
						key={service.id}
						service={service}
						isSelected={selectedIds.has(service.id)}
						onToggle={toggleService}
					/>
				))}
			</ul>
		</div>
	);
});
PickupServiceList.displayName = "PickupServiceList";

type PickupServiceRowProps = {
	isSelected: boolean;
	onToggle: (serviceId: number) => void;
	service: ReadyService;
};

const PickupServiceRow = memo(
	({ isSelected, onToggle, service }: PickupServiceRowProps) => {
		const id = `pickup-service-${service.id}`;
		return (
			<li>
				<label
					htmlFor={id}
					className="flex min-h-11 cursor-pointer items-center gap-3 border bg-card px-3 py-2.5 text-sm"
				>
					<Checkbox
						id={id}
						checked={isSelected}
						onCheckedChange={() => onToggle(service.id)}
					/>
					<div className="min-w-0 flex-1">
						<span className="block font-medium leading-snug">
							{service.item_code ?? `Service #${service.id}`}
						</span>
						<p className="text-muted-foreground text-xs">
							{service.service?.name ?? "Service"} ·{" "}
							{formatOrderServiceItemDetails(service)}
						</p>
					</div>
				</label>
			</li>
		);
	},
);
PickupServiceRow.displayName = "PickupServiceRow";

const PickupPhotoField = memo(() => {
	const { file, previewUrl, setFile } = usePickupDialog();
	const camera = useCameraCapture();
	const inputRef = useRef<HTMLInputElement | null>(null);

	const stopCamera = camera.stop;
	// Release the camera when the field unmounts (dialog closes mid-capture).
	useEffect(() => stopCamera, [stopCamera]);

	const handleFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const nextFile = event.target.files?.[0] ?? null;
			setFile(nextFile);
		},
		[setFile],
	);

	const handleCapture = useCallback(async () => {
		const blob = await camera.capture();
		if (!blob) {
			return;
		}
		setFile(
			new File([blob], `pickup-${Date.now()}.jpg`, { type: "image/jpeg" }),
		);
		// Single still: drop the live feed so the captured preview shows in place.
		stopCamera();
	}, [camera, setFile, stopCamera]);

	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">
				Pickup photo <span className="text-muted-foreground">(required)</span>
			</p>

			<div className="relative aspect-4/3 w-full overflow-hidden border bg-black sm:aspect-16/10">
				{camera.isOpen ? (
					<video
						ref={camera.previewRef}
						autoPlay
						muted
						playsInline
						onLoadedMetadata={camera.markReady}
						className="size-full object-cover"
					/>
				) : previewUrl ? (
					<img
						src={previewUrl}
						alt="Pickup preview"
						className="size-full object-contain"
					/>
				) : (
					<div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
						<CameraIcon className="size-8 opacity-60" />
						<p className="text-sm">Photo of the customer collecting items</p>
					</div>
				)}

				{camera.error ? (
					<div className="absolute inset-x-3 bottom-3 flex items-start gap-2 border border-destructive/40 bg-destructive px-3 py-2 text-sm text-destructive-foreground">
						<WarningCircleIcon
							className="mt-0.5 size-4 shrink-0"
							weight="fill"
						/>
						<span>{camera.error}</span>
					</div>
				) : null}
			</div>

			<input
				ref={inputRef}
				type="file"
				aria-label="Choose pickup photo"
				accept={ACCEPTED_IMAGE_TYPES.join(",")}
				capture="environment"
				className="sr-only"
				onChange={handleFileChange}
			/>

			<div className="flex items-center gap-3">
				{camera.isOpen ? (
					<>
						<div className="flex-1" />
						<button
							aria-label="Capture photo"
							className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-foreground/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
							disabled={!camera.isReady}
							onClick={handleCapture}
							type="button"
						>
							<span className="size-10 rounded-full bg-foreground transition active:scale-90" />
						</button>
						<div className="flex-1" />
					</>
				) : (
					<Button
						type="button"
						variant="outline"
						className="flex-1"
						icon={<CameraIcon className="size-4" />}
						onClick={() => void camera.open()}
					>
						{file ? "Retake" : "Open camera"}
					</Button>
				)}

				<Button
					type="button"
					variant="outline"
					size="icon-lg"
					aria-label="Choose from device"
					className="shrink-0"
					icon={<ImageSquareIcon className="size-4" />}
					onClick={() => inputRef.current?.click()}
				/>
			</div>
		</div>
	);
});
PickupPhotoField.displayName = "PickupPhotoField";

const PickupActions = memo(({ onCancel }: { onCancel: () => void }) => {
	const { file, isPending, selectedIds, submit } = usePickupDialog();
	const { pickupCode } = usePickupCode();
	const isSubmitDisabled =
		!file || selectedIds.size === 0 || pickupCode.length !== 6 || isPending;

	return (
		<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<Button variant="outline" onClick={onCancel}>
				Cancel
			</Button>
			<Button
				disabled={isSubmitDisabled}
				loading={isPending}
				loadingText="Saving…"
				onClick={submit}
			>
				Record pickup
			</Button>
		</div>
	);
});
PickupActions.displayName = "PickupActions";
