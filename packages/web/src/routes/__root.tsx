import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => (
		<div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Page not found
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					The route does not exist in the new React router tree.
				</p>
			</div>
		</div>
	),
});

function RootComponent() {
	return (
		<>
			<Toaster
				richColors
				position="top-right"
				className="pointer-events-auto"
				closeButton
			/>
			<main className="min-h-dvh bg-background text-foreground">
				<Outlet />
			</main>
		</>
	);
}
