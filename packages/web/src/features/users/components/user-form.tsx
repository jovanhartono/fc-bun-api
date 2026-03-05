import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type UserFormState = {
	username: string;
	name: string;
	password: string;
	confirm_password: string;
	role: "admin" | "cashier" | "worker";
	is_active: boolean;
};

type UserFormProps = {
	form: UserFormState;
	setForm: Dispatch<SetStateAction<UserFormState>>;
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	onReset: () => void;
};

export function UserForm({
	form,
	setForm,
	isSubmitting,
	isEditing,
	onSubmit,
	onReset,
}: UserFormProps) {
	return (
		<form className="grid gap-4 p-4 md:grid-cols-2" onSubmit={onSubmit}>
			<Field>
				<FieldLabel htmlFor="user-username">Username</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="user-username"
					placeholder="e.g. cashier01"
					value={form.username}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, username: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			<Field>
				<FieldLabel htmlFor="user-name">Name</FieldLabel>
				<input
					className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
					id="user-name"
					placeholder="e.g. Budi Santoso"
					value={form.name}
					onChange={(event) =>
						setForm((prev) => ({ ...prev, name: event.target.value }))
					}
					disabled={isSubmitting}
					required
				/>
			</Field>

			{!isEditing ? (
				<>
					<Field>
						<FieldLabel htmlFor="user-password">Password</FieldLabel>
						<input
							className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
							id="user-password"
							type="password"
							placeholder="Enter password"
							value={form.password}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, password: event.target.value }))
							}
							disabled={isSubmitting}
							required
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="user-confirm-password">
							Confirm Password
						</FieldLabel>
						<input
							className="h-10 w-full min-w-0 rounded-none border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
							id="user-confirm-password"
							type="password"
							placeholder="Confirm password"
							value={form.confirm_password}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									confirm_password: event.target.value,
								}))
							}
							disabled={isSubmitting}
							required
						/>
					</Field>
				</>
			) : null}

			<Field>
				<FieldLabel htmlFor="user-role">Role</FieldLabel>
				<Select
					value={form.role}
					onValueChange={(value) =>
						setForm((prev) => ({
							...prev,
							role: (value ?? "cashier") as UserFormState["role"],
						}))
					}
					disabled={isSubmitting}
				>
					<SelectTrigger id="user-role" className="h-10 w-full text-sm">
						<SelectValue placeholder="Select role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="admin">Admin</SelectItem>
						<SelectItem value="cashier">Cashier</SelectItem>
						<SelectItem value="worker">Worker</SelectItem>
					</SelectContent>
				</Select>
			</Field>

			<Field className="flex-row items-center justify-between md:col-span-2">
				<FieldLabel htmlFor="user-active">Active</FieldLabel>
				<Switch
					id="user-active"
					checked={form.is_active}
					onCheckedChange={(checked) =>
						setForm((prev) => ({ ...prev, is_active: !!checked }))
					}
					disabled={isSubmitting}
				/>
			</Field>

			<div className="flex flex-wrap gap-2 md:col-span-2 md:justify-end">
				{isEditing ? (
					<Button
						type="button"
						variant="outline"
						onClick={onReset}
						disabled={isSubmitting}
					>
						Cancel edit
					</Button>
				) : null}
				<Button type="submit" disabled={isSubmitting}>
					<Plus className="size-4" weight="duotone" />
					{isEditing ? "Update User" : "Create User"}
				</Button>
			</div>
		</form>
	);
}
