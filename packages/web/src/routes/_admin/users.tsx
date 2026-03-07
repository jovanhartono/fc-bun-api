import { POSTUserSchema } from "@fresclean/api/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { DataTable } from "@/components/data-table";
import { TablePagination } from "@/components/table-pagination";
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
} from "@/components/ui/sheet";
import {
	UserForm,
	type UserFormState,
} from "@/features/users/components/user-form";
import {
	createUser,
	queryKeys,
	type User,
	updateUser,
	updateUserStores,
} from "@/lib/api";
import { storesQueryOptions, usersPageQueryOptions } from "@/lib/query-options";

const PAGE_SIZE = 25;

const usersSearchSchema = z.object({
	page: z.coerce.number().int().positive().catch(1),
});

export const Route = createFileRoute("/_admin/users")({
	validateSearch: (search) => usersSearchSchema.parse(search),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				usersPageQueryOptions({
					limit: PAGE_SIZE,
					offset: (deps.page - 1) * PAGE_SIZE,
				}),
			),
			context.queryClient.ensureQueryData(storesQueryOptions()),
		]),
	component: UsersPage,
});

const userFormSchema = POSTUserSchema.extend({
	store_ids: z.array(z.number().int()),
});

const defaultForm: UserFormState = {
	username: "",
	name: "",
	password: "",
	confirm_password: "",
	role: "cashier",
	is_active: true,
	store_ids: [],
};

function UsersPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const queryClient = useQueryClient();
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [isSheetOpen, setSheetOpen] = useState(false);

	const form = useForm<UserFormState>({
		resolver: zodResolver(userFormSchema),
		defaultValues: defaultForm,
	});

	const usersQuery = useQuery(
		usersPageQueryOptions({
			limit: PAGE_SIZE,
			offset: (search.page - 1) * PAGE_SIZE,
		}),
	);
	const users = usersQuery.data?.items ?? [];
	const storesQuery = useQuery(storesQueryOptions());
	const storeMap = useMemo(
		() => new Map((storesQuery.data ?? []).map((store) => [store.id, store])),
		[storesQuery.data],
	);
	const userCount = usersQuery.data?.meta.total ?? 0;

	const resetForm = useCallback(() => {
		form.reset(defaultForm);
		setEditingUser(null);
		setSheetOpen(false);
	}, [form]);

	const createMutation = useMutation({
		mutationKey: ["create-user"],
		mutationFn: createUser,
	});

	const updateMutation = useMutation({
		mutationKey: ["update-user"],
		mutationFn: ({
			id,
			payload,
		}: {
			id: number;
			payload: Parameters<typeof updateUser>[1];
		}) => updateUser(id, payload),
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback(
		(user: User) => {
			setEditingUser(user);
			form.reset({
				username: user.username,
				name: user.name,
				password: "placeholder1",
				confirm_password: "placeholder1",
				role: user.role,
				is_active: user.is_active,
				store_ids: user.userStores.map((item) => item.store_id),
			});
			setSheetOpen(true);
		},
		[form],
	);

	const columns = useMemo<ColumnDef<User>[]>(
		() => [
			{ accessorKey: "username", header: "Username" },
			{ accessorKey: "name", header: "Name" },
			{
				accessorKey: "role",
				header: "Role",
				cell: ({ row }) => (
					<span className="uppercase">{row.original.role}</span>
				),
			},
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
				id: "stores",
				header: "Stores",
				cell: ({ row }) =>
					row.original.userStores.length > 0
						? row.original.userStores
								.map(
									(item) =>
										storeMap.get(item.store_id)?.code ?? String(item.store_id),
								)
								.join(", ")
						: "-",
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleEdit(row.original)}
						icon={<PencilSimpleLineIcon className="size-4" weight="duotone" />}
					>
						Edit
					</Button>
				),
			},
		],
		[handleEdit, storeMap],
	);

	const handleSubmit: SubmitHandler<UserFormState> = async (values) => {
		if (editingUser) {
			const payload: Parameters<typeof updateUser>[1] = {
				username: values.username,
				name: values.name,
				role: values.role,
				is_active: values.is_active,
			};
			await updateMutation.mutateAsync({
				id: editingUser.id,
				payload,
			});
			await updateUserStores(editingUser.id, {
				store_ids: values.store_ids,
			});
			await queryClient.invalidateQueries({ queryKey: ["users"] });
			resetForm();
			return;
		}

		const payload: Parameters<typeof createUser>[0] = {
			username: values.username,
			name: values.name,
			password: values.password,
			confirm_password: values.confirm_password,
			role: values.role,
			is_active: values.is_active,
		};

		const createdUser = await createMutation.mutateAsync(payload);
		const createdUserId = (createdUser as { data?: { id?: number } }).data?.id;
		if (createdUserId && values.store_ids.length > 0) {
			await updateUserStores(createdUserId, {
				store_ids: values.store_ids,
			});
		}
		await queryClient.invalidateQueries({ queryKey: ["users"] });
		await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
		resetForm();
	};

	return (
		<div className="grid gap-4">
			<Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
					<SheetHeader>
						<SheetTitle>{editingUser ? "Edit User" : "Add User"}</SheetTitle>
						<SheetDescription>
							{editingUser
								? `Editing ID ${editingUser.id}`
								: "Create a new user"}
						</SheetDescription>
					</SheetHeader>
					<UserForm
						control={form.control}
						handleSubmit={form.handleSubmit}
						onSubmit={handleSubmit}
						isSubmitting={isSubmitting}
						isEditing={!!editingUser}
						stores={storesQuery.data ?? []}
						onReset={resetForm}
					/>
				</SheetContent>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0">
						<CardTitle>User List</CardTitle>
						<div className="flex items-center gap-2">
							<Badge
								variant={usersQuery.isPending ? "secondary" : "outline"}
							>{`${userCount} items`}</Badge>
							<SheetTrigger
								render={
									<Button
										icon={<PlusIcon className="size-4" weight="duotone" />}
										onClick={() => {
											setEditingUser(null);
											form.reset(defaultForm);
										}}
									/>
								}
							>
								Add User
							</SheetTrigger>
						</div>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4">
							<DataTable
								columns={columns}
								data={users}
								isLoading={usersQuery.isPending}
							/>
							<TablePagination
								meta={usersQuery.data?.meta}
								isLoading={usersQuery.isPending}
								onPageChange={(page) => {
									void navigate({
										search: (prev) => ({
											...prev,
											page,
										}),
									});
								}}
							/>
						</div>
					</CardContent>
				</Card>
			</Sheet>
		</div>
	);
}
