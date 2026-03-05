import { useQuery } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { fetchCustomers, queryKeys } from "@/lib/api";

type CustomerAutocompleteProps = {
	value: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	required?: boolean;
};

export function CustomerAutocomplete({
	value,
	onValueChange,
	disabled,
	required,
}: CustomerAutocompleteProps) {
	const { data: customers = [], isPending } = useQuery({
		queryKey: queryKeys.customers,
		queryFn: fetchCustomers,
	});

	return (
		<Field>
			<FieldLabel htmlFor="order-customer">Customer Reference</FieldLabel>
			<Combobox
				id="order-customer"
				required={required}
				triggerClassName="h-10 w-full text-sm"
				options={customers.map((customer) => ({
					value: String(customer.id),
					label: customer.name,
				}))}
				value={value}
				onValueChange={onValueChange}
				loading={isPending}
				placeholder="Select customer"
				searchPlaceholder="Search customer..."
				emptyText="No customer found"
				disabled={disabled}
			/>
		</Field>
	);
}
