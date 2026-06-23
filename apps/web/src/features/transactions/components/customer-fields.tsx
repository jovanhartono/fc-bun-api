import { CheckCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { PhoneNumberField } from "@/components/form/phone-number-field";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { TransactionDraftValues } from "@/features/transactions/cart/cart";
import { fetchCustomersPage } from "@/lib/api";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone-number";

// POS customer entry — two always-visible fields. The cashier enters the phone;
// a debounced exact lookup prefills + locks the name when that phone already
// exists (returning), or leaves it open to type (new). No id is resolved here —
// the server find-or-creates by phone at checkout. See ADR-0011.
export const CustomerFields = () => {
	const form = useFormContext<TransactionDraftValues>();
	const [phone = ""] = useWatch<TransactionDraftValues, ["customerPhone"]>({
		name: ["customerPhone"],
	});

	// Only look up once the input is a valid phone; partial numbers never match
	// the stored E.164 form, so querying them is pure noise.
	const [lookupPhone, setLookupPhone] = useState("");
	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setLookupPhone(
				isValidPhoneNumber(phone) ? normalizePhoneNumber(phone) : "",
			);
		}, 300);
		return () => window.clearTimeout(timeoutId);
	}, [phone]);

	const lookupQuery = useQuery({
		queryKey: ["customer-by-phone", lookupPhone],
		queryFn: () => fetchCustomersPage({ limit: 5, search: lookupPhone }),
		enabled: lookupPhone.length > 0,
	});

	// search is a substring match, so confirm exact phone equality before
	// treating it as the returning customer.
	const match = useMemo(() => {
		if (!lookupPhone) {
			return null;
		}
		return (
			lookupQuery.data?.items.find(
				(customer) => customer.phone_number === lookupPhone,
			) ?? null
		);
	}, [lookupQuery.data, lookupPhone]);

	const isReturning = match !== null;

	// Sync the name field to the lookup: fill+lock once per matched phone, clear
	// once when the match goes away. Keyed by phone so a refetch returning the
	// same customer doesn't clobber on every render.
	const appliedPhoneRef = useRef<string | null>(null);
	useEffect(() => {
		if (match) {
			if (appliedPhoneRef.current !== match.phone_number) {
				form.setValue("customerName", match.name, { shouldValidate: true });
				appliedPhoneRef.current = match.phone_number;
			}
			return;
		}
		if (appliedPhoneRef.current !== null) {
			form.setValue("customerName", "", { shouldValidate: true });
			appliedPhoneRef.current = null;
		}
	}, [match, form]);

	return (
		<div className="grid gap-4">
			<Controller
				name="customerPhone"
				control={form.control}
				render={({ field, fieldState }) => (
					<PhoneNumberField
						id="customer-phone"
						label="Phone"
						value={field.value}
						onValueChange={field.onChange}
						required
						error={fieldState.error}
						inputClassName="h-11"
					/>
				)}
			/>
			<Controller
				name="customerName"
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor="customer-name" asterisk>
							Name
						</FieldLabel>
						<Input
							id="customer-name"
							className="h-11"
							value={field.value}
							onChange={field.onChange}
							readOnly={isReturning}
							aria-invalid={fieldState.invalid}
							placeholder="e.g. Budi Santoso"
						/>
						{isReturning ? (
							<p className="flex items-center gap-1 text-xs text-muted-foreground">
								<CheckCircleIcon className="size-3.5" weight="fill" />
								Existing customer
							</p>
						) : (
							<FieldError errors={[fieldState.error]} />
						)}
					</Field>
				)}
			/>
		</div>
	);
};
