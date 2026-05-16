import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/leaderboard")({
	component: LeaderboardPage,
});

const ranges = ["24h", "7d", "30d", "All"] as const;
type Range = (typeof ranges)[number];

function LeaderboardPage() {
	const [range, setRange] = useState<Range>("30d");
	const traders = useQuery(api.leaderboard.top, { limit: 25 });

	return (
		<main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Leaderboard
					</h1>
					<p className="mt-1 text-muted-foreground text-sm sm:text-base">
						Top traders by P&L. Ranked in shekels ({CURRENCY_SYMBOL}).
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
			</div>

			{traders === undefined ? (
				<LeaderboardSkeleton />
			) : traders.length === 0 ? (
				<Card className="mt-8 border-dashed">
					<CardContent className="py-12 text-center text-muted-foreground">
						No traders yet. Sign in and place the first trade to claim the top
						spot.
					</CardContent>
				</Card>
			) : (
				<>
					<section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
						{traders.slice(0, 3).map((t, i) => (
							<PodiumCard key={t._id} trader={t} place={i + 1} />
						))}
					</section>

					<Card className="mt-8 gap-0 overflow-hidden py-0">
						<ul className="divide-y md:hidden">
							{traders.map((t, i) => (
								<li key={t._id} className="flex items-center gap-3 px-4 py-3">
									<span className="w-6 shrink-0 font-mono font-semibold text-muted-foreground text-sm">
										{i + 1}
									</span>
									<TraderAvatar handle={t.handle} image={t.image} />
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium text-sm">
											{t.handle}
										</div>
										<div className="text-muted-foreground text-xs">
											{money(t.volume)} vol · {Math.round(t.winRate * 100)}%
										</div>
									</div>
									<div
										className={cn(
											"text-right font-semibold text-sm",
											t.pnl >= 0 ? "text-yes" : "text-no"
										)}
									>
										{t.pnl >= 0 ? "+" : "−"}
										{CURRENCY_SYMBOL}
										{Math.round(Math.abs(t.pnl)).toLocaleString()}
									</div>
								</li>
							))}
						</ul>
						<div className="hidden md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-6">#</TableHead>
										<TableHead>Trader</TableHead>
										<TableHead className="text-right">P&L</TableHead>
										<TableHead className="text-right">Volume</TableHead>
										<TableHead className="text-right">Win rate</TableHead>
										<TableHead className="pr-6 text-right">Positions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{traders.map((t, i) => (
										<TableRow key={t._id}>
											<TableCell className="pl-6 font-mono font-semibold text-muted-foreground">
												{i + 1}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<TraderAvatar handle={t.handle} image={t.image} />
													<div>
														<div className="font-medium">{t.handle}</div>
														{t.name && (
															<div className="text-muted-foreground text-xs">
																{t.name}
															</div>
														)}
													</div>
												</div>
											</TableCell>
											<TableCell
												className={cn(
													"text-right font-semibold",
													t.pnl >= 0 ? "text-yes" : "text-no"
												)}
											>
												{t.pnl >= 0 ? "+" : "−"}
												{CURRENCY_SYMBOL}
												{Math.round(Math.abs(t.pnl)).toLocaleString()}
											</TableCell>
											<TableCell className="text-right">
												{money(t.volume)}
											</TableCell>
											<TableCell className="text-right">
												{Math.round(t.winRate * 100)}%
											</TableCell>
											<TableCell className="pr-6 text-right">
												{t.positions}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</Card>
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
	const medals = ["🥇", "🥈", "🥉"];
	return (
		<Card>
			<CardContent className="flex items-center gap-3">
				<div className="text-3xl">{medals[place - 1]}</div>
				<TraderAvatar handle={trader.handle} image={trader.image} size="lg" />
				<div className="min-w-0 flex-1">
					<div className="truncate font-semibold">{trader.handle}</div>
					<div
						className={cn("text-sm", trader.pnl >= 0 ? "text-yes" : "text-no")}
					>
						{trader.pnl >= 0 ? "+" : "−"}
						{CURRENCY_SYMBOL}
						{Math.round(Math.abs(trader.pnl)).toLocaleString()} ·{" "}
						{Math.round(trader.winRate * 100)}% win
					</div>
				</div>
			</CardContent>
		</Card>
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
		<Avatar className={size === "lg" ? "size-10" : "size-8"}>
			{image ? <AvatarImage src={image} alt="" /> : null}
			<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 font-semibold text-primary-foreground">
				{letter}
			</AvatarFallback>
		</Avatar>
	);
}

function LeaderboardSkeleton() {
	return (
		<>
			<div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
					<Skeleton key={i} className="h-20" />
				))}
			</div>
			<Skeleton className="mt-8 h-80" />
		</>
	);
}
