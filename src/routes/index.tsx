import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { BracketChip, Kicker, Stat } from "@/components/console";
import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_SYMBOL, categories, money, toUIMarket } from "@/lib/markets";
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
			? `${Math.round((yesResolved / resolved.length) * 100)}%`
			: "—";
	const topTrader =
		leaders && leaders.length > 0
			? `${leaders[0].handle.replace(/^@/, "")}`
			: "—";
	const topTraderPnl =
		leaders && leaders.length > 0 ? money(leaders[0].pnl) : "";

	const sortedByVolume = [...markets].sort((a, b) => b.volume - a.volume);
	const featured = sortedByVolume[0];
	const trending = sortedByVolume.slice(1, 4);
	const rest = sortedByVolume.slice(4);

	return (
		<main className="flex-1">
			<Hero
				totalVolume={totalVolume}
				totalLiquidity={totalLiquidity}
				marketCount={markets.length}
				hitRate={hitRate}
				topTrader={topTrader}
				topTraderPnl={topTraderPnl}
				loading={isLoading}
			/>

			<div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
				<section className="py-12 sm:py-16">
					<SectionHead
						kicker="TODAY'S TOP"
						title="The big ticket"
						href="/markets"
					/>
					<div className="mt-6">
						{isLoading ? (
							<FeaturedSkeleton />
						) : featured ? (
							<MarketCard market={featured} variant="featured" />
						) : (
							<EmptyMarkets />
						)}
					</div>
				</section>

				{!isLoading && trending.length > 0 ? (
					<section className="border-rule border-t py-12 sm:py-16">
						<SectionHead
							kicker="HEAVY VOLUME"
							title="Where the shekels are"
							href="/markets"
						/>
						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							{trending.map((m) => (
								<MarketCard key={m._id} market={m} />
							))}
						</div>
					</section>
				) : null}

				<section className="border-rule border-t py-12 sm:py-16">
					<SectionHead
						kicker="MORE TICKETS"
						title="Open tickets"
						href="/markets"
					/>
					{isLoading ? (
						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }, (_, i) => `grid-skel-${i}`).map(
								(k) => (
									<TileSkeleton key={k} />
								)
							)}
						</div>
					) : rest.length === 0 ? (
						<div className="mt-6 border border-rule border-dashed px-4 py-12 text-center text-bone-2 text-sm">
							That's everything for now. Pitch the next one.
						</div>
					) : (
						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{rest.map((m) => (
								<MarketCard key={m._id} market={m} />
							))}
						</div>
					)}
					{!isLoading && markets.length > 0 ? (
						<div className="mt-8 flex justify-center">
							<Button asChild variant="outline">
								<Link to="/markets">
									Browse all {markets.length} tickets
									<ArrowRight />
								</Link>
							</Button>
						</div>
					) : null}
				</section>

				<section className="border-rule border-t py-12 sm:py-16">
					<SectionHead kicker="FILTER" title="By category" />
					<div className="mt-6 flex flex-wrap gap-2">
						{categories.map((c) => (
							<Link
								key={c}
								to="/markets"
								search={{ category: c }}
								className="flex items-center gap-2 border border-rule px-3 py-2 font-mono font-semibold text-[11px] text-bone-2 uppercase tracking-[0.14em] transition-colors hover:border-brand hover:text-brand"
							>
								<span className="text-bone-3">▸</span>
								{c}
							</Link>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}

function Hero({
	totalVolume,
	totalLiquidity,
	marketCount,
	hitRate,
	topTrader,
	topTraderPnl,
	loading,
}: {
	totalVolume: number;
	totalLiquidity: number;
	marketCount: number;
	hitRate: string;
	topTrader: string;
	topTraderPnl: string;
	loading: boolean;
}) {
	return (
		<section className="relative overflow-hidden border-rule border-b">
			<HeroBackdrop />
			<div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-20 lg:grid-cols-[1.6fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
				<div>
					<BracketChip pulse>
						LIVE · {loading ? "—" : marketCount} TICKETS
					</BracketChip>
					<h1 className="display-headline mt-5 text-[clamp(2.25rem,7vw,5.5rem)] sm:mt-6">
						The prediction console for{" "}
						<span className="text-brand">Charles</span>.
					</h1>
					<p className="mt-5 max-w-xl text-base text-bone-2 leading-relaxed sm:mt-6 sm:text-lg">
						Will he show up on time. Get the job. Lock himself out again. Trade
						Yes / No tickets in shekels and let the friend group price the
						outcome.
					</p>
					<div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
						<Button asChild size="lg" className="w-full sm:w-auto">
							<Link to="/markets">Browse tickets</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="w-full sm:w-auto"
						>
							<Link to="/propose">+ Propose a ticket</Link>
						</Button>
					</div>
				</div>

				<aside className="grid grid-cols-2 gap-x-6 gap-y-6 self-end border-rule sm:gap-x-10 lg:border-l lg:pl-12">
					<Stat
						label="Total volume"
						value={loading ? "—" : money(totalVolume)}
					/>
					<Stat
						label="Open liquidity"
						value={loading ? "—" : money(totalLiquidity)}
					/>
					<Stat
						label="Yes hit rate"
						value={loading ? "—" : hitRate}
						tone="brand"
					/>
					<div className="flex flex-col gap-1">
						<div className="label">Top trader</div>
						<div className="flex items-baseline gap-2">
							{loading || topTrader === "—" ? (
								<span className="font-bold font-mono text-bone text-lg leading-none">
									—
								</span>
							) : (
								<Link
									to="/profile/$username"
									params={{ username: encodeURIComponent(topTrader) }}
									className="font-bold font-mono text-bone text-lg leading-none hover:text-brand"
								>
									@{topTrader}
								</Link>
							)}
							{topTraderPnl ? (
								<span className="font-mono font-semibold text-brand text-xs tabular-nums">
									+{topTraderPnl}
								</span>
							) : null}
						</div>
					</div>
					<div className="col-span-2 flex flex-wrap items-center gap-2 border-rule border-t pt-4 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
						<span>Starting cash</span>
						<span className="font-bold text-brand tabular-nums">
							{CURRENCY_SYMBOL}1,000
						</span>
						<span aria-hidden="true">·</span>
						<span>Play money, real consequences for his reputation</span>
					</div>
				</aside>
			</div>
		</section>
	);
}

function HeroBackdrop() {
	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
			preserveAspectRatio="none"
		>
			<title>Grid backdrop</title>
			<defs>
				<pattern
					id="hero-grid"
					width="40"
					height="40"
					patternUnits="userSpaceOnUse"
				>
					<path
						d="M 40 0 L 0 0 0 40"
						fill="none"
						stroke="currentColor"
						strokeWidth="0.5"
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#hero-grid)" />
		</svg>
	);
}

function SectionHead({
	kicker,
	title,
	href,
}: {
	kicker: string;
	title: string;
	href?: string;
}) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-3">
			<div className="min-w-0">
				<Kicker>{kicker}</Kicker>
				<h2 className="display-headline mt-2 text-3xl sm:text-4xl md:text-[2.5rem]">
					{title}
				</h2>
			</div>
			{href ? (
				<Link
					to={href}
					className="group inline-flex items-center gap-1.5 font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.16em] transition-colors hover:text-brand"
				>
					Open all
					<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
				</Link>
			) : null}
		</header>
	);
}

