import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Kicker, ticketId } from "@/components/console";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { pageHead } from "@/lib/seo";
import { cents, money } from "@/lib/tickets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/activity")({
	component: ActivityPage,
	head: () =>
		pageHead({
			title: "Live activity",
			description:
				"Every trade, comment, and resolution on Charles.market. The realtime feed, newest first.",
			path: "/activity",
		}),
});

type Filter = "all" | "trades" | "resolutions" | "comments";

function ActivityPage() {
	const [filter, setFilter] = useState<Filter>("all");
	const events = useQuery(api.activity.feed, { filter, limit: 50 });

	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<Kicker>ACTIVITY</Kicker>
					<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
						Live activity
					</h1>
					<p className="mt-3 max-w-xl text-bone-2 text-sm sm:text-base">
						Every trade, comment, and resolution. Newest first.
					</p>
				</div>
				<div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
					<ToggleGroup
						type="single"
						value={filter}
						onValueChange={(v) => v && setFilter(v as Filter)}
						className="w-max sm:w-auto"
					>
						<ToggleGroupItem value="all">All</ToggleGroupItem>
						<ToggleGroupItem value="trades">Trades</ToggleGroupItem>
						<ToggleGroupItem value="resolutions">Resolutions</ToggleGroupItem>
						<ToggleGroupItem value="comments">Comments</ToggleGroupItem>
					</ToggleGroup>
				</div>
			</header>

			{events === undefined ? (
				<div className="mt-10 border border-rule">
					{Array.from({ length: 5 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						<Skeleton key={i} className="ledger-row h-16 w-full" />
					))}
				</div>
			) : events.length === 0 ? (
				<div className="mt-12 border-rule border-y px-6 py-16 text-center">
					<Kicker>Quiet on the wire</Kicker>
					<p className="mx-auto mt-3 max-w-sm text-bone-2 text-sm">
						Trades, comments, and resolutions land here in real time. Nothing's
						happened yet.
					</p>
				</div>
			) : (
				<ol className="mt-10 border border-rule">
					{events.map((e) => (
						<li key={e._id}>
							<EventRow event={e} />
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
		<div className="ledger-row grid grid-cols-[auto_auto_1fr_auto] items-start gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
			<KindMark kind={event.kind} />
			<span className="font-bold font-mono text-bone-3 text-xs tabular-nums leading-6">
				{ticketId(event.ticketSlug)}
			</span>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					{event.kind !== "resolve" && (
						<Link
							to="/profile/$username"
							params={{
								username: encodeURIComponent(event.handle.replace(/^@/, "")),
							}}
							className="flex items-center gap-2 hover:text-brand"
						>
							<Avatar className="size-6 rounded-[2px]">
								<AvatarFallback className="rounded-[2px] bg-brand font-bold font-mono text-[10px] text-brand-foreground">
									{event.handle.charAt(1).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<span className="font-mono font-semibold text-bone group-hover:text-brand">
								{event.handle}
							</span>
						</Link>
					)}
					<EventVerb event={event} />
					<Link
						to="/ticket/$id"
						params={{ id: event.ticketSlug }}
						className="font-display font-semibold text-bone hover:text-brand"
					>
						{event.question}
					</Link>
				</div>
				{event.kind === "comment" && (
					<p className="mt-1.5 text-bone-2 text-sm leading-relaxed">
						{event.body}
					</p>
				)}
			</div>
			<span className="whitespace-nowrap font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
				{relativeTime(event.ts)}
			</span>
		</div>
	);
}

function EventVerb({ event }: { event: FeedEvent }) {
	if (event.kind === "trade") {
		return (
			<span className="font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
				{event.action === "sell" ? "sold" : "bought"}{" "}
				<Badge variant={event.side === "Yes" ? "yes" : "no"}>
					{event.side} {money(Math.abs(event.cost))}
				</Badge>{" "}
				@{" "}
				<span className="font-bold text-bone tabular-nums">
					{cents(event.price)}
				</span>
			</span>
		);
	}
	if (event.kind === "comment") {
		return (
			<span className="font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
				commented on
			</span>
		);
	}
	if (event.kind === "resolve") {
		return (
			<span className="font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
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

function KindMark({ kind }: { kind: FeedEvent["kind"] }) {
	const map: Record<string, { label: string; tone: string }> = {
		trade: { label: "TRD", tone: "border-brand/40 bg-brand-wash text-brand" },
		comment: { label: "MSG", tone: "border-rule bg-ink text-bone-2" },
		resolve: {
			label: "RES",
			tone: "border-magenta/40 bg-magenta-wash text-magenta",
		},
	};
	const m = map[kind] ?? {
		label: "···",
		tone: "border-rule bg-ink text-bone-2",
	};
	return (
		<div
			className={`grid h-7 w-12 shrink-0 place-items-center border font-bold font-mono text-[10px] uppercase tracking-[0.16em] ${m.tone}`}
		>
			{m.label}
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
