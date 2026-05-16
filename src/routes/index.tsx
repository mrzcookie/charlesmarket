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
	const isLoading = docs === undefined;
	const markets = (docs ?? []).map((d) => toUIMarket(d));

	const totalVolume = markets.reduce((acc, m) => acc + m.volume, 0);
	const totalLiquidity = markets.reduce((acc, m) => acc + m.liquidity, 0);
	const trending = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 4);
	const featured = markets.slice(0, 6);

	return (
		<main className="flex-1">
			<Hero
				totalVolume={totalVolume}
				totalLiquidity={totalLiquidity}
				marketCount={markets.length}
				loading={isLoading}
			/>

			<section className="mx-auto w-full max-w-7xl px-4 pt-10 pb-6 sm:px-6">
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

			<section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
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
	loading,
}: {
	totalVolume: number;
	totalLiquidity: number;
	marketCount: number;
	loading: boolean;
}) {
	return (
		<section className="border-b bg-gradient-to-b from-accent/40 to-background">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr] md:py-20">
				<div>
					<Badge variant="brand" className="gap-2">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
						</span>
						Live · {loading ? "—" : marketCount} markets open
					</Badge>
					<h1 className="mt-4 font-bold text-4xl tracking-tight md:text-5xl">
						The prediction market for{" "}
						<span className="text-primary">Charles</span>.
					</h1>
					<p className="mt-4 max-w-xl text-lg text-muted-foreground">
						Will he show up on time? Get the job? Lock himself out again? Trade
						Yes/No contracts and let the wisdom of the friend group decide.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Button asChild>
							<Link to="/markets">Browse markets</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/propose">Propose a market</Link>
						</Button>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 self-end">
					<Stat
						label="Total volume"
						value={loading ? "—" : money(totalVolume)}
					/>
					<Stat
						label="Open liquidity"
						value={loading ? "—" : money(totalLiquidity)}
					/>
					<Stat label="Charles's hit rate" value="63% Yes" />
					<Stat label="Top trader" value="@reece · +₪1.2k" />
				</div>
			</div>
		</section>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Card>
			<CardContent>
				<div className="text-muted-foreground text-xs uppercase tracking-wide">
					{label}
				</div>
				<div className="mt-1 font-semibold text-xl">{value}</div>
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
		<div className="flex items-end justify-between">
			<div>
				<div className="flex items-center gap-1.5 text-primary text-xs uppercase tracking-wide">
					<TrendingUp className="size-3.5" />
					{eyebrow}
				</div>
				<h2 className="mt-1 font-bold text-2xl tracking-tight">{title}</h2>
			</div>
			{href && (
				<Button asChild variant="link" size="sm">
					<Link to={href}>View all →</Link>
				</Button>
			)}
		</div>
	);
}

function CategoryStrip() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="font-medium text-muted-foreground text-sm">
				Categories:
			</span>
			{categories.map((c) => (
				<Badge key={c} asChild variant="outline" className="rounded-full">
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
			<CardContent className="py-12 text-center">
				<h3 className="font-semibold text-lg">No markets yet</h3>
				<p className="mt-2 text-muted-foreground text-sm">
					The markets table is empty. Run{" "}
					<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
						npx convex run seed:run
					</code>{" "}
					to populate the 12 starter Charles markets.
				</p>
			</CardContent>
		</Card>
	);
}
