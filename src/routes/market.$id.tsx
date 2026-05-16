import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { LogIn } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { PriceBar, TrendBadge } from "@/components/market-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	CURRENCY_SYMBOL,
	cents,
	money,
	toUIMarket,
	trail,
	type UIMarket,
} from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useBalance } from "@/lib/wallet";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/market/$id")({
	component: MarketDetail,
});

function MarketDetail() {
	const { id } = useParams({ from: "/market/$id" });
	const doc = useQuery(api.markets.getBySlug, { slug: id });

	if (doc === undefined) return <MarketDetailSkeleton />;
	if (doc === null) return <MarketNotFound id={id} />;

	const market = toUIMarket(doc);

	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
			<Breadcrumbs market={market} />
			<div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
				<div className="space-y-6">
					<MarketHeader market={market} />
					<PriceChartCard market={market} />
					<MarketTabs market={market} />
				</div>
				<aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
					<OrderTicket market={market} />
					<Stats market={market} />
				</aside>
			</div>
		</main>
	);
}

function Breadcrumbs({ market }: { market: UIMarket }) {
	return (
		<nav className="flex items-center gap-2 text-muted-foreground text-sm">
			<Link to="/markets" className="hover:text-foreground">
				Markets
			</Link>
			<span>/</span>
			<Link
				to="/markets"
				search={{ category: market.category }}
				className="hover:text-foreground"
			>
				{market.category}
			</Link>
			<span>/</span>
			<span className="truncate text-foreground">{market.question}</span>
		</nav>
	);
}

function MarketHeader({ market }: { market: UIMarket }) {
	return (
		<div>
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary" className="text-[10px] uppercase">
					{market.category}
				</Badge>
				{market.tags.map((t) => (
					<Badge key={t} variant="brand" className="text-[10px]">
						#{t}
					</Badge>
				))}
			</div>
			<h1 className="mt-3 font-bold text-3xl leading-tight tracking-tight md:text-4xl">
				{market.question}
			</h1>
			<div className="mt-4 flex items-end justify-between">
				<div>
					<div className="font-mono font-semibold text-3xl text-yes">
						{cents(market.yesPrice)}
					</div>
					<div className="text-muted-foreground text-sm">Yes price</div>
				</div>
				<TrendBadge trend={market.trend} delta={market.delta} />
			</div>
			<div className="mt-3 max-w-xl">
				<PriceBar yes={market.yesPrice} no={1 - market.yesPrice} />
			</div>
		</div>
	);
}

