import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
	COMPLAINT_RESOLUTIONS,
	formatComplaintResolution,
} from "@/features/complaints/lib/format";
import type { ResolveComplaintPayload } from "@/lib/api";

const resolveSchema = z.object({
	resolution: z.enum(COMPLAINT_RESOLUTIONS),
	resolution_note: z
		.string()
		.max(2000, "Keep it under 2000 characters.")
		.optional(),
	voucher_promised: z.boolean(),
});

type ResolveValues = z.infer<typeof resolveSchema>;

type ResolveComplaintMutation = UseMutationResult<
	unknown,
	Error,
	ResolveComplaintPayload,
	unknown
>;

interface ResolveComplaintFormProps {
	closeDialog: () => void;
	defaultVoucherPromised: boolean;
	mutation: ResolveComplaintMutation;
}

export const ResolveComplaintForm = ({
	closeDialog,
	defaultVoucherPromised,
	mutation,
}: ResolveComplaintFormProps) => {
	const form = useForm<ResolveValues>({
		resolver: zodResolver(resolveSchema),
		defaultValues: {
			resolution: "rework",
			resolution_note: "",
			voucher_promised: defaultVoucherPromised,
		},
	});

	const isPending = mutation.isPending;

	const onSubmit = async (values: ResolveValues) => {
		await mutation.mutateAsync({
			resolution: values.resolution,
			resolution_note: values.resolution_note?.trim() || undefined,
			voucher_promised: values.voucher_promised,
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
					name="resolution"
					render={({ field }) => (
						<Field>
							<FieldLabel htmlFor="complaint-resolution">Outcome</FieldLabel>
							<SelectField
								id="complaint-resolution"
								items={COMPLAINT_RESOLUTIONS.map((resolution) => ({
									value: resolution,
									label: formatComplaintResolution(resolution),
								}))}
								value={field.value}
								onValueChange={field.onChange}
								disabled={isPending}
								className="w-full"
							/>
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="resolution_note"
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="complaint-resolution-note">
								Note (optional)
							</FieldLabel>
							<Textarea
								aria-invalid={fieldState.invalid}
								id="complaint-resolution-note"
								placeholder="How was it resolved?"
								disabled={isPending}
								value={field.value ?? ""}
								onChange={field.onChange}
							/>
							<FieldError errors={[fieldState.error]} />
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="voucher_promised"
					render={({ field }) => (
						<Field orientation="horizontal">
							<Checkbox
								id="complaint-resolution-voucher"
								checked={field.value}
								onCheckedChange={(value) => field.onChange(Boolean(value))}
								disabled={isPending}
							/>
							<FieldLabel htmlFor="complaint-resolution-voucher">
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
						{isPending ? "Saving…" : "Close complaint"}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
};
