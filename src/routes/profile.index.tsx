import { createFileRoute, Navigate } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { SignInButton } from "@/components/auth-controls";
import { Kicker } from "@/components/console";
import { Skeleton } from "@/components/ui/skeleton";
import { pageHead } from "@/lib/seo";
import { CURRENCY_SYMBOL, STARTING_BALANCE } from "@/lib/tickets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/profile/")({
	component: ProfileIndex,
	head: () =>
		pageHead({
			title: "Your profile",
			description: "Your public trader profile on Charles.",
			path: "/profile",
			noIndex: true,
		}),
});

function ProfileIndex() {
	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<AuthLoading>
				<Skeleton className="h-96 w-full" />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel />
			</Unauthenticated>
			<Authenticated>
				<BounceToMine />
			</Authenticated>
		</main>
	);
}

function BounceToMine() {
	const me = useQuery(api.users.me, {});
	if (me === undefined) return <Skeleton className="h-96 w-full" />;
	if (me === null || !me.handle) return <SignInPanel />;
	return (
		<Navigate
			to="/profile/$username"
			params={{ username: encodeURIComponent(me.handle.replace(/^@/, "")) }}
			replace
		/>
	);
}

function SignInPanel() {
	return (
		<div className="border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-3 text-2xl">
				Sign in to view your profile
			</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				Sign in with Google to claim a handle, get a {CURRENCY_SYMBOL}
				{STARTING_BALANCE.toLocaleString()} starter balance, and start trading.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
