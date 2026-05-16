import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Kicker } from "@/components/console";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CURRENCY_SYMBOL, money } from "@/lib/markets";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/leaderboard")({
	component: LeaderboardPage,
	head: () =>
		pageHead({
			title: "Leaderboard",
			description:
				"Top traders on Charles, ranked by lifetime P&L in shekels. Realized profit plus unrealized mark-to-market.",
			path: "/leaderboard",
		}),
});

const ranges = ["24h", "7d", "30d", "All"] as const;
type Range = (typeof ranges)[number];

function LeaderboardPage() {
	const [range, setRange] = useState<Range>("30d");
	const traders = useQuery(api.leaderboard.top, { limit: 25 });

	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<Kicker>LEADERBOARD</Kicker>
					<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
						Top traders
					</h1>
					<p className="mt-3 max-w-xl text-bone-2 text-sm sm:text-base">
						Ranked by lifetime P&L in shekels ({CURRENCY_SYMBOL}). Realized plus
						unrealized. Tap a handle to view their profile.
					</p>
				</div>
				<ToggleGroup
					type="single"
					value={range}
					onValueChange={(v) => v && setRange(v as Range)}
					className="self-start sm:self-auto"
				>
					{ranges.map((r) => (
						<ToggleGroupItem key={r} value={r}>
							{r}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</header>

			{traders === undefined ? (
				<LeaderboardSkeleton />
			) : traders.length === 0 ? (
				<div className="mt-12 border border-rule border-dashed bg-ink-2 py-12 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
					No traders yet. Sign in and place the first trade to claim the top
					spot.
				</div>
			) : (
				<>
					<section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
						{traders.slice(0, 3).map((t, i) => (
							<PodiumCard key={t._id} trader={t} place={i + 1} />
						))}
					</section>

					<section className="mt-10">
						<div className="border-rule border-b pb-3">
							<Kicker>FULL RANKING</Kicker>
						</div>
						<ul className="md:hidden">
							{traders.map((t, i) => (
								<li key={t._id} className="ledger-row">
									<Link
										to="/profile/$username"
										params={{ username: encodeHandle(t.handle) }}
										className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink-2"
									>
										<span className="w-6 shrink-0 font-bold font-mono text-bone-3 text-sm tabular-nums">
											{String(i + 1).padStart(2, "0")}
										</span>
										<TraderAvatar handle={t.handle} image={t.image} />
										<div className="min-w-0 flex-1">
											<div className="truncate font-mono font-semibold text-bone text-sm">
												{t.handle}
											</div>
											<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												{money(t.volume)} vol · {Math.round(t.winRate * 100)}%
												win
											</div>
										</div>
										<div
											className={cn(
												"text-right font-bold font-mono text-sm tabular-nums",
												t.pnl >= 0 ? "text-brand" : "text-magenta"
											)}
										>
											{t.pnl >= 0 ? "+" : "−"}
											{CURRENCY_SYMBOL}
											{Math.round(Math.abs(t.pnl)).toLocaleString()}
										</div>
									</Link>
								</li>
							))}
						</ul>
						<div className="mt-4 hidden border border-rule md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4">#</TableHead>
										<TableHead>Trader</TableHead>
										<TableHead className="text-right">P&L</TableHead>
										<TableHead className="text-right">Volume</TableHead>
										<TableHead className="text-right">Win rate</TableHead>
										<TableHead className="pr-4 text-right">Positions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{traders.map((t, i) => (
										<TableRow
											key={t._id}
											className="cursor-pointer transition-colors hover:bg-ink-3"
										>
											<TableCell className="pl-4 font-bold font-mono text-bone-3 tabular-nums">
												{String(i + 1).padStart(2, "0")}
											</TableCell>
											<TableCell>
												<Link
													to="/profile/$username"
													params={{ username: encodeHandle(t.handle) }}
													className="flex items-center gap-2 hover:text-brand"
												>
													<TraderAvatar handle={t.handle} image={t.image} />
													<span className="font-mono font-semibold text-bone">
														{t.handle}
													</span>
												</Link>
											</TableCell>
											<TableCell
												className={cn(
													"text-right font-bold font-mono tabular-nums",
													t.pnl >= 0 ? "text-brand" : "text-magenta"
												)}
											>
												{t.pnl >= 0 ? "+" : "−"}
												{CURRENCY_SYMBOL}
												{Math.round(Math.abs(t.pnl)).toLocaleString()}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{money(t.volume)}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{Math.round(t.winRate * 100)}%
											</TableCell>
											<TableCell className="pr-4 text-right font-mono tabular-nums">
												{t.positions}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</section>
				</>
			)}
		</main>
	);
}

type Trader = {
	_id: string;
	handle: string;
	name: string | null;
	image: string | null;
	pnl: number;
	volume: number;
	winRate: number;
	positions: number;
};

function PodiumCard({ trader, place }: { trader: Trader; place: number }) {
	const positive = trader.pnl >= 0;
	return (
		<Link
			to="/profile/$username"
			params={{ username: encodeHandle(trader.handle) }}
			className={cn(
				"flex items-center gap-4 border border-rule bg-ink-2 p-5 transition-colors hover:border-rule-bright",
				place === 1 && "border-brand bg-brand-wash hover:border-brand-deep"
			)}
		>
			<div
				className={cn(
					"flex h-12 w-12 shrink-0 items-center justify-center border font-bold font-mono text-2xl tabular-nums",
					place === 1
						? "border-brand bg-brand text-brand-foreground"
						: "border-rule bg-ink text-bone"
				)}
			>
				{place}
			</div>
			<TraderAvatar handle={trader.handle} image={trader.image} size="lg" />
			<div className="min-w-0 flex-1">
				<div className="truncate font-bold font-mono text-bone">
					{trader.handle}
				</div>
				<div
					className={cn(
						"font-bold font-mono text-sm tabular-nums",
						positive ? "text-brand" : "text-magenta"
					)}
				>
					{positive ? "+" : "−"}
					{CURRENCY_SYMBOL}
					{Math.round(Math.abs(trader.pnl)).toLocaleString()}
				</div>
				<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
					{Math.round(trader.winRate * 100)}% win
				</div>
			</div>
		</Link>
	);
}

function TraderAvatar({
	handle,
	image,
	size = "md",
}: {
	handle: string;
	image: string | null;
	size?: "md" | "lg";
}) {
	const letter = handle.replace("@", "").slice(0, 1).toUpperCase();
	return (
		<Avatar
			className={cn("rounded-[2px]", size === "lg" ? "size-10" : "size-8")}
		>
			{image ? <AvatarImage src={image} alt="" /> : null}
			<AvatarFallback className="rounded-[2px] bg-brand font-bold font-mono text-brand-foreground">
				{letter}
			</AvatarFallback>
		</Avatar>
	);
}

function encodeHandle(handle: string): string {
	return encodeURIComponent(handle.replace(/^@/, ""));
}

function LeaderboardSkeleton() {
	return (
		<>
			<div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }, (_, i) => `lb-skel-${i}`).map((k) => (
					<Skeleton key={k} className="h-24" />
				))}
			</div>
			<Skeleton className="mt-10 h-80" />
		</>
	);
}
