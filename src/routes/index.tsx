import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { MarketCard } from "@/components/market-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { categories, money, toUIMarket } from "@/lib/markets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	const docs = useQuery(api.markets.list, {});
	const leaders = useQuery(api.leaderboard.top, { limit: 1 });
	const isLoading = docs === undefined;
	const markets = (docs ?? []).map((d) => toUIMarket(d));

	const totalVolume = markets.reduce((acc, m) => acc + m.volume, 0);
	const totalLiquidity = markets.reduce((acc, m) => acc + m.liquidity, 0);
	const resolved = (docs ?? []).filter((m) => m.status === "resolved");
	const yesResolved = resolved.filter((m) => m.resolution === "Yes").length;
	const hitRate =
		resolved.length > 0
			? `${Math.round((yesResolved / resolved.length) * 100)}% Yes`
			: "—";
	const topTrader =
		leaders && leaders.length > 0
			? `${leaders[0].handle} · ${money(leaders[0].pnl)}`
			: "—";
	const trending = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 4);
	const featured = markets.slice(0, 6);

	return (
		<main className="flex-1">
			<Hero
				totalVolume={totalVolume}
				totalLiquidity={totalLiquidity}
				marketCount={markets.length}
				hitRate={hitRate}
				topTrader={topTrader}
				loading={isLoading}
			/>

			<section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
				<SectionHeader
					eyebrow="Hot right now"
					title="Trending Charles markets"
					href="/markets"
				/>
				<div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{isLoading
						? Array.from({ length: 4 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
								<MarketCardSkeleton key={i} />
							))
						: trending.map((m) => <MarketCard key={m._id} market={m} />)}
				</div>
			</section>

			<section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6">
				<CategoryStrip />
			</section>

			<section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-20">
				<SectionHeader eyebrow="All markets" title="Featured" href="/markets" />
				{isLoading ? (
					<div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
							<MarketCardSkeleton key={i} />
						))}
					</div>
				) : markets.length === 0 ? (
					<EmptyMarkets />
				) : (
					<>
						<div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{featured.map((m) => (
								<MarketCard key={m._id} market={m} />
							))}
						</div>
						<div className="mt-8 flex justify-center">
							<Button asChild variant="outline">
								<Link to="/markets">
									See all {markets.length} markets
									<ArrowRight />
								</Link>
							</Button>
						</div>
					</>
				)}
			</section>
		</main>
	);
}

function Hero({
	totalVolume,
	totalLiquidity,
	marketCount,
	hitRate,
	topTrader,
	loading,
}: {
	totalVolume: number;
	totalLiquidity: number;
	marketCount: number;
	hitRate: string;
	topTrader: string;
	loading: boolean;
}) {
	return (
		<section className="border-b bg-gradient-to-b from-accent/40 to-background">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 sm:py-14 md:grid-cols-[1.4fr_1fr] md:gap-10 md:py-20">
				<div>
					<Badge variant="brand" className="gap-2">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
						</span>
						Live · {loading ? "—" : marketCount} markets open
					</Badge>
					<h1 className="mt-4 font-bold text-3xl leading-tight tracking-tight sm:text-4xl md:text-5xl">
						The prediction market for{" "}
						<span className="text-primary">Charles</span>.
					</h1>
					<p className="mt-3 max-w-xl text-base text-muted-foreground sm:mt-4 sm:text-lg">
						Will he show up on time? Get the job? Lock himself out again? Trade
						Yes/No contracts and let the wisdom of the friend group decide.
					</p>
					<div className="mt-5 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
						<Button asChild className="flex-1 sm:flex-none">
							<Link to="/markets">Browse markets</Link>
						</Button>
						<Button asChild variant="outline" className="flex-1 sm:flex-none">
							<Link to="/propose">Propose a market</Link>
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2 self-end sm:gap-3">
					<Stat
						label="Total volume"
						value={loading ? "—" : money(totalVolume)}
					/>
					<Stat
						label="Open liquidity"
						value={loading ? "—" : money(totalLiquidity)}
					/>
					<Stat label="Charles's hit rate" value={loading ? "—" : hitRate} />
					<Stat label="Top trader" value={loading ? "—" : topTrader} />
				</div>
			</div>
		</section>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Card>
			<CardContent className="px-4 sm:px-6">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide sm:text-xs">
					{label}
				</div>
				<div className="mt-1 font-semibold text-lg sm:text-xl">{value}</div>
			</CardContent>
		</Card>
	);
}

function SectionHeader({
	eyebrow,
	title,
	href,
}: {
	eyebrow: string;
	title: string;
	href?: string;
}) {
	return (
		<div className="flex items-end justify-between gap-2">
			<div className="min-w-0">
				<div className="flex items-center gap-1.5 text-primary text-xs uppercase tracking-wide">
					<TrendingUp className="size-3.5" />
					{eyebrow}
				</div>
				<h2 className="mt-1 font-bold text-xl tracking-tight sm:text-2xl">
					{title}
				</h2>
			</div>
			{href && (
				<Button asChild variant="link" size="sm" className="shrink-0">
					<Link to={href}>View all →</Link>
				</Button>
			)}
		</div>
	);
}

function CategoryStrip() {
	return (
		<div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
			<span className="shrink-0 font-medium text-muted-foreground text-sm">
				Categories:
			</span>
			{categories.map((c) => (
				<Badge
					key={c}
					asChild
					variant="outline"
					className="shrink-0 rounded-full"
				>
					<Link to="/markets" search={{ category: c }}>
						{c}
					</Link>
				</Badge>
			))}
		</div>
	);
}

function MarketCardSkeleton() {
	return (
		<Card>
			<CardContent className="space-y-4">
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-6 w-full" />
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-2 w-full" />
				<div className="grid grid-cols-2 gap-2">
					<Skeleton className="h-9" />
					<Skeleton className="h-9" />
				</div>
				<Skeleton className="h-4 w-full" />
			</CardContent>
		</Card>
	);
}

function EmptyMarkets() {
	return (
		<Card className="mt-8 border-dashed">
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<h3 className="font-semibold text-lg">No markets yet</h3>
				<p className="max-w-md text-muted-foreground text-sm">
					Be the first to pitch one. Submit a question, set the resolution
					criteria, and let the friend group trade it out.
				</p>
				<Button asChild>
					<Link to="/propose">Propose a market</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
