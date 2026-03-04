import {
	Buildings,
	CreditCard,
	House,
	List,
	Package,
	Scissors,
	ShoppingCart,
	SignOut,
	Storefront,
	Users,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getCurrentUser, useAuthStore } from "@/stores/auth-store";

const navigation = [
	{ to: "/", label: "Dashboard", icon: House },
	{ to: "/customers", label: "Customers", icon: Users },
	{ to: "/users", label: "Users", icon: Users },
	{ to: "/stores", label: "Stores", icon: Storefront },
	{ to: "/categories", label: "Categories", icon: List },
	{ to: "/services", label: "Services", icon: Scissors },
	{ to: "/products", label: "Products", icon: Package },
	{ to: "/payment-methods", label: "Payment Methods", icon: CreditCard },
	{ to: "/orders", label: "Orders", icon: ShoppingCart },
] as const;

interface AppShellProps extends PropsWithChildren {
	title: string;
	description?: string;
}

export function AppShell({ title, description, children }: AppShellProps) {
	const navigate = useNavigate();
	const clearToken = useAuthStore((state) => state.clearToken);
	const user = getCurrentUser();

	const handleLogout = () => {
		clearToken();
		void navigate({ to: "/auth/login" });
	};

	return (
		<div className="grid min-h-dvh grid-cols-1 bg-background md:grid-cols-[260px_1fr]">
			<aside className="border-r border-border/70 bg-muted/20 px-4 py-6">
				<div className="flex items-center gap-2 px-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
					<Buildings className="size-4" weight="duotone" />
					Fresclean POS
				</div>

				<Separator className="my-4" />

				<nav className="grid gap-1">
					{navigation.map((item) => {
						const Icon = item.icon;
						return (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
								)}
								activeProps={{ className: "bg-secondary text-foreground" }}
							>
								<Icon className="size-4" weight="duotone" />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="mt-8 rounded-md border border-border/70 bg-card px-3 py-3">
					<p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
						Signed in as
					</p>
					<p className="mt-1 text-sm font-medium">
						{user?.name ?? "Unknown User"}
					</p>
					<p className="text-xs text-muted-foreground">
						@{user?.username ?? "-"}
					</p>

					<Button
						variant="outline"
						className="mt-3 w-full justify-start"
						onClick={handleLogout}
					>
						<SignOut className="size-4" weight="duotone" />
						Logout
					</Button>
				</div>
			</aside>

			<section className="px-4 py-6 md:px-8">
				<header className="mb-6">
					<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
					{description ? (
						<p className="mt-1 text-sm text-muted-foreground">{description}</p>
					) : null}
				</header>
				{children}
			</section>
		</div>
	);
}
