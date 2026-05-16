import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { Plus } from "lucide-react";
import { SignInButton } from "@/components/auth-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CURRENCY_SYMBOL, cents, money } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/portfolio")({
	component: PortfolioPage,
});

function PortfolioPage() {
	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
			<h1 className="font-bold text-3xl tracking-tight">Portfolio</h1>
			<p className="mt-1 text-muted-foreground">Your active bets on Charles.</p>

			<AuthLoading>
				<PortfolioSkeleton />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel />
			</Unauthenticated>
			<Authenticated>
				<PortfolioBody />
			</Authenticated>
		</main>
	);
}

function PortfolioBody() {
	const me = useQuery(api.users.me, {});
	const positions = useQuery(api.trades.positions, {});
	const settled = useQuery(api.trades.settled, { limit: 5 });

	if (me === undefined || positions === undefined) {
		return <PortfolioSkeleton />;
	}

	const totalValue = positions.reduce((acc, p) => acc + p.value, 0);
	const totalCost = positions.reduce((acc, p) => acc + p.cost, 0);
	const totalPnl = totalValue - totalCost;
	const cash = me?.balance ?? 0;

	return (
		<>
			<section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
				<StatCard
					label="Portfolio value"
					value={`${CURRENCY_SYMBOL}${Math.round(totalValue + cash).toLocaleString()}`}
				/>
				<StatCard
					label="Cash"
					value={`${CURRENCY_SYMBOL}${Math.round(cash).toLocaleString()}`}
				/>
				<StatCard
					label="Unrealized P&L"
					value={`${totalPnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(totalPnl)).toLocaleString()}`}
					tone={totalPnl >= 0 ? "up" : "down"}
				/>
				<StatCard label="Open positions" value={String(positions.length)} />
			</section>

			<Card className="mt-8 gap-0 py-0">
				<CardHeader className="flex flex-row items-center justify-between border-b py-4">
					<CardTitle>Open positions</CardTitle>
					<Button asChild variant="link" size="sm">
						<Link to="/markets">
							<Plus className="size-3.5" /> New position
						</Link>
					</Button>
				</CardHeader>
				<CardContent className="px-0">
					{positions.length === 0 ? (
						<div className="px-6 py-12 text-center text-muted-foreground text-sm">
							No open positions yet — go bet on Charles.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="pl-6">Market</TableHead>
									<TableHead>Side</TableHead>
									<TableHead className="text-right">Shares</TableHead>
									<TableHead className="text-right">Avg</TableHead>
									<TableHead className="text-right">Now</TableHead>
									<TableHead className="pr-6 text-right">P&L</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{positions.map((p) => (
									<TableRow key={p._id}>
										<TableCell className="pl-6">
											<Link
												to="/market/$id"
												params={{ id: p.marketSlug }}
												className="font-medium hover:text-primary"
											>
												{p.question}
											</Link>
										</TableCell>
										<TableCell>
											<Badge variant={p.side === "Yes" ? "yes" : "no"}>
												{p.side}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{p.shares.toFixed(2)}
										</TableCell>
										<TableCell className="text-right font-mono">
											{cents(p.avgPrice)}
										</TableCell>
										<TableCell className="text-right font-mono">
											{cents(p.current)}
										</TableCell>
										<TableCell
											className={cn(
												"pr-6 text-right font-semibold",
												p.pnl >= 0 ? "text-yes" : "text-no"
											)}
										>
											{p.pnl >= 0 ? "+" : "−"}
											{CURRENCY_SYMBOL}
											{Math.round(Math.abs(p.pnl))}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card className="mt-8">
				<CardHeader>
					<CardTitle>Recently settled</CardTitle>
				</CardHeader>
				<CardContent>
					{settled === undefined ? (
						<Skeleton className="h-24 w-full" />
					) : settled.length === 0 ? (
						<p className="py-2 text-muted-foreground text-sm">
							Nothing has resolved yet.
						</p>
					) : (
						<ul className="divide-y">
							{settled.map((s, i) => (
								<li
									// biome-ignore lint/suspicious/noArrayIndexKey: ordered
									key={i}
									className="flex items-center justify-between py-3 text-sm"
								>
									<div className="flex items-center gap-2">
										<Badge variant={s.result === "Yes" ? "yes" : "no"}>
											{s.result}
										</Badge>
										<span>{s.question}</span>
									</div>
									<span
										className={cn(
											"font-semibold",
											s.pnl >= 0 ? "text-yes" : "text-no"
										)}
									>
										{s.pnl >= 0 ? "+" : "−"}
										{CURRENCY_SYMBOL}
										{Math.round(Math.abs(s.pnl))}
									</span>
								</li>
							))}
						</ul>
					)}
					<div className="mt-3 text-right text-muted-foreground text-xs">
						Lifetime volume:{" "}
						{money(positions.reduce((acc, p) => acc + p.cost, 0))}
					</div>
				</CardContent>
			</Card>
		</>
	);
}

function StatCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "up" | "down";
}) {
	return (
		<Card>
			<CardContent>
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					{label}
				</div>
				<div
					className={cn(
						"mt-1 font-bold text-2xl",
						tone === "up" && "text-yes",
						tone === "down" && "text-no"
					)}
				>
					{value}
				</div>
			</CardContent>
		</Card>
	);
}

function PortfolioSkeleton() {
	return (
		<>
			<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
					<Skeleton key={i} className="h-20" />
				))}
			</div>
			<Skeleton className="mt-8 h-60" />
			<Skeleton className="mt-8 h-40" />
		</>
	);
}

function SignInPanel() {
	return (
		<Card className="mt-8 border-primary/30 bg-accent/30">
			<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
				<h2 className="font-semibold text-xl">Sign in to see your portfolio</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					Your positions, cash, and lifetime P&L live on your account. Sign in
					with Google and we'll spin you up a {CURRENCY_SYMBOL}1,000 starter
					balance.
				</p>
				<SignInButton size="lg" label="Sign in with Google" />
			</CardContent>
		</Card>
	);
}
