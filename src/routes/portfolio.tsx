import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { SignInButton } from "@/components/auth-controls";
import { Kicker, marketId, Stat } from "@/components/console";
import { Badge } from "@/components/ui/badge";
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
		<main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12">
			<header>
				<Kicker>YOUR PORTFOLIO</Kicker>
				<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
					Portfolio
				</h1>
				<p className="mt-3 max-w-xl text-bone-2 text-sm sm:text-base">
					Open positions, lifetime P&L, and every ticket you've settled on
					Charles.
				</p>
			</header>

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
			<section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-rule border-y py-6 md:grid-cols-4">
				<Stat
					label="Portfolio value"
					value={`${CURRENCY_SYMBOL}${Math.round(totalValue + cash).toLocaleString()}`}
				/>
				<Stat
					label="Cash on hand"
					value={`${CURRENCY_SYMBOL}${Math.round(cash).toLocaleString()}`}
				/>
				<Stat
					label="Unrealized P&L"
					value={`${totalPnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(totalPnl)).toLocaleString()}`}
					tone={totalPnl >= 0 ? "brand" : "magenta"}
				/>
				<Stat label="Open positions" value={String(positions.length)} />
			</section>

			<section className="mt-12">
				<div className="flex items-center justify-between border-rule border-b pb-3">
					<Kicker>OPEN POSITIONS</Kicker>
					<Link
						to="/tickets"
						className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.14em] hover:text-brand"
					>
						+ New
					</Link>
				</div>
				{positions.length === 0 ? (
					<div className="mt-6 border border-rule border-dashed py-12 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						No open positions yet — go bet on Charles.
					</div>
				) : (
					<>
						<ul className="mt-4 md:hidden">
							{positions.map((p) => (
								<li key={p._id} className="ledger-row space-y-2 px-3 py-3">
									<div className="flex items-start justify-between gap-2">
										<Link
											to="/ticket/$id"
											params={{ id: p.marketSlug }}
											className="flex-1 font-display font-semibold text-bone text-sm hover:text-brand"
										>
											{p.question}
										</Link>
										<Badge variant={p.side === "Yes" ? "yes" : "no"}>
											{p.side}
										</Badge>
									</div>
									<div className="grid grid-cols-4 gap-2 font-mono text-xs">
										<MobileStat label="SHARES" value={p.shares.toFixed(2)} />
										<MobileStat label="AVG" value={cents(p.avgPrice)} />
										<MobileStat label="NOW" value={cents(p.current)} />
										<MobileStat
											label="P&L"
											value={`${p.pnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(p.pnl))}`}
											tone={p.pnl >= 0 ? "up" : "down"}
										/>
									</div>
								</li>
							))}
						</ul>
						<div className="mt-4 hidden border border-rule md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4">ID</TableHead>
										<TableHead>Ticket</TableHead>
										<TableHead>Side</TableHead>
										<TableHead className="text-right">Shares</TableHead>
										<TableHead className="text-right">Avg</TableHead>
										<TableHead className="text-right">Now</TableHead>
										<TableHead className="pr-4 text-right">P&L</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{positions.map((p) => (
										<TableRow key={p._id}>
											<TableCell className="pl-4 font-bold font-mono text-bone-3 text-xs">
												{marketId(p.marketSlug)}
											</TableCell>
											<TableCell>
												<Link
													to="/ticket/$id"
													params={{ id: p.marketSlug }}
													className="font-display font-semibold text-bone hover:text-brand"
												>
													{p.question}
												</Link>
											</TableCell>
											<TableCell>
												<Badge variant={p.side === "Yes" ? "yes" : "no"}>
													{p.side}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{p.shares.toFixed(2)}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{cents(p.avgPrice)}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{cents(p.current)}
											</TableCell>
											<TableCell
												className={cn(
													"pr-4 text-right font-bold font-mono tabular-nums",
													p.pnl >= 0 ? "text-brand" : "text-magenta"
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
						</div>
					</>
				)}
			</section>

			<section className="mt-12">
				<div className="flex items-center justify-between border-rule border-b pb-3">
					<Kicker>SETTLED · LAST 5</Kicker>
				</div>
				{settled === undefined ? (
					<Skeleton className="mt-4 h-24 w-full" />
				) : settled.length === 0 ? (
					<p className="mt-6 py-6 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						Nothing has resolved yet.
					</p>
				) : (
					<ul>
						{settled.map((s, i) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: ordered
								key={i}
								className="ledger-row flex items-center justify-between gap-3 py-4 text-sm"
							>
								<div className="flex items-center gap-3">
									<Badge variant={s.result === "Yes" ? "yes" : "no"}>
										RESOLVED {s.result}
									</Badge>
									<span className="font-display font-semibold text-bone">
										{s.question}
									</span>
								</div>
								<span
									className={cn(
										"font-bold font-mono tabular-nums",
										s.pnl >= 0 ? "text-brand" : "text-magenta"
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
				<div className="mt-3 text-right font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
					Lifetime volume{" "}
					<span className="text-bone tabular-nums">
						{money(positions.reduce((acc, p) => acc + p.cost, 0))}
					</span>
				</div>
			</section>
		</>
	);
}

function MobileStat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "up" | "down";
}) {
	return (
		<div>
			<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
				{label}
			</div>
			<div
				className={cn(
					"font-bold font-mono text-sm tabular-nums",
					tone === "up" && "text-brand",
					tone === "down" && "text-magenta"
				)}
			>
				{value}
			</div>
		</div>
	);
}

function PortfolioSkeleton() {
	return (
		<>
			<div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-rule border-y py-6 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						key={i}
						className="space-y-2"
					>
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-6 w-24" />
					</div>
				))}
			</div>
			<Skeleton className="mt-8 h-60" />
			<Skeleton className="mt-8 h-40" />
		</>
	);
}

function SignInPanel() {
	return (
		<div className="mt-12 border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-3 text-2xl">
				Sign in to see your portfolio
			</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				Positions, cash, and lifetime P&L live on your account. Sign in and
				we'll spin you up a {CURRENCY_SYMBOL}1,000 starter balance.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
