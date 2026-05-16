import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Kicker } from "@/components/console";
import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Category, categories, toUIMarket } from "@/lib/markets";
import { api } from "../../convex/_generated/api";

type Sort = "volume" | "closing" | "trending" | "new";
type View = "board" | "tiles";

type SearchParams = {
	category?: Category | "All";
	sort?: Sort;
	q?: string;
};

export const Route = createFileRoute("/markets")({
	component: MarketsPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		const cat = search.category;
		const sort = search.sort;
		const q = search.q;
		return {
			category:
				typeof cat === "string" &&
				(cat === "All" || (categories as readonly string[]).includes(cat))
					? (cat as Category | "All")
					: undefined,
			sort:
				sort === "volume" ||
				sort === "closing" ||
				sort === "trending" ||
				sort === "new"
					? sort
					: undefined,
			q: typeof q === "string" && q.trim() ? q : undefined,
		};
	},
});

function MarketsPage() {
	const search = Route.useSearch();
	const category = search.category ?? "All";
	const sort: Sort = search.sort ?? "volume";
	const navigate = Route.useNavigate();
	const [query, setQuery] = useState(search.q ?? "");
	const [view, setView] = useState<View>("board");

	useEffect(() => {
		setQuery(search.q ?? "");
	}, [search.q]);

	const docs = useQuery(api.markets.list, {
		category: category === "All" ? undefined : category,
	});
	const isLoading = docs === undefined;
	const markets = useMemo(() => (docs ?? []).map((d) => toUIMarket(d)), [docs]);

	const filtered = useMemo(() => {
		const q = (search.q ?? query).trim().toLowerCase();
		const list = q
			? markets.filter(
					(m) =>
						m.question.toLowerCase().includes(q) ||
						m.tags.some((t) => t.toLowerCase().includes(q))
				)
			: markets;
		const sorted = [...list];
		if (sort === "volume") sorted.sort((a, b) => b.volume - a.volume);
		if (sort === "trending")
			sorted.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
		if (sort === "closing")
			sorted.sort(
				(a, b) => parseClosesIn(a.closesIn) - parseClosesIn(b.closesIn)
			);
		if (sort === "new") sorted.sort((a, b) => a.slug.localeCompare(b.slug));
		return sorted;
	}, [markets, search.q, query, sort]);

	return (
		<main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<Kicker>THE BOARD</Kicker>
					<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
						All Charles tickets
					</h1>
					<p className="mt-3 max-w-xl text-bone-2 text-sm sm:text-base">
						{isLoading
							? "Loading the board…"
							: `${filtered.length} of ${markets.length} open for trading. Sorted by ${sortLabel(sort)}.`}
					</p>
				</div>
				<Button asChild>
					<Link to="/propose">
						<Plus /> Propose ticket
					</Link>
				</Button>
			</header>

			<div className="z-10 -mx-4 mt-8 flex flex-col gap-3 border-rule border-b bg-ink/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:sticky md:top-[56px] md:flex-row md:items-center md:justify-between md:py-4">
				<div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
					<ToggleGroup
						type="single"
						value={category}
						onValueChange={(v) =>
							v &&
							navigate({
								search: {
									category: v as Category | "All",
									sort,
									q: search.q,
								},
							})
						}
						className="w-max md:w-auto md:flex-wrap md:justify-start"
					>
						<ToggleGroupItem value="All">All</ToggleGroupItem>
						{categories.map((c) => (
							<ToggleGroupItem key={c} value={c}>
								{c}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>
				<form
					className="flex items-center gap-2"
					onSubmit={(e) => {
						e.preventDefault();
						const q = query.trim();
						navigate({
							search: { category, sort, q: q || undefined },
						});
					}}
				>
					<div className="relative min-w-0 flex-1 md:max-w-xs">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
						<Input
							type="search"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Find a ticket…"
							className="pl-9"
						/>
					</div>
					<Select
						value={sort}
						onValueChange={(v) =>
							navigate({
								search: { category, sort: v as Sort, q: search.q },
							})
						}
					>
						<SelectTrigger className="w-[140px] shrink-0 md:w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="volume">Volume</SelectItem>
							<SelectItem value="trending">Trending</SelectItem>
							<SelectItem value="closing">Closing soon</SelectItem>
							<SelectItem value="new">Newest</SelectItem>
						</SelectContent>
					</Select>
					<ToggleGroup
						type="single"
						value={view}
						onValueChange={(v) => v && setView(v as View)}
						className="hidden md:flex"
					>
						<ToggleGroupItem value="board">Board</ToggleGroupItem>
						<ToggleGroupItem value="tiles">Tiles</ToggleGroupItem>
					</ToggleGroup>
				</form>
			</div>

			{isLoading ? (
				<div className="mt-8 border border-rule">
					{Array.from({ length: 8 }, (_, i) => `mkt-row-${i}`).map((k) => (
						<RowSkeleton key={k} />
					))}
				</div>
			) : filtered.length === 0 ? (
				<div className="mt-12 border border-rule border-dashed bg-ink-2 px-6 py-16 text-center">
					<Kicker>EMPTY</Kicker>
					<h3 className="display-headline mt-3 text-2xl">
						{markets.length === 0
							? "No tickets yet."
							: "Nothing matches that filter."}
					</h3>
					<Button asChild size="sm" className="mt-6">
						<Link to="/propose">
							<Plus /> Propose a ticket
						</Link>
					</Button>
				</div>
			) : view === "tiles" ? (
				<div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((m) => (
						<MarketCard key={m._id} market={m} />
					))}
				</div>
			) : (
				<div className="mt-8 border border-rule">
					{filtered.map((m) => (
						<MarketCard key={m._id} market={m} variant="compact" />
					))}
				</div>
			)}
		</main>
	);
}

function RowSkeleton() {
	return (
		<div className="ledger-row flex items-center gap-4 px-4 py-4">
			<Skeleton className="h-3 w-12" />
			<Skeleton className="h-4 flex-1" />
			<Skeleton className="hidden h-5 w-16 sm:block" />
			<Skeleton className="h-4 w-20" />
		</div>
	);
}

function sortLabel(s: Sort): string {
	if (s === "trending") return "biggest 24h moves";
	if (s === "closing") return "closing soonest";
	if (s === "new") return "newest";
	return "highest volume";
}

function parseClosesIn(s: string): number {
	if (s === "closed") return -1;
	const m = s.match(/(\d+)\s*([wdhm])/);
	if (!m) return 9999;
	const n = Number(m[1]);
	if (m[2] === "m") return n / 1440;
	if (m[2] === "h") return n / 24;
	if (m[2] === "w") return n * 7;
	return n;
}
