import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { OpenComplaintPayload } from "@/lib/api";

const openComplaintSchema = z.object({
	order_service_id: z.number().int().positive(),
	reason: z.string().trim().min(1, "Describe the complaint."),
	voucher_promised: z.boolean(),
	start_rework: z.boolean(),
});

type OpenComplaintValues = z.infer<typeof openComplaintSchema>;

export interface ComplaintLineOption {
	id: number;
	label: string;
}

type OpenComplaintMutation = UseMutationResult<
	unknown,
	Error,
	OpenComplaintPayload,
	unknown
>;

interface OpenComplaintFormProps {
	closeDialog: () => void;
	lines: ComplaintLineOption[];
	mutation: OpenComplaintMutation;
}

export const OpenComplaintForm = ({
	closeDialog,
	lines,
	mutation,
}: OpenComplaintFormProps) => {
	const form = useForm<OpenComplaintValues>({
		resolver: zodResolver(openComplaintSchema),
		defaultValues: {
			order_service_id: lines[0]?.id ?? 0,
			reason: "",
			voucher_promised: false,
			start_rework: true,
		},
	});

	const isPending = mutation.isPending;
	const showLinePicker = lines.length > 1;

	const onSubmit = async (values: OpenComplaintValues) => {
		// Zod already trims `reason`; values satisfies OpenComplaintPayload.
		await mutation.mutateAsync(values);
		closeDialog();
	};

	return (
		<FormProvider {...form}>
			<form
				className="flex flex-col gap-4"
				onSubmit={form.handleSubmit(onSubmit)}
			>
				{showLinePicker ? (
					<Controller
						control={form.control}
						name="order_service_id"
						render={({ field, fieldState }) => (
							<Field data-invalid={fieldState.invalid}>
								<FieldLabel htmlFor="complaint-line">Item</FieldLabel>
								<SelectField
									id="complaint-line"
									items={lines.map((line) => ({
										value: String(line.id),
										label: line.label,
									}))}
									value={String(field.value)}
									onValueChange={(value) => field.onChange(Number(value))}
									disabled={isPending}
									placeholder="Select item"
									className="w-full"
								/>
								<FieldError errors={[fieldState.error]} />
							</Field>
						)}
					/>
				) : null}

				<Controller
					control={form.control}
					name="reason"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="complaint-reason">Reason</FieldLabel>
							<Textarea
								id="complaint-reason"
								placeholder="What is the customer unhappy about?"
								disabled={isPending}
								aria-invalid={fieldState.invalid}
								value={field.value}
								onChange={field.onChange}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="start_rework"
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="complaint-start-rework"
								checked={field.value}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
								disabled={isPending}
							/>
							<FieldLabel htmlFor="complaint-start-rework">
								Start rework now (free re-clean on this order)
							</FieldLabel>
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="voucher_promised"
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="complaint-voucher"
								checked={field.value}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
								disabled={isPending}
							/>
							<FieldLabel htmlFor="complaint-voucher">
								Voucher promised
							</FieldLabel>
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
					<Button type="submit" disabled={isPending}>
						{isPending ? "Opening…" : "Open complaint"}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
};
