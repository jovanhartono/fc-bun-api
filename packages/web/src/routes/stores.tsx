import { POSTStoreSchema } from "@fresclean/api/schema";
import { PencilSimpleLine, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
	useSheet,
} from "@/components/ui/sheet";
import {
	StoreForm,
	type StoreFormState,
} from "@/features/stores/components/store-form";
import {
	createStore,
	fetchStores,
	queryKeys,
	type Store,
	updateStore,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone-number";

export const Route = createFileRoute("/stores")({
	beforeLoad: requireAuth,
	component: StoresPage,
});

const defaultForm: StoreFormState = {
	code: "",
	name: "",
	phone_number: "",
	address: "",
	latitude: "",
	longitude: "",
	is_active: true,
};

function StoresPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<StoreFormState>(defaultForm);
	const [editingStore, setEditingStore] = useState<Store | null>(null);
	const sheet = useSheet();
	const { data: stores = [], isPending } = useQuery({
		queryKey: queryKeys.stores,
		queryFn: fetchStores,
	});
	const storeCount = stores.length;

	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingStore(null);
		sheet.close();
	}, []);
	const createMutation = useMutation({
		mutationKey: ["create-store"],
		mutationFn: createStore,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.stores });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
	});
	const updateMutation = useMutation({
		mutationKey: ["update-store"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateStore>[1];
		}) => updateStore(id, payload),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.stores });
			resetForm();
		},
	});
	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback((store: Store) => {
		setEditingStore(store);
		setForm({
			code: store.code,
			name: store.name,
			phone_number: store.phone_number,
			address: store.address,
			latitude: String(store.latitude),
			longitude: String(store.longitude),
			is_active: store.is_active,
		});
		sheet.open();
	}, []);
	const columns = useMemo<ColumnDef<Store>[]>(
		() => [
			{
				accessorKey: "code",
				header: "Code",
				cell: ({ row }) => (
					<span className="font-medium">{row.original.code}</span>
				),
			},
			{ accessorKey: "name", header: "Store" },
			{ accessorKey: "phone_number", header: "Phone" },
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => (
					<Badge variant={row.original.is_active ? "success" : "danger"}>
						{row.original.is_active ? "Active" : "Inactive"}
					</Badge>
				),
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleEdit(row.original)}
					>
						<PencilSimpleLine className="size-4" weight="duotone" />
						Edit
					</Button>
				),
			},
		],
		[handleEdit],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isValidPhoneNumber(form.phone_number)) {
			toast.error("Invalid store phone number");
			return;
		}
		const normalizedPhoneNumber = normalizePhoneNumber(form.phone_number);

		const parsed = POSTStoreSchema.safeParse({
			code: form.code,
			name: form.name,
			phone_number: normalizedPhoneNumber,
			address: form.address,
			latitude: form.latitude,
			longitude: form.longitude,
			is_active: form.is_active,
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid store payload");
			return;
		}
		if (editingStore) {
			await updateMutation.mutateAsync({
				id: editingStore.id,
				payload: parsed.data,
			});
			return;
		}
		await createMutation.mutateAsync(parsed.data);
	};

	return (
		<AppShell title="Stores" description="Insert and edit store master data.">
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>
								{editingStore ? "Edit Store" : "Add Store"}
							</SheetTitle>
							<SheetDescription>
								{editingStore
									? `Editing ID ${editingStore.id}`
									: "Create a new store"}
							</SheetDescription>
						</SheetHeader>
						<StoreForm
							form={form}
							setForm={setForm}
							isSubmitting={isSubmitting}
							isEditing={!!editingStore}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>Store List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${storeCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingStore(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add Store
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable
								columns={columns}
								data={stores}
								isLoading={isPending}
							/>
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
