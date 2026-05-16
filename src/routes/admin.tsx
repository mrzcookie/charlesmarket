import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { BarChart2, ShieldCheck, Users } from "lucide-react";
import { SignInButton } from "@/components/auth-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<>
			<AuthLoading>
				<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
					<Skeleton className="h-screen/2 w-full" />
				</div>
			</AuthLoading>
			<Unauthenticated>
				<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
					<SignInGate />
				</div>
			</Unauthenticated>
			<Authenticated>
				<AuthedAdminLayout />
			</Authenticated>
		</>
	);
}

function AuthedAdminLayout() {
	const me = useQuery(api.users.me, {});
	if (me === undefined)
		return (
			<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	if (!me?.isAdmin)
		return (
			<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
				<NotAuthorized />
			</div>
		);

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-0 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8">
			<Sidebar />
			<main className="min-w-0 flex-1">
				<Outlet />
			</main>
		</div>
	);
}

function Sidebar() {
	const pathname =
		useRouterState({ select: (s) => s.location.pathname }) ?? "";

	const navItems = [
		{
			to: "/admin/markets" as const,
			label: "Markets & Proposals",
			icon: BarChart2,
		},
		{ to: "/admin/users" as const, label: "Users", icon: Users },
	];

	return (
		<aside className="shrink-0 lg:w-56">
			<div className="flex items-center gap-2.5 pb-4">
				<div className="flex size-8 items-center justify-center rounded-lg bg-primary">
					<ShieldCheck className="size-4 text-primary-foreground" />
				</div>
				<div>
					<p className="font-semibold text-sm leading-none">Admin Console</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						Charlesmarket
					</p>
				</div>
			</div>

			<Separator className="mb-4" />

			{/* Desktop sidebar */}
			<nav className="hidden flex-col gap-1 lg:flex">
				{navItems.map(({ to, label, icon: Icon }) => {
					const isActive = pathname.startsWith(to);
					return (
						<Link
							key={to}
							to={to}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-accent font-medium text-foreground"
									: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
							)}
						>
							<Icon className="size-4 shrink-0" />
							{label}
						</Link>
					);
				})}
			</nav>

			{/* Mobile tabs */}
			<nav className="flex gap-1 overflow-x-auto pb-2 lg:hidden">
				{navItems.map(({ to, label, icon: Icon }) => {
					const isActive = pathname.startsWith(to);
					return (
						<Link
							key={to}
							to={to}
							className={cn(
								"flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
								isActive
									? "bg-accent font-medium text-foreground"
									: "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
							)}
						>
							<Icon className="size-4" />
							{label}
						</Link>
					);
				})}
			</nav>

			<div className="mt-2 hidden lg:block">
				<Separator />
			</div>
		</aside>
	);
}

function NotAuthorized() {
	return (
		<Card className="mt-12 border-amber-500/40 bg-amber-50 dark:border-amber-700/30 dark:bg-amber-500/5">
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
					<ShieldCheck className="size-6 text-amber-600 dark:text-amber-400" />
				</div>
				<h2 className="font-semibold text-xl">Admin only</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					This area is restricted to moderators. Ask an existing admin to grant
					you access.
				</p>
				<Button asChild variant="outline">
					<Link to="/markets">Back to markets</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

function SignInGate() {
	return (
		<Card className="mt-12 border-primary/30 bg-accent/30">
			<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
					<ShieldCheck className="size-6 text-primary" />
				</div>
				<h2 className="font-semibold text-xl">Sign in to continue</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					Admin tools require authentication.
				</p>
				<SignInButton size="lg" label="Sign in with Google" />
			</CardContent>
		</Card>
	);
}
