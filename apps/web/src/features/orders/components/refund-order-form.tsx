import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CreateOrderRefundPayload, OrderRefundReason } from "@/lib/api";

type RefundOrderMutation = UseMutationResult<
	unknown,
	Error,
	{ orderId: number; payload: CreateOrderRefundPayload },
	unknown
>;

interface RefundOrderFormProps {
	closeDialog: () => void;
	orderId: number;
	refundServiceIds: number[];
	refundMutation: RefundOrderMutation;
	reason?: OrderRefundReason;
}

export const RefundOrderForm = ({
	closeDialog,
	orderId,
	refundServiceIds,
	refundMutation,
	reason = "customer_cancelled",
}: RefundOrderFormProps) => {
	const [note, setNote] = useState("");
	const isPending = refundMutation.isPending;
	const trimmedNote = note.trim();
	const itemNoteRequired = reason === "other" && !trimmedNote;

	const handleConfirm = async () => {
		await refundMutation.mutateAsync({
			orderId,
			payload: {
				note: trimmedNote || undefined,
				items: refundServiceIds.map((serviceId) => ({
					order_service_id: serviceId,
					reason,
					note: trimmedNote || undefined,
				})),
			},
		});
		closeDialog();
	};

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted-foreground text-sm">
				Refund {refundServiceIds.length} remaining service
				{refundServiceIds.length === 1 ? "" : "s"}.
			</p>
			<Textarea
				placeholder={
					reason === "other"
						? "Refund note (required)"
						: "Refund note (optional)"
				}
				value={note}
				onChange={(event) => setNote(event.target.value)}
			/>
			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button variant="outline" onClick={closeDialog}>
					Go back
				</Button>
				<Button
					variant="destructive"
					disabled={
						isPending || refundServiceIds.length === 0 || itemNoteRequired
					}
					onClick={handleConfirm}
				>
					{isPending ? "Refunding…" : "Confirm Refund Order"}
				</Button>
			</div>
		</div>
	);
};
