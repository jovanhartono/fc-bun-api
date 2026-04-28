import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CancelOrderPayload, OrderCancelReason } from "@/lib/api";
import { CANCEL_REASONS, formatCancelReason } from "@/lib/status";

const cancelFormSchema = z
	.object({
		cancel_reason: z.enum(CANCEL_REASONS as readonly [OrderCancelReason]),
		cancel_note: z.string().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.cancel_reason === "other" && !(value.cancel_note ?? "").trim()) {
			ctx.addIssue({
				code: "custom",
				message: "Cancel note is required when reason is Other.",
				path: ["cancel_note"],
			});
		}
	});

type CancelFormValues = z.infer<typeof cancelFormSchema>;

type CancelOrderMutation = UseMutationResult<
	unknown,
	Error,
	CancelOrderPayload,
	unknown
>;

interface CancelOrderFormProps {
	closeDialog: () => void;
	cancelOrderMutation: CancelOrderMutation;
}

export const CancelOrderForm = ({
	closeDialog,
	cancelOrderMutation,
}: CancelOrderFormProps) => {
	const form = useForm<CancelFormValues>({
		resolver: zodResolver(cancelFormSchema),
		defaultValues: { cancel_reason: "customer_request", cancel_note: "" },
	});
	const isPending = cancelOrderMutation.isPending;

	const onSubmit = async (values: CancelFormValues) => {
		await cancelOrderMutation.mutateAsync({
			cancel_reason: values.cancel_reason,
			cancel_note: values.cancel_note?.trim() || undefined,
		});
		closeDialog();
	};

	return (
		<FormProvider {...form}>
			<form
				className="flex flex-col gap-4"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<Controller
					control={form.control}
					name="cancel_reason"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="order-cancel-reason">Reason</FieldLabel>
							<Select
								value={field.value}
								onValueChange={(value) =>
									field.onChange(value as OrderCancelReason)
								}
								disabled={isPending}
							>
								<SelectTrigger id="order-cancel-reason" className="w-full">
									<SelectValue placeholder="Select reason" />
								</SelectTrigger>
								<SelectContent>
									{CANCEL_REASONS.map((reason) => (
										<SelectItem key={reason} value={reason}>
											{formatCancelReason(reason)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="cancel_note"
					render={({ fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="order-cancel-note">
								Note (required for Other)
							</FieldLabel>
							<Textarea
								id="order-cancel-note"
								placeholder="Cancel note"
								disabled={isPending}
								aria-invalid={fieldState.invalid}
								{...form.register("cancel_note")}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={closeDialog}
						disabled={isPending}
					>
						Go back
					</Button>
					<Button type="submit" variant="destructive" disabled={isPending}>
						{isPending ? "Cancelling…" : "Confirm Cancel Order"}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
};
