import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
	username: z.string().trim().min(1, "Username is required"),
	password: z.string().trim().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/auth/login")({
	beforeLoad: () => {
		if (useAuthStore.getState().token) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const setToken = useAuthStore((state) => state.setToken);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			username: "",
			password: "",
		},
	});

	const loginMutation = useMutation({
		mutationKey: ["login"],
		mutationFn: login,
		onSuccess: (response) => {
			setToken(response.token);
			void navigate({ to: "/" });
		},
	});

	const onSubmit = handleSubmit(async (values) => {
		await loginMutation.mutateAsync(values);
	});

	return (
		<div className="grid min-h-dvh place-items-center bg-muted/20 px-4">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-xl">Sign in</CardTitle>
					<CardDescription>
						Use your existing Fresclean credentials.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="grid gap-4" onSubmit={onSubmit}>
						<div className="grid gap-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								autoComplete="username"
								{...register("username")}
							/>
							{errors.username ? (
								<p className="text-xs text-destructive">
									{errors.username.message}
								</p>
							) : null}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								{...register("password")}
							/>
							{errors.password ? (
								<p className="text-xs text-destructive">
									{errors.password.message}
								</p>
							) : null}
						</div>

						<Button type="submit" disabled={loginMutation.isPending}>
							{loginMutation.isPending ? "Signing in..." : "Sign in"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
