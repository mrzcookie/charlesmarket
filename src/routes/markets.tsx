import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type Search = {
	category?: Category | "All";
	sort?: Sort;
	q?: string;
};

export const Route = createFileRoute("/markets")({
	component: MarketsPage,
	validateSearch: (search: Record<string, unknown>): Search => {
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
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h1 className="font-bold text-3xl tracking-tight">Markets</h1>
					<p className="text-muted-foreground">
						{isLoading
							? "Loading markets…"
							: `${filtered.length} of ${markets.length} markets open for trading.`}
					</p>
				</div>
				<Button asChild variant="outline" size="sm">
					<Link to="/propose">
						<Plus /> Propose a market
					</Link>
				</Button>
			</div>

			<div className="sticky top-[57px] z-10 mt-6 flex flex-col gap-3 border-b bg-background/85 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
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
					className="flex-wrap justify-start"
				>
					<ToggleGroupItem value="All">All</ToggleGroupItem>
					{categories.map((c) => (
						<ToggleGroupItem key={c} value={c}>
							{c}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
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
					<Input
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search markets…"
						className="w-full max-w-xs"
					/>
					<Select
						value={sort}
						onValueChange={(v) =>
							navigate({
								search: { category, sort: v as Sort, q: search.q },
							})
						}
					>
						<SelectTrigger className="w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="volume">Volume</SelectItem>
							<SelectItem value="trending">Trending</SelectItem>
							<SelectItem value="closing">Closing soon</SelectItem>
							<SelectItem value="new">Newest</SelectItem>
						</SelectContent>
					</Select>
				</form>
			</div>

			{isLoading ? (
				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						<MarketSkeletonCard key={i} />
					))}
				</div>
			) : filtered.length === 0 ? (
				<Card className="mt-12 border-dashed">
					<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
						<p className="text-muted-foreground">
							{markets.length === 0
								? "No markets yet — pitch the first one."
								: "No markets match those filters."}
						</p>
						<Button asChild size="sm">
							<Link to="/propose">
								<Plus /> Propose a market
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{filtered.map((m) => (
						<MarketCard key={m._id} market={m} />
					))}
				</div>
			)}
		</main>
	);
}

function MarketSkeletonCard() {
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
