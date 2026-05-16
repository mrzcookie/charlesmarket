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
import { BracketChip, Kicker } from "@/components/console";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
	head: () =>
		pageHead({
			title: "Admin console",
			description: "Admin-only console.",
			path: "/admin",
			noIndex: true,
		}),
});

function AdminLayout() {
	return (
		<>
			<AuthLoading>
				<div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
					<Skeleton className="h-96 w-full" />
				</div>
			</AuthLoading>
			<Unauthenticated>
				<div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
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
			<div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
				<Skeleton className="h-96 w-full" />
			</div>
		);
	if (!me?.isAdmin)
		return (
			<div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
				<NotAuthorized />
			</div>
		);

	return (
		<div className="mx-auto flex w-full max-w-[1280px] flex-col gap-0 px-4 py-8 sm:px-6 sm:py-12 lg:flex-row lg:gap-10">
			<Sidebar />
			<main className="min-w-0 flex-1">
				<Outlet />
			</main>
		</div>
	);
}

function Sidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname }) ?? "";
	const pendingCount = useQuery(api.proposals.pendingCount, {});

	const navItems = [
		{
			to: "/admin/tickets" as const,
			label: "Tickets",
			icon: BarChart2,
			badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
		},
		{
			to: "/admin/users" as const,
			label: "Users",
			icon: Users,
			badge: undefined,
		},
	];

	return (
		<aside className="shrink-0 lg:w-56">
			<div className="flex items-center gap-3 border-rule border-b pb-4">
				<div className="flex size-9 items-center justify-center border border-rule bg-ink-2">
					<ShieldCheck className="size-4 text-brand" />
				</div>
				<div>
					<Kicker>ADMIN</Kicker>
					<p className="mt-1 font-bold font-display text-base leading-none tracking-[-0.02em]">
						Admin Console
					</p>
				</div>
			</div>

			<nav className="mt-4 hidden flex-col gap-0 lg:flex">
				{navItems.map(({ to, label, icon: Icon, badge }) => {
					const isActive = pathname.startsWith(to);
					return (
						<Link
							key={to}
							to={to}
							className={cn(
								"flex items-center gap-3 border-rule border-b px-3 py-3 font-mono font-semibold text-[12px] uppercase tracking-[0.14em] transition-colors",
								isActive
									? "bg-brand-wash text-brand"
									: "text-bone-2 hover:bg-ink-2 hover:text-bone"
							)}
						>
							<Icon className="size-4 shrink-0" />
							<span className="flex-1">{label}</span>
							{badge ? (
								<span className="grid h-5 min-w-5 place-items-center rounded-[2px] bg-brand px-1 font-bold font-mono text-[10px] text-brand-foreground tabular-nums">
									{badge > 99 ? "99" : badge}
								</span>
							) : null}
						</Link>
					);
				})}
			</nav>

			<nav className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
				{navItems.map(({ to, label, icon: Icon, badge }) => {
					const isActive = pathname.startsWith(to);
					return (
						<Link
							key={to}
							to={to}
							className={cn(
								"relative flex shrink-0 items-center gap-2 border px-3 py-2 font-mono font-semibold text-[11px] uppercase tracking-[0.14em] transition-colors",
								isActive
									? "border-brand bg-brand-wash text-brand"
									: "border-rule text-bone-2 hover:border-rule-bright hover:text-bone"
							)}
						>
							<Icon className="size-3.5" />
							{label}
							{badge ? (
								<span className="grid h-4 min-w-4 place-items-center rounded-[2px] bg-brand px-1 font-bold font-mono text-[10px] text-brand-foreground tabular-nums">
									{badge > 99 ? "99" : badge}
								</span>
							) : null}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}

function NotAuthorized() {
	return (
		<div className="mt-8 border border-rule bg-ink-2 px-6 py-16 text-center">
			<BracketChip tone="danger">ADMIN ONLY</BracketChip>
			<h2 className="display-headline mt-4 text-3xl">No access.</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				This area is admin-only. Ask an existing admin to grant you access.
			</p>
			<Button asChild variant="outline" className="mt-6">
				<Link to="/tickets">Back to tickets</Link>
			</Button>
		</div>
	);
}

function SignInGate() {
	return (
		<div className="mt-8 border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-4 text-3xl">Sign in to continue</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				Admin tools require authentication.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
