import { POSTUserSchema, PUTUserSchema } from "@fresclean/api/schema";
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
	UserForm,
	type UserFormState,
} from "@/features/users/components/user-form";
import {
	createUser,
	fetchUsers,
	queryKeys,
	type User,
	updateUser,
} from "@/lib/api";
import { requireAuth } from "@/lib/auth";

export const Route = createFileRoute("/users")({
	beforeLoad: requireAuth,
	component: UsersPage,
});

const defaultForm: UserFormState = {
	username: "",
	name: "",
	password: "",
	confirm_password: "",
	role: "cashier",
	is_active: true,
};

function UsersPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<UserFormState>(defaultForm);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const sheet = useSheet();

	const { data: users = [], isPending } = useQuery({
		queryKey: queryKeys.users,
		queryFn: fetchUsers,
	});
	const userCount = users.length;

	const resetForm = useCallback(() => {
		setForm(defaultForm);
		setEditingUser(null);
		sheet.close();
	}, []);

	const createMutation = useMutation({
		mutationKey: ["create-user"],
		mutationFn: createUser,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.users });
			await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
			resetForm();
		},
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
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.users });
			resetForm();
		},
	});

	const isSubmitting = createMutation.isPending || updateMutation.isPending;

	const handleEdit = useCallback((user: User) => {
		setEditingUser(user);
		setForm({
			username: user.username,
			name: user.name,
			password: "",
			confirm_password: "",
			role: user.role,
			is_active: user.is_active,
		});
		sheet.open();
	}, []);

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

		if (editingUser) {
			const updateParsed = PUTUserSchema.safeParse({
				username: form.username,
				name: form.name,
				role: form.role,
				is_active: form.is_active,
			});
			if (!updateParsed.success) {
				toast.error(
					updateParsed.error.issues[0]?.message ?? "Invalid user payload",
				);
				return;
			}
			await updateMutation.mutateAsync({
				id: editingUser.id,
				payload: updateParsed.data,
			});
			return;
		}

		const createParsed = POSTUserSchema.safeParse({
			username: form.username,
			name: form.name,
			password: form.password,
			confirm_password: form.confirm_password,
			role: form.role,
			is_active: form.is_active,
		});

		if (!createParsed.success) {
			toast.error(
				createParsed.error.issues[0]?.message ?? "Invalid user payload",
			);
			return;
		}

		await createMutation.mutateAsync(createParsed.data);
	};

	return (
		<AppShell
			title="Users"
			description="Insert and edit users with role management."
		>
			<div className="grid gap-4">
				<Sheet open={sheet.isOpen} onOpenChange={sheet.setOpen}>
					<SheetContent
						side="right"
						className="w-full max-w-xl overflow-y-auto"
					>
						<SheetHeader>
							<SheetTitle>{editingUser ? "Edit User" : "Add User"}</SheetTitle>
							<SheetDescription>
								{editingUser
									? `Editing ID ${editingUser.id}`
									: "Create a new user"}
							</SheetDescription>
						</SheetHeader>
						<UserForm
							form={form}
							setForm={setForm}
							isSubmitting={isSubmitting}
							isEditing={!!editingUser}
							onSubmit={handleSubmit}
							onReset={resetForm}
						/>
					</SheetContent>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<CardTitle>User List</CardTitle>
							<div className="flex items-center gap-2">
								<Badge
									variant={isPending ? "secondary" : "outline"}
								>{`${userCount} items`}</Badge>
								<SheetTrigger
									render={
										<Button
											onClick={() => {
												setEditingUser(null);
												setForm(defaultForm);
											}}
										/>
									}
								>
									<Plus className="size-4" weight="duotone" />
									Add User
								</SheetTrigger>
							</div>
						</CardHeader>
						<CardContent>
							<DataTable columns={columns} data={users} isLoading={isPending} />
						</CardContent>
					</Card>
				</Sheet>
			</div>
		</AppShell>
	);
}
