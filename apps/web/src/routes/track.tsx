import {
	ArrowCounterClockwiseIcon,
	CheckCircleIcon,
	PackageIcon,
	PhoneIcon,
	SnowflakeIcon,
	SparkleIcon,
	TShirtIcon,
	WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { trackPublicOrder } from "@/lib/api";
import { formatOrderServiceItemDetails } from "@/lib/order-service-item-details";
import { cn } from "@/lib/utils";

const trackSearchSchema = z.object({
	code: z.string().trim().min(1).max(32).optional(),
	phone: z.string().trim().min(1).max(20).optional(),
});

export const Route = createFileRoute("/track")({
	validateSearch: (search) => trackSearchSchema.parse(search),
	component: TrackOrderPage,
});

type OrderStatus =
	| "created"
	| "processing"
	| "ready_for_pickup"
	| "completed"
	| "cancelled";

type Stage = {
	key: "received" | "cleaned" | "qc" | "ready";
	label: string;
	caption: string;
	icon: React.ComponentType<{ className?: string; weight?: "duotone" }>;
};

const STAGES: readonly Stage[] = [
	{
		key: "received",
		label: "Diterima",
		caption: "Sneaker kamu sudah kami catat",
		icon: PackageIcon,
	},
	{
		key: "cleaned",
		label: "Dibersihkan",
		caption: "Sedang dibersihkan oleh tim",
		icon: SparkleIcon,
	},
	{
		key: "qc",
		label: "Quality Check",
		caption: "Kami cek hasilnya sekali lagi",
		icon: SnowflakeIcon,
	},
	{
		key: "ready",
		label: "Siap Ambil",
		caption: "Tinggal mampir, tunjukkan kode",
		icon: TShirtIcon,
	},
] as const;

function getStageIndexFromOrderStatus(
	status: OrderStatus,
	serviceStatuses: string[],
): number {
	if (status === "completed") {
		return STAGES.length;
	}
	if (status === "ready_for_pickup") {
		return 3;
	}
	if (status === "processing") {
		if (serviceStatuses.some((s) => s === "quality_check")) {
			return 2;
		}
		return 1;
	}
	return 0;
}

const SERVICE_STATUS_LABELS: Record<string, string> = {
	queued: "Antri",
	processing: "Dibersihkan",
	quality_check: "Quality Check",
	ready_for_pickup: "Siap Ambil",
	picked_up: "Sudah Diambil",
	refunded: "Dikembalikan",
	cancelled: "Dibatalkan",
};

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

function ProgressIndicator({
	stageIndex,
	isCancelled,
}: {
	stageIndex: number;
	isCancelled: boolean;
}) {
	return (
		<div className="grid gap-4">
			<div className="grid grid-cols-4 gap-2">
				{STAGES.map((stage, index) => {
					const isComplete = !isCancelled && stageIndex > index;
					const isCurrent = !isCancelled && stageIndex === index;
					const isDone = !isCancelled && stageIndex >= STAGES.length;
					const Icon = stage.icon;
					return (
						<div
							key={stage.key}
							className={cn(
								"flex flex-col items-center gap-2 text-center",
								isCancelled && "opacity-40",
							)}
						>
							<div
								className={cn(
									"flex size-12 items-center justify-center border transition-all",
									isComplete || isDone
										? "border-[#7bc4a3] bg-[#7bc4a3] text-[#0f1a16]"
										: isCurrent
											? "border-[#7bc4a3] bg-[#f2f7f4] text-[#0f1a16]"
											: "border-[#2a2922]/20 bg-white text-[#2a2922]/40",
								)}
							>
								{isComplete || isDone ? (
									<CheckCircleIcon className="size-5" weight="duotone" />
								) : (
									<Icon className="size-5" weight="duotone" />
								)}
							</div>
							<div className="grid gap-0.5">
								<p
									className={cn(
										"font-semibold text-xs tracking-[0.02em]",
										isComplete || isCurrent || isDone
											? "text-[#0f1a16]"
											: "text-[#2a2922]/50",
									)}
								>
									{stage.label}
								</p>
								<p
									className={cn(
										"hidden text-[11px] leading-snug sm:block",
										isComplete || isCurrent || isDone
											? "text-[#2a2922]/70"
											: "text-[#2a2922]/40",
									)}
								>
									{stage.caption}
								</p>
							</div>
						</div>
					);
				})}
			</div>
			<div className="relative hidden h-0.5 bg-[#2a2922]/10 sm:block">
				<div
					className="absolute left-0 top-0 h-full bg-[#7bc4a3] transition-all"
					style={{
						width: isCancelled
							? "0%"
							: `${Math.min(100, (stageIndex / STAGES.length) * 100)}%`,
					}}
				/>
			</div>
		</div>
	);
}

function TrackOrderPage() {
	const search = Route.useSearch();
	const [code, setCode] = useState(search.code ?? "");
	const [phone, setPhone] = useState(search.phone ?? "");
	const [formError, setFormError] = useState<string | null>(null);

	const trackMutation = useMutation({
		mutationFn: trackPublicOrder,
	});
	const didAutoRunRef = useRef(false);

	useEffect(() => {
		if (didAutoRunRef.current) {
			return;
		}
		if (!search.code || !search.phone) {
			return;
		}
		didAutoRunRef.current = true;
		void trackMutation.mutateAsync({
			code: search.code,
			phone_number: search.phone,
		});
	}, [search.code, search.phone, trackMutation.mutateAsync]);

	const handleTrack = async () => {
		const trimmedCode = code.trim();
		const trimmedPhone = phone.trim();
		if (!trimmedCode || !trimmedPhone) {
			setFormError("Kode order dan nomor WhatsApp wajib diisi");
			return;
		}
		setFormError(null);
		try {
			await trackMutation.mutateAsync({
				code: trimmedCode,
				phone_number: trimmedPhone,
			});
		} catch {
			// global toast handles it; ignore
		}
	};

	const sortedServices = useMemo(() => {
		if (!trackMutation.data) {
			return [];
		}
		return [...trackMutation.data.services].sort((a, b) => a.id - b.id);
	}, [trackMutation.data]);

	const stageIndex = useMemo(() => {
		if (!trackMutation.data) {
			return 0;
		}
		return getStageIndexFromOrderStatus(
			trackMutation.data.status as OrderStatus,
			sortedServices.map((s) => s.status),
		);
	}, [trackMutation.data, sortedServices]);

	const isCancelled = trackMutation.data?.status === "cancelled";
	const isReady = trackMutation.data?.status === "ready_for_pickup";

	const storePhoneE164 = trackMutation.data?.store.phone_number?.replace(
		/\D/g,
		"",
	);

	return (
		<div className="min-h-dvh bg-[#f7f4ef] text-[#2a2922]">
			<header className="flex items-center justify-between gap-3 border-b border-[#2a2922]/10 bg-[#f7f4ef]/90 px-4 py-4 backdrop-blur sm:px-8">
				<div className="flex items-center gap-2 font-bold text-sm tracking-[0.22em] uppercase text-[#0f1a16]">
					<SparkleIcon className="size-5" weight="duotone" />
					Fresclean
				</div>
				<a
					href="https://wa.me/6281290033232"
					target="_blank"
					rel="noreferrer"
					className="hidden items-center gap-1.5 border border-[#2a2922]/15 bg-white/70 px-3 py-1.5 text-xs font-medium text-[#0f1a16] hover:bg-white sm:inline-flex"
				>
					<WhatsappLogoIcon className="size-4" weight="duotone" />
					Bantuan
				</a>
			</header>

			<main className="mx-auto grid max-w-3xl gap-8 px-4 py-10 sm:px-8 sm:py-16">
				<section className="grid gap-3 text-center">
					<p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#7bc4a3]">
						Lacak order kamu
					</p>
					<h1 className="text-3xl font-bold leading-tight tracking-tight text-[#0f1a16] sm:text-4xl">
						Sneaker kamu sedang di tangan yang tepat.
					</h1>
					<p className="mx-auto max-w-lg text-sm text-[#2a2922]/70 sm:text-base">
						Masukkan kode order yang kami kirim via WhatsApp dan nomor yang kamu
						pakai waktu drop-off.
					</p>
				</section>

				<section className="border border-[#2a2922]/10 bg-white p-5 sm:p-7">
					<div className="grid gap-4">
						<Field data-invalid={!!formError}>
							<FieldLabel
								htmlFor="track-code"
								className="text-xs font-medium uppercase tracking-[0.12em] text-[#2a2922]/70"
							>
								Kode Order
							</FieldLabel>
							<Input
								id="track-code"
								placeholder="contoh: ABC/06032026/1"
								value={code}
								onChange={(event) => setCode(event.target.value)}
								className="h-11 border-[#2a2922]/15 bg-[#f7f4ef] font-mono text-sm focus-visible:border-[#7bc4a3] focus-visible:ring-[#7bc4a3]/30"
							/>
						</Field>
						<Field data-invalid={!!formError}>
							<FieldLabel
								htmlFor="track-phone"
								className="text-xs font-medium uppercase tracking-[0.12em] text-[#2a2922]/70"
							>
								Nomor WhatsApp
							</FieldLabel>
							<Input
								id="track-phone"
								placeholder="contoh: 08123456789"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								className="h-11 border-[#2a2922]/15 bg-[#f7f4ef] font-mono text-sm focus-visible:border-[#7bc4a3] focus-visible:ring-[#7bc4a3]/30"
							/>
						</Field>
						{formError ? (
							<FieldError errors={[{ message: formError }]} />
						) : null}
						<Button
							type="button"
							onClick={handleTrack}
							disabled={trackMutation.isPending}
							className="h-11 bg-[#0f1a16] text-sm font-medium uppercase tracking-[0.14em] text-[#f7f4ef] hover:bg-[#2a2922]"
						>
							{trackMutation.isPending ? "Mencari..." : "Lacak Order"}
						</Button>
					</div>
				</section>

				{trackMutation.data ? (
					<>
						<section className="grid gap-5 border border-[#2a2922]/10 bg-white p-5 sm:p-7">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="grid gap-1">
									<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#2a2922]/60">
										Kode order
									</p>
									<p className="font-mono text-lg font-semibold tracking-tight">
										{trackMutation.data.code}
									</p>
								</div>
								<div className="text-right text-xs text-[#2a2922]/70">
									<p>{trackMutation.data.store.name}</p>
									<p className="font-mono text-[11px] text-[#2a2922]/50">
										{trackMutation.data.customer.phone_number_masked}
									</p>
								</div>
							</div>

							<ProgressIndicator
								stageIndex={stageIndex}
								isCancelled={isCancelled}
							/>

							{isCancelled ? (
								<div className="border border-[#2a2922]/15 bg-[#2a2922]/5 p-4 text-sm text-[#2a2922]/80">
									Order kamu dibatalkan. Hubungi cabang untuk informasi lebih
									lanjut.
								</div>
							) : null}

							{isReady ? (
								<div className="border border-[#7bc4a3] bg-[#f2f7f4] p-4 text-sm text-[#0f1a16]">
									Sneaker siap diambil. Tunjukkan kode order ke kasir.
								</div>
							) : null}
						</section>

						<section className="grid gap-3">
							<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#2a2922]/60">
								Item kamu ({sortedServices.length})
							</p>
							<div className="grid gap-3">
								{sortedServices.map((item) => (
									<article
										key={item.id}
										className="border border-[#2a2922]/10 bg-white p-4 text-sm"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="min-w-0">
												<p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#2a2922]/50">
													{item.item_code ?? `#${item.id}`}
												</p>
												<p className="font-semibold text-sm">
													{item.service?.name ?? "Service"}
												</p>
											</div>
											<span
												className={cn(
													"border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em]",
													item.status === "ready_for_pickup"
														? "border-[#7bc4a3] bg-[#f2f7f4] text-[#0f1a16]"
														: item.status === "picked_up"
															? "border-[#2a2922]/15 bg-[#2a2922]/5 text-[#2a2922]/60"
															: item.status === "cancelled" ||
																	item.status === "refunded"
																? "border-destructive/40 bg-destructive/10 text-destructive"
																: "border-[#2a2922]/15 bg-white text-[#0f1a16]",
												)}
											>
												{SERVICE_STATUS_LABELS[item.status] ?? item.status}
											</span>
										</div>
										<p className="mt-2 text-xs text-[#2a2922]/60">
											{formatOrderServiceItemDetails(item)}
										</p>

										{item.statusLogs.length > 0 ? (
											<ol className="mt-3 grid gap-1.5 border-t border-[#2a2922]/10 pt-3">
												{[...item.statusLogs]
													.sort(
														(a, b) =>
															new Date(b.created_at).getTime() -
															new Date(a.created_at).getTime(),
													)
													.slice(0, 3)
													.map((log) => (
														<li
															key={log.id}
															className="flex items-baseline justify-between gap-3 text-xs text-[#2a2922]/70"
														>
															<span>
																{SERVICE_STATUS_LABELS[log.to_status] ??
																	log.to_status}
															</span>
															<span className="font-mono text-[11px] text-[#2a2922]/50 tabular-nums">
																{dateTimeFormatter.format(
																	new Date(log.created_at),
																)}
															</span>
														</li>
													))}
											</ol>
										) : null}
									</article>
								))}
							</div>
						</section>

						<section className="border border-[#2a2922]/10 bg-white p-5 sm:p-7">
							<div className="grid gap-3">
								<p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#2a2922]/60">
									Ada pertanyaan?
								</p>
								<p className="text-sm text-[#2a2922]/80">
									Hubungi cabang yang mengerjakan sneaker kamu:
								</p>
								<div className="flex flex-wrap gap-2">
									<a
										href={
											storePhoneE164
												? `https://wa.me/${storePhoneE164}`
												: "https://wa.me/6281290033232"
										}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-2 border border-[#7bc4a3] bg-[#f2f7f4] px-3 py-2 text-sm font-medium text-[#0f1a16] hover:bg-[#e7f1ec]"
									>
										<WhatsappLogoIcon className="size-4" weight="duotone" />
										WhatsApp {trackMutation.data.store.name}
									</a>
									<a
										href={`tel:${trackMutation.data.store.phone_number ?? ""}`}
										className="inline-flex items-center gap-2 border border-[#2a2922]/15 bg-white px-3 py-2 text-sm font-medium text-[#0f1a16] hover:bg-[#f7f4ef]"
									>
										<PhoneIcon className="size-4" weight="duotone" />
										{trackMutation.data.store.phone_number ?? "Telepon"}
									</a>
								</div>
							</div>
						</section>

						<button
							type="button"
							onClick={() => {
								trackMutation.reset();
								setCode("");
								setPhone("");
							}}
							className="inline-flex items-center justify-self-start gap-2 border border-[#2a2922]/15 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#0f1a16] hover:bg-[#2a2922]/5"
						>
							<ArrowCounterClockwiseIcon
								className="size-3.5"
								weight="duotone"
							/>
							Lacak order lain
						</button>
					</>
				) : (
					<section className="grid gap-5 border border-dashed border-[#2a2922]/15 bg-white/60 p-5 sm:p-7">
						<p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#2a2922]/60">
							Alur singkat
						</p>
						<ProgressIndicator stageIndex={-1} isCancelled={false} />
					</section>
				)}
			</main>

			<footer className="mt-auto border-t border-[#2a2922]/10 bg-[#f7f4ef] px-4 py-6 text-center text-xs text-[#2a2922]/50 sm:px-8">
				Fresclean · Sneaker cleaning & restoration
			</footer>
		</div>
	);
}