function FeaturedSkeleton() {
	return (
		<div className="border border-rule bg-ink-2 p-8">
			<Skeleton className="h-3 w-40" />
			<Skeleton className="mt-6 h-14 w-full" />
			<Skeleton className="mt-2 h-14 w-3/4" />
			<div className="mt-8 grid grid-cols-[1fr_320px] gap-6">
				<Skeleton className="h-40 w-full" />
				<div className="grid grid-cols-2 gap-2">
					<Skeleton className="h-20" />
					<Skeleton className="h-20" />
				</div>
			</div>
		</div>
	);
}

function TileSkeleton() {
	return (
		<div className="flex h-full flex-col gap-4 border border-rule bg-ink-2 p-4 sm:p-5">
			<div className="flex items-center justify-between">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-3 w-12" />
			</div>
			<Skeleton className="h-5 w-full" />
			<Skeleton className="h-5 w-3/4" />
			<Skeleton className="h-9 w-full" />
			<div className="grid grid-cols-2 gap-2">
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</div>
		</div>
	);
}

function EmptyMarkets() {
	return (
		<div className="border border-rule border-dashed bg-ink-2 px-6 py-16 text-center">
			<Kicker>NOTHING OPEN</Kicker>
			<h3 className="display-headline mt-3 text-2xl">No tickets yet.</h3>
			<p className="mx-auto mt-2 max-w-md text-bone-2 text-sm">
				Pitch the first one. Frame a question Charles could fail at, set the
				close time, let the friend group price it.
			</p>
			<Button asChild className="mt-6">
				<Link to="/propose">+ Propose the first ticket</Link>
			</Button>
		</div>
	);
}