function PriceChartCard({ market }: { market: UIMarket }) {
	const [range, setRange] = useState<"1H" | "6H" | "1D" | "1W" | "ALL">("ALL");
	const liveHistory = useQuery(api.markets.history, {
		marketId: market._id as Id<"markets">,
		limit: 100,
	});
	const points = useMemo(() => {
		if (liveHistory && liveHistory.length >= 2) {
			return liveHistory.map((t, i) => ({ t: i, yes: t.yesPrice }));
		}
		return trail(market.yesPrice);
	}, [liveHistory, market.yesPrice]);

	const w = 800;
	const h = 220;
	const path = points
		.map((p, i) => {
			const x = (i / (points.length - 1)) * w;
			const y = h - p.yes * h;
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
	const last = points[points.length - 1].yes;
	const first = points[0].yes;
	const upward = last >= first;
	const color = upward ? "var(--yes)" : "var(--no)";

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>
					Yes price · history
					{liveHistory === undefined ? null : liveHistory.length < 2 ? (
						<span className="ml-2 font-normal text-muted-foreground text-xs">
							(synthetic — trade to start tracking)
						</span>
					) : null}
				</CardTitle>
				<ToggleGroup
					type="single"
					size="sm"
					value={range}
					onValueChange={(v) => v && setRange(v as typeof range)}
				>
					{(["1H", "6H", "1D", "1W", "ALL"] as const).map((r) => (
						<ToggleGroupItem key={r} value={r} className="px-2.5 text-xs">
							{r}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</CardHeader>
			<CardContent>
				<svg
					viewBox={`0 0 ${w} ${h}`}
					className="h-56 w-full"
					preserveAspectRatio="none"
					aria-label="Yes price history"
				>
					<title>Yes price history</title>
					<defs>
						<linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity="0.25" />
							<stop offset="100%" stopColor={color} stopOpacity="0" />
						</linearGradient>
					</defs>
					<path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#chart-grad)" />
					<path d={path} fill="none" stroke={color} strokeWidth="2" />
				</svg>
			</CardContent>
		</Card>
	);
}

function MarketTabs({ market }: { market: UIMarket }) {
	return (
		<Card>
			<Tabs defaultValue="about" className="w-full">
				<CardHeader className="pb-0">
					<TabsList>
						<TabsTrigger value="about">About</TabsTrigger>
						<TabsTrigger value="trades">Trades</TabsTrigger>
						<TabsTrigger value="orderbook">Order book</TabsTrigger>
						<TabsTrigger value="comments">Comments</TabsTrigger>
					</TabsList>
				</CardHeader>
				<CardContent>
					<TabsContent value="about">
						<AboutTab market={market} />
					</TabsContent>
					<TabsContent value="trades">
						<TradesTab marketId={market._id as Id<"markets">} />
					</TabsContent>
					<TabsContent value="orderbook">
						<OrderBookTab market={market} />
					</TabsContent>
					<TabsContent value="comments">
						<CommentsTab marketId={market._id as Id<"markets">} />
					</TabsContent>
				</CardContent>
			</Tabs>
		</Card>
	);
}

function AboutTab({ market }: { market: UIMarket }) {
	return (
		<div className="space-y-2 text-sm">
			<KV label="Closes" value={market.closesAt} />
			<KV label="Resolution source" value={market.resolutionSource} />
			<KV label="Open interest" value={money(market.openInterest)} />
			<KV label="Volume" value={money(market.volume)} />
			<KV label="Liquidity" value={money(market.liquidity)} />
		</div>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between border-b py-2 last:border-b-0">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}

function TradesTab({ marketId }: { marketId: Id<"markets"> }) {
	const trades = useQuery(api.trades.byMarket, { marketId, limit: 25 });
	if (trades === undefined) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		);
	}
	if (trades.length === 0) {
		return (
			<p className="py-6 text-center text-muted-foreground text-sm">
				No trades yet. Be the first.
			</p>
		);
	}
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Trader</TableHead>
					<TableHead>Side</TableHead>
					<TableHead className="text-right">Shares</TableHead>
					<TableHead className="text-right">Price</TableHead>
					<TableHead className="text-right">When</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{trades.map((t) => (
					<TableRow key={t._id}>
						<TableCell className="flex items-center gap-2">
							<Avatar className="size-6">
								<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 text-[10px] text-primary-foreground">
									{t.handle.charAt(1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							{t.handle}
						</TableCell>
						<TableCell>
							<Badge variant={t.side === "Yes" ? "yes" : "no"}>
								{t.kind === "sell" ? "↓" : ""}
								{t.side}
							</Badge>
						</TableCell>
						<TableCell className="text-right">{t.shares.toFixed(2)}</TableCell>
						<TableCell className="text-right font-mono">
							{cents(t.price)}
						</TableCell>
						<TableCell className="text-right text-muted-foreground">
							{relativeTime(t._creationTime)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function OrderBookTab({ market }: { market: UIMarket }) {
	const yes = market.yesPrice;
	const asks = [0.04, 0.03, 0.02, 0.01].map((d, i) => ({
		price: yes + d,
		size: 200 + i * 120,
	}));
	const bids = [0.01, 0.02, 0.03, 0.04].map((d, i) => ({
		price: yes - d,
		size: 180 + i * 90,
	}));
	const max = Math.max(...asks.map((a) => a.size), ...bids.map((b) => b.size));

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div>
				<h3 className="mb-2 font-semibold text-sm">Asks (sell Yes)</h3>
				<ul className="space-y-1">
					{asks.map((a) => (
						<BookRow key={a.price} {...a} max={max} side="ask" />
					))}
				</ul>
			</div>
			<div>
				<h3 className="mb-2 font-semibold text-sm">Bids (buy Yes)</h3>
				<ul className="space-y-1">
					{bids.map((b) => (
						<BookRow key={b.price} {...b} max={max} side="bid" />
					))}
				</ul>
			</div>
			<p className="text-muted-foreground text-xs md:col-span-2">
				Synthetic order book — derived from current Yes price. Real book lands
				with the matching engine.
			</p>
		</div>
	);
}

function BookRow({
	price,
	size,
	max,
	side,
}: {
	price: number;
	size: number;
	max: number;
	side: "ask" | "bid";
}) {
	const pct = (size / max) * 100;
	return (
		<li className="relative flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
			<span
				aria-hidden="true"
				className={cn(
					"absolute inset-y-0 left-0 rounded-md",
					side === "ask" ? "bg-no/10" : "bg-yes/10"
				)}
				style={{ width: `${pct}%` }}
			/>
			<span
				className={cn(
					"relative font-mono font-semibold",
					side === "ask" ? "text-no" : "text-yes"
				)}
			>
				{cents(price)}
			</span>
			<span className="relative text-muted-foreground">{money(size)}</span>
		</li>
	);
}

function CommentsTab({ marketId }: { marketId: Id<"markets"> }) {
	const comments = useQuery(api.comments.byMarket, { marketId, limit: 50 });
	const { isAuthenticated } = useConvexAuth();
	const addComment = useMutation(api.comments.add);
	const [body, setBody] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const submit = async () => {
		const trimmed = body.trim();
		if (!trimmed) return;
		setSubmitting(true);
		try {
			await addComment({ marketId, body: trimmed });
			setBody("");
			toast.success("Comment posted");
		} catch (err) {
			toast.error("Couldn't post comment", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-4">
			{comments === undefined ? (
				<div className="space-y-2">
					{Array.from({ length: 2 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			) : comments.length === 0 ? (
				<p className="py-4 text-center text-muted-foreground text-sm">
					No comments yet.
				</p>
			) : (
				comments.map((c) => (
					<div key={c._id} className="rounded-lg border bg-muted/40 p-3">
						<div className="flex items-center gap-2 text-xs">
							<Avatar className="size-6">
								<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 text-[10px] text-primary-foreground">
									{c.handle.charAt(1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="font-semibold">{c.handle}</span>
							<span className="text-muted-foreground">
								{relativeTime(c._creationTime)}
							</span>
						</div>
						<p className="mt-2 text-sm">{c.body}</p>
					</div>
				))
			)}

			{isAuthenticated ? (
				<div className="space-y-2">
					<Label htmlFor="comment">Add your take</Label>
					<Textarea
						id="comment"
						rows={3}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="What's Charles really going to do?"
					/>
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={submit}
							disabled={submitting || !body.trim()}
						>
							Post comment
						</Button>
					</div>
				</div>
			) : (
				<div className="rounded-lg border border-dashed p-4 text-center">
					<p className="text-muted-foreground text-sm">
						Sign in to join the discussion.
					</p>
					<SignInButton className="mt-3" />
				</div>
			)}
		</div>
	);
}

function OrderTicket({ market }: { market: UIMarket }) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { balance, mounted } = useBalance();
	const placeOrder = useMutation(api.orders.place);

	const [side, setSide] = useState<"Yes" | "No">("Yes");
	const [amount, setAmount] = useState("100");
	const [submitting, setSubmitting] = useState(false);

	const price = side === "Yes" ? market.yesPrice : 1 - market.yesPrice;
	const cost = Number(amount) || 0;
	const shares = price > 0 ? cost / price : 0;
	const payout = shares;
	const insufficient = isAuthenticated && cost > balance;

	const submit = async () => {
		if (cost <= 0) return;
		if (insufficient) {
			toast.error("Not enough shekels", {
				description: `You have ${CURRENCY_SYMBOL}${Math.round(balance)} but tried to spend ${CURRENCY_SYMBOL}${Math.round(cost)}.`,
			});
			return;
		}
		setSubmitting(true);
		try {
			const result = await placeOrder({
				marketId: market._id as Id<"markets">,
				side,
				amount: cost,
			});
			toast.success(
				`Bought ${side} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`,
				{
					description: `${result.shares.toFixed(2)} shares @ ${cents(result.price)} · payout ${CURRENCY_SYMBOL}${Math.round(result.shares).toLocaleString()}`,
				}
			);
			setAmount("0");
		} catch (err) {
			toast.error("Order failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-32 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!isAuthenticated) {
		return (
			<Card className="border-primary/30 bg-accent/30">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<LogIn className="size-4" /> Sign in to bid
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground text-sm">
						You need an account to place orders on Charlesmarket. Everyone
						starts with {CURRENCY_SYMBOL}1,000 in play-money shekels.
					</p>
					<div className="grid grid-cols-2 gap-2">
						<div className="rounded-md border bg-yes/10 px-3 py-2 text-center">
							<div className="text-muted-foreground text-xs">Yes</div>
							<div className="font-mono font-semibold text-yes">
								{cents(market.yesPrice)}
							</div>
						</div>
						<div className="rounded-md border bg-no/10 px-3 py-2 text-center">
							<div className="text-muted-foreground text-xs">No</div>
							<div className="font-mono font-semibold text-no">
								{cents(1 - market.yesPrice)}
							</div>
						</div>
					</div>
					<SignInButton
						variant="default"
						size="lg"
						className="w-full"
						label="Sign in with Google"
					/>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="space-y-5">
				<div className="grid grid-cols-2 gap-2">
					<Button
						variant={side === "Yes" ? "yes" : "secondary"}
						onClick={() => setSide("Yes")}
					>
						Yes · {cents(market.yesPrice)}
					</Button>
					<Button
						variant={side === "No" ? "no" : "secondary"}
						onClick={() => setSide("No")}
					>
						No · {cents(1 - market.yesPrice)}
					</Button>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="amount" className="text-muted-foreground text-xs">
						Amount
					</Label>
					<div className="flex items-center gap-2 rounded-md border bg-muted px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
						<span className="font-mono text-muted-foreground">
							{CURRENCY_SYMBOL}
						</span>
						<Input
							id="amount"
							inputMode="decimal"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className="h-10 border-0 bg-transparent p-0 font-semibold text-lg shadow-none focus-visible:border-0 focus-visible:ring-0"
						/>
						<span className="text-muted-foreground text-xs">
							/ {mounted ? Math.round(balance).toLocaleString() : "—"}
						</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					{["50", "100", "250", "500"].map((v) => (
						<Button
							key={v}
							variant="outline"
							size="xs"
							onClick={() => setAmount(v)}
						>
							{CURRENCY_SYMBOL}
							{v}
						</Button>
					))}
				</div>

				<div className="space-y-2 text-sm">
					<Row label="Avg price" value={cents(price)} />
					<Row label="Shares" value={shares.toFixed(2)} />
					<Row
						label="Max payout"
						value={`${CURRENCY_SYMBOL}${Math.round(payout)}`}
						accent
					/>
				</div>

				<Button
					variant={side === "Yes" ? "yes" : "no"}
					size="lg"
					className="w-full"
					disabled={submitting || insufficient || cost <= 0}
					onClick={submit}
				>
					{submitting
						? "Placing…"
						: insufficient
							? "Not enough shekels"
							: cost <= 0
								? "Enter an amount"
								: `Buy ${side} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`}
				</Button>

				<p className="text-center text-muted-foreground text-xs">
					Play-money shekels. Everyone starts with {CURRENCY_SYMBOL}1,000.
				</p>
			</CardContent>
		</Card>
	);
}

function Row({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className={cn(accent ? "font-semibold" : "")}>{value}</span>
		</div>
	);
}

function Stats({ market }: { market: UIMarket }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm">Market stats</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2 text-sm">
				<Row label="Volume" value={money(market.volume)} />
				<Row label="Liquidity" value={money(market.liquidity)} />
				<Row label="Open interest" value={money(market.openInterest)} />
				<Separator className="my-2" />
				<Row label="Closes" value={market.closesAt} />
			</CardContent>
		</Card>
	);
}

function MarketDetailSkeleton() {
	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
			<Skeleton className="h-4 w-72" />
			<div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.7fr_1fr]">
				<div className="space-y-6">
					<div>
						<Skeleton className="h-4 w-20" />
						<Skeleton className="mt-3 h-12 w-full" />
						<Skeleton className="mt-4 h-10 w-40" />
						<Skeleton className="mt-3 h-2 w-full" />
					</div>
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-80 w-full" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-96 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			</div>
		</main>
	);
}

function MarketNotFound({ id }: { id: string }) {
	return (
		<main className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
			<h1 className="font-bold text-3xl">Market not found</h1>
			<p className="mt-2 text-muted-foreground">No market matches “{id}”.</p>
			<Button asChild className="mt-6">
				<Link to="/markets">Browse all markets</Link>
			</Button>
		</main>
	);
}

function relativeTime(ts: number): string {
	const diff = Date.now() - ts;
	if (diff < 60_000) return "just now";
	const mins = Math.floor(diff / 60_000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(diff / 3_600_000);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(diff / 86_400_000);
	if (days < 7) return `${days}d ago`;
	const weeks = Math.floor(days / 7);
	return `${weeks}w ago`;
}
