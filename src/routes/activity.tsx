import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Check, MessageSquare, ShoppingCart, Sparkles } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cents, money } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/activity")({
	component: ActivityPage,
});

type Filter = "all" | "trades" | "resolutions" | "comments";

function ActivityPage() {
	const [filter, setFilter] = useState<Filter>("all");
	const events = useQuery(api.activity.feed, { filter, limit: 50 });

	return (
		<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">Activity</h1>
					<p className="mt-1 text-muted-foreground">
						Every trade, comment, and resolution on Charlesmarket.
					</p>
				</div>
				<ToggleGroup
					type="single"
					value={filter}
					onValueChange={(v) => v && setFilter(v as Filter)}
				>
					<ToggleGroupItem value="all">All</ToggleGroupItem>
					<ToggleGroupItem value="trades">Trades</ToggleGroupItem>
					<ToggleGroupItem value="resolutions">Resolutions</ToggleGroupItem>
					<ToggleGroupItem value="comments">Comments</ToggleGroupItem>
				</ToggleGroup>
			</div>

			{events === undefined ? (
				<div className="mt-8 space-y-3">
					{Array.from({ length: 5 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						<Skeleton key={i} className="h-20 w-full" />
					))}
				</div>
			) : events.length === 0 ? (
				<Card className="mt-8 border-dashed">
					<CardContent className="py-12 text-center text-muted-foreground">
						Quiet around here. Once trades start flowing, they'll show up live.
					</CardContent>
				</Card>
			) : (
				<ol className="mt-8 space-y-3">
					{events.map((e) => (
						<li key={e._id}>
							<Card>
								<CardContent>
									<EventRow event={e} />
								</CardContent>
							</Card>
						</li>
					))}
				</ol>
			)}
		</main>
	);
}

type FeedEvent = FunctionReturnType<typeof api.activity.feed>[number];

function EventRow({ event }: { event: FeedEvent }) {
	return (
		<div className="flex items-start gap-3">
			<EventIcon kind={event.kind} />
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					{event.kind !== "resolve" && (
						<>
							<Avatar className="size-6">
								<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 text-[10px] text-primary-foreground">
									{event.handle.charAt(1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="font-semibold">{event.handle}</span>
						</>
					)}
					<EventVerb event={event} />
					<Link
						to="/market/$id"
						params={{ id: event.marketSlug }}
						className="font-medium text-primary hover:underline"
					>
						{event.question}
					</Link>
				</div>
				{event.kind === "comment" && (
					<p className="mt-1 text-muted-foreground text-sm">{event.body}</p>
				)}
				<div className="mt-1 text-muted-foreground text-xs">
					{relativeTime(event.ts)}
				</div>
			</div>
		</div>
	);
}

function EventVerb({ event }: { event: FeedEvent }) {
	if (event.kind === "trade") {
		return (
			<span className="text-muted-foreground">
				{event.action === "sell" ? "sold" : "bought"}{" "}
				<Badge
					variant={event.side === "Yes" ? "yes" : "no"}
					className="text-xs"
				>
					{event.side} {money(Math.abs(event.cost))}
				</Badge>{" "}
				@ <span className="font-mono">{cents(event.price)}</span>
			</span>
		);
	}
	if (event.kind === "comment") {
		return <span className="text-muted-foreground">commented on</span>;
	}
	if (event.kind === "resolve") {
		return (
			<span className="text-muted-foreground">
				resolved{" "}
				<Badge variant={event.resolution === "Yes" ? "yes" : "no"}>
					{event.resolution}
				</Badge>{" "}
				on
			</span>
		);
	}
	return null;
}

function EventIcon({ kind }: { kind: FeedEvent["kind"] }) {
	const map: Record<string, { Icon: typeof ShoppingCart; className: string }> =
		{
			trade: { Icon: ShoppingCart, className: "bg-yes-soft text-yes" },
			comment: {
				Icon: MessageSquare,
				className: "bg-muted text-muted-foreground",
			},
			resolve: { Icon: Check, className: "bg-accent text-accent-foreground" },
		};
	const { Icon, className } = map[kind] ?? {
		Icon: Sparkles,
		className: "bg-muted text-muted-foreground",
	};
	return (
		<div
			className={cn(
				"grid size-9 shrink-0 place-items-center rounded-full",
				className
			)}
		>
			<Icon className="size-4" />
		</div>
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
	return `${Math.floor(days / 7)}w ago`;
}
