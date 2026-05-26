import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { BracketChip, Kicker, Stat } from "@/components/console";
import { TicketCard } from "@/components/ticket-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pageHead } from "@/lib/seo";
import { CURRENCY_SYMBOL, money, toUITicket } from "@/lib/tickets";
import { api } from "../../convex/_generated/api";

const ROTATING_NAMES = [
	"Charles",
	"Beckett",
	"Cookie",
	"Danny",
	"Chris",
	"Derk",
	"Carson",
	"Lucas",
	"Issac",
	"Landry",
] as const;

// ~2s between scrolls, very gently decelerating into the final Charles.
const BEAT_DELAYS_MS = [
	1900, 1950, 2000, 2000, 2050, 2100, 2150, 2200, 2300, 2500,
];
const INITIAL_HOLD_MS = 800;

const ENTER_DURATION = 0.36;
const EXIT_DURATION = 0.24;

// Smoother easing — quart-style ease-out on enter, gentler ease-in on exit.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.5, 0, 0.75, 0] as const;

function RotatingName() {
	const reduced = useReducedMotion();
	const [idx, setIdx] = useState(0);
	const [done, setDone] = useState(false);
	const widest = ROTATING_NAMES.reduce((a, b) =>
		a.length >= b.length ? a : b
	);

	useEffect(() => {
		if (reduced) {
			setDone(true);
			return;
		}

		let cancelled = false;
		let beat = 0;
		let timeoutId = window.setTimeout(function tick() {
			if (cancelled) return;
			setIdx((i) => (i + 1) % ROTATING_NAMES.length);
			beat += 1;
			if (beat >= BEAT_DELAYS_MS.length) {
				setDone(true);
				return;
			}
			timeoutId = window.setTimeout(tick, BEAT_DELAYS_MS[beat]);
		}, INITIAL_HOLD_MS);

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
		};
	}, [reduced]);

	// Landing on Charles after the full cycle — softer settle (spring) for the
	// final motion. Mid-cycle beats use snappy tweens.
	const isSettle = done && idx === 0;

	return (
		<span
			className="relative inline-block align-baseline text-brand"
			style={{ paddingBottom: "0.18em" }}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none invisible whitespace-nowrap"
			>
				{widest}
			</span>
			<span aria-live="polite" className="absolute inset-0 overflow-hidden">
				<AnimatePresence initial={false} mode="wait">
					<motion.span
						key={idx}
						initial={{ y: "-110%" }}
						animate={{ y: 0 }}
						exit={{
							y: "110%",
							transition: { duration: EXIT_DURATION, ease: EASE_IN },
						}}
						transition={
							isSettle
								? { type: "spring", stiffness: 180, damping: 19, mass: 1 }
								: { duration: ENTER_DURATION, ease: EASE_OUT }
						}
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: "0.18em",
							whiteSpace: "nowrap",
							willChange: "transform",
						}}
					>
						{ROTATING_NAMES[idx]}
					</motion.span>
				</AnimatePresence>
			</span>
		</span>
	);
}

export const Route = createFileRoute("/")({
	component: Home,
	head: () =>
		pageHead({
			title: "Bet on the people you know",
			description:
				"Play-money prediction console for the friends you know. Anyone publishes a Yes/No ticket about another user; the room sets the line in shekels.",
			path: "/",
		}),
});

