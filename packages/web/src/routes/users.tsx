import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { EntityTablePage } from "@/components/entity-table-page";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/api";
import { fetchUsers, queryKeys } from "@/lib/api";
import { requireAuth } from "@/lib/auth";

const columns: ColumnDef<User>[] = [
	{
		accessorKey: "username",
		header: "Username",
	},
	{
		accessorKey: "name",
		header: "Name",
	},
	{
		accessorKey: "role",
		header: "Role",
		cell: ({ row }) => <span className="uppercase">{row.original.role}</span>,
	},
	{
		id: "status",
		header: "Status",
		cell: ({ row }) => (
			<Badge variant={row.original.is_active ? "secondary" : "outline"}>
				{row.original.is_active ? "Active" : "Inactive"}
			</Badge>
		),
	},
];

export const Route = createFileRoute("/users")({
	beforeLoad: requireAuth,
	component: UsersPage,
});

function UsersPage() {
	return (
		<EntityTablePage
			title="Users"
			description="System users, roles, and activation state."
			queryKey={queryKeys.users}
			queryFn={fetchUsers}
			columns={columns}
		/>
	);
}
