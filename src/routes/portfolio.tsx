import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { Kicker, Stat, ticketId } from "@/components/console";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { pageHead } from "@/lib/seo";
import { CURRENCY_SYMBOL, cents, money } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/portfolio")({
	component: PortfolioPage,
	head: () =>
		pageHead({
			title: "Your portfolio",
			description:
				"Your open positions, cash balance, lifetime P&L, and every ticket you've settled on Charles.market.",
			path: "/portfolio",
			noIndex: true,
		}),
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
					Open positions, lifetime P&L, and every ticket you've settled.
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
	const pendingRefunds = useQuery(api.refunds.myPendingRefunds, {});

	if (me === undefined || positions === undefined) {
		return <PortfolioSkeleton />;
	}

	const totalValue = positions.reduce((acc, p) => acc + p.value, 0);
	const totalCost = positions.reduce((acc, p) => acc + p.cost, 0);
	const totalPnl = totalValue - totalCost;
	const cash = me?.balance ?? 0;

	return (
		<>
			{pendingRefunds && pendingRefunds.length > 0 ? (
				<PendingRefunds offers={pendingRefunds} />
			) : null}

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
				<Stat
					label="Open positions"
					value={String(positions.length)}
				/>
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
						No open positions yet. Go pick someone worth a bet.
					</div>
				) : (
					<>
						<ul className="mt-4 md:hidden">
							{positions.map((p) => (
								<li key={p._id} className="ledger-row space-y-2 px-3 py-3">
									<div className="flex items-start justify-between gap-2">
										<Link
											to="/ticket/$id"
											params={{ id: p.ticketSlug }}
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
												{ticketId(p.ticketSlug)}
											</TableCell>
											<TableCell>
												<Link
													to="/ticket/$id"
													params={{ id: p.ticketSlug }}
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

type RefundOffer = {
	_id: Id<"refundOffers">;
	tradeId: Id<"trades">;
	ticketQuestion: string;
	ticketSlug: string;
	side: "Yes" | "No";
	shares: number;
	cost: number;
};

function PendingRefunds({ offers }: { offers: RefundOffer[] }) {
	const accept = useMutation(api.refunds.acceptRefund);
	const reject = useMutation(api.refunds.rejectRefund);

	const handle = async (
		offerId: Id<"refundOffers">,
		action: "accept" | "reject"
	) => {
		try {
			if (action === "accept") {
				await accept({ offerId });
				toast.success("Refund accepted — shekels returned to your balance.");
			} else {
				await reject({ offerId });
				toast.success("Refund declined — your position is unchanged.");
			}
		} catch (err) {
			toast.error("Something went wrong", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<section className="mt-8 border border-brand bg-brand-wash p-4">
			<Kicker className="text-brand">PENDING REFUND OFFERS</Kicker>
			<p className="mt-1 text-bone-2 text-sm">
				An admin has offered to refund the following bets. Accept to get your
				shekels back; decline to keep your position.
			</p>
			<ul className="mt-3 space-y-3">
				{offers.map((o) => (
					<li
						key={o._id}
						className="flex flex-col gap-3 border border-rule bg-ink p-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0">
							<div className="font-display font-semibold text-bone text-sm">
								{o.ticketQuestion}
							</div>
							<div className="mt-0.5 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
								<Badge variant={o.side === "Yes" ? "yes" : "no"} className="mr-1.5">
									{o.side}
								</Badge>
								{o.shares.toFixed(2)} shares · {CURRENCY_SYMBOL}
								{Math.round(Math.abs(o.cost))} refund
							</div>
						</div>
						<div className="flex shrink-0 gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => handle(o._id, "reject")}
							>
								Decline
							</Button>
							<Button size="sm" onClick={() => handle(o._id, "accept")}>
								Accept refund
							</Button>
						</div>
					</li>
				))}
			</ul>
		</section>
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
				we'll spin you up a {CURRENCY_SYMBOL}2,000 starter balance.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