function Home() {
	const docs = useQuery(api.tickets.list, {});
	const leaders = useQuery(api.leaderboard.top, { limit: 1 });
	const isLoading = docs === undefined;
	const tickets = (docs ?? []).map((d) => toUITicket(d));

	const totalVolume = tickets.reduce((acc, m) => acc + m.volume, 0);
	const totalLiquidity = tickets.reduce((acc, m) => acc + m.liquidity, 0);
	const resolvedTickets = (docs ?? []).filter((m) => m.status === "resolved");
	const yesResolved = resolvedTickets.filter((m) => m.resolution === "Yes").length;
	const hitRate =
		resolvedTickets.length > 0
			? `${Math.round((yesResolved / resolvedTickets.length) * 100)}%`
			: "—";
	const topTrader =
		leaders && leaders.length > 0
			? `${leaders[0].handle.replace(/^@/, "")}`
			: "—";
	const topTraderPnl =
		leaders && leaders.length > 0 ? money(leaders[0].pnl) : "";

	const openTickets = tickets.filter((m) => m.status === "open");
	// Featured: highest volume.
	const byVolume = [...openTickets].sort((a, b) => b.volume - a.volume);
	const featured = byVolume[0];
	// Trending: highest price movement (delta), excluding featured.
	const byDelta = [...openTickets]
		.filter((m) => m._id !== featured?._id)
		.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
	const trending = byDelta.slice(0, 3);
	const trendingIds = new Set([featured?._id, ...trending.map((m) => m._id)]);
	// Rest: newest first (most recently created), excluding featured + trending.
	const rest = [...openTickets]
		.filter((m) => !trendingIds.has(m._id))
		.sort((a, b) => b.createdAt - a.createdAt);

	return (
		<main className="flex-1">
			<Hero
				totalVolume={totalVolume}
				totalLiquidity={totalLiquidity}
				ticketCount={tickets.length}
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
						href="/tickets"
					/>
					<div className="mt-6">
						{isLoading ? (
							<FeaturedSkeleton />
						) : featured ? (
							<TicketCard ticket={featured} variant="featured" />
						) : (
							<EmptyTickets />
						)}
					</div>
				</section>

				{!isLoading && trending.length > 0 ? (
					<section className="border-rule border-t py-12 sm:py-16">
						<SectionHead
							kicker="HEAVY VOLUME"
							title="Where the shekels are"
							href="/tickets"
						/>
						<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
							{trending.map((m) => (
								<TicketCard key={m._id} ticket={m} />
							))}
						</div>
					</section>
				) : null}

				<section className="border-rule border-t py-12 sm:py-16">
					<SectionHead
						kicker="MORE TICKETS"
						title="Open tickets"
						href="/tickets"
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
								<TicketCard key={m._id} ticket={m} />
							))}
						</div>
					)}
					{!isLoading && openTickets.length > 0 ? (
						<div className="mt-8 flex justify-center">
							<Button asChild variant="outline">
								<Link to="/tickets">
									Browse all {openTickets.length} open tickets
									<ArrowRight />
								</Link>
							</Button>
						</div>
					) : null}
				</section>
			</div>
		</main>
	);
}

function Hero({
	totalVolume,
	totalLiquidity,
	ticketCount,
	hitRate,
	topTrader,
	topTraderPnl,
	loading,
}: {
	totalVolume: number;
	totalLiquidity: number;
	ticketCount: number;
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
						LIVE · {loading ? "—" : ticketCount} TICKETS
					</BracketChip>
					<h1 className="display-headline mt-5 text-[clamp(2.25rem,7vw,5.5rem)] sm:mt-6">
						The prediction
						<br />
						console
						<br />
						for <RotatingName />
					</h1>
					<p className="mt-5 max-w-xl text-base text-bone-2 leading-relaxed sm:mt-6 sm:text-lg">
						Will Charles crack. Will Cookie get the job. Will Landry lock
						himself out again. Trade Yes/No in shekels, let the rest of the room
						price it.
					</p>
					<div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
						<Button asChild size="lg" className="w-full sm:w-auto">
							<Link to="/tickets">Browse tickets</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="w-full sm:w-auto"
						>
							<Link to="/create">+ New ticket</Link>
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
							{CURRENCY_SYMBOL}2,000
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

function EmptyTickets() {
	return (
		<div className="border border-rule border-dashed bg-ink-2 px-6 py-16 text-center">
			<Kicker>NOTHING OPEN</Kicker>
			<h3 className="display-headline mt-3 text-2xl">No tickets yet.</h3>
			<p className="mx-auto mt-2 max-w-md text-bone-2 text-sm">
				Pitch the first one. Frame something a friend could fail at, set the
				close, let the room price it.
			</p>
			<Button asChild className="mt-6">
				<Link to="/create">+ Create the first ticket</Link>
			</Button>
		</div>
	);
}
