import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Check, Clock, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BracketChip, Kicker, marketId, Stat } from "@/components/console";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CURRENCY_SYMBOL, cents, money } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/profile/$username")({
	component: PublicProfilePage,
});

function PublicProfilePage() {
	const { username } = useParams({ from: "/profile/$username" });
	const handleParam = decodeURIComponent(username);
	const profile = useQuery(api.users.publicProfile, { handle: handleParam });
	const positions = useQuery(api.users.publicPositions, {
		handle: handleParam,
		limit: 25,
	});
	const trades = useQuery(api.users.publicTrades, {
		handle: handleParam,
		limit: 20,
	});
	const me = useQuery(api.users.me, {});

	if (profile === undefined) {
		return (
			<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
				<ProfileSkeleton />
			</main>
		);
	}

	if (profile === null) {
		return (
			<main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
				<BracketChip tone="danger">404 / NO SUCH TRADER</BracketChip>
				<h1 className="display-headline mt-6 text-4xl sm:text-5xl">
					Trader not found
				</h1>
				<p className="mt-3 text-bone-2">
					Nobody on Charles.market goes by{" "}
					<span className="font-mono text-bone">
						@{handleParam.replace(/^@/, "")}
					</span>
					.
				</p>
				<Button asChild className="mt-8">
					<Link to="/leaderboard">Browse the leaderboard</Link>
				</Button>
			</main>
		);
	}

	const isMine = me?.handle === profile.handle;
	const initial = profile.handle?.[1] ?? "?";
	const positive = profile.pnl >= 0;

	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<nav className="flex items-center gap-2 overflow-hidden whitespace-nowrap font-mono text-[11px] text-bone-3 uppercase tracking-[0.14em]">
				<Link to="/leaderboard" className="shrink-0 hover:text-brand">
					Leaderboard
				</Link>
				<span aria-hidden="true">/</span>
				<span className="text-bone">{profile.handle}</span>
				{isMine ? (
					<>
						<span aria-hidden="true">/</span>
						<span className="text-brand">You</span>
					</>
				) : null}
			</nav>

			<section className="mt-6 border border-rule bg-ink-2 p-6 sm:p-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
					<div className="flex items-center gap-5">
						<Avatar className="size-16 shrink-0 rounded-[4px] sm:size-20">
							{profile.image ? (
								<AvatarImage src={profile.image} alt="" />
							) : null}
							<AvatarFallback className="rounded-[4px] bg-brand font-display font-extrabold text-3xl text-brand-foreground">
								{initial.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<Kicker>{isMine ? "YOUR ACCOUNT" : "TRADER"}</Kicker>
							{isMine && me ? (
								<EditableHandle currentHandle={me.handle} />
							) : (
								<h1 className="display-headline mt-1 break-all text-3xl tracking-[-0.03em] sm:text-4xl">
									{profile.handle}
								</h1>
							)}
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<Badge>Trader</Badge>
								{profile.isAdmin ? <BracketChip>ADMIN</BracketChip> : null}
								<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
									Joined {formatJoined(profile.joinedAt)}
								</span>
							</div>
						</div>
					</div>
					<div className="flex flex-col items-start border-rule border-t pt-5 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-8">
						<div className="label">Lifetime P&L</div>
						<div
							className={cn(
								"mt-1 font-bold font-mono text-3xl tabular-nums sm:text-4xl",
								positive ? "text-brand" : "text-magenta"
							)}
						>
							{positive ? "+" : "−"}
							{CURRENCY_SYMBOL}
							{Math.round(Math.abs(profile.pnl)).toLocaleString()}
						</div>
						<div className="mt-1 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
							realized + unrealized
						</div>
					</div>
				</div>
			</section>

			{isMine && me ? (
				<section className="mt-6 border border-rule bg-ink-2 p-6">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<Kicker>PRIVATE · CASH ON HAND</Kicker>
							<div className="mt-2 font-bold font-mono text-3xl text-brand tabular-nums sm:text-4xl">
								{CURRENCY_SYMBOL}
								{Math.round(me.balance).toLocaleString()}
							</div>
							<div className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
								in play-money shekels · only visible to you
							</div>
						</div>
						<div className="flex gap-2">
							<Button asChild variant="outline" size="sm">
								<Link to="/portfolio">View portfolio</Link>
							</Button>
							<Button asChild size="sm">
								<Link to="/propose">
									<Plus /> New ticket
								</Link>
							</Button>
						</div>
					</div>
				</section>
			) : null}

			<section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-rule border-y py-6 sm:grid-cols-4">
				<Stat
					label="Realized"
					value={`${profile.realizedPnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(profile.realizedPnl)).toLocaleString()}`}
					tone={profile.realizedPnl >= 0 ? "brand" : "magenta"}
				/>
				<Stat
					label="Unrealized"
					value={`${profile.unrealizedPnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(profile.unrealizedPnl)).toLocaleString()}`}
					tone={profile.unrealizedPnl >= 0 ? "brand" : "magenta"}
				/>
				<Stat label="Volume" value={money(profile.volume)} />
				<Stat
					label="Win rate"
					value={`${Math.round(profile.winRate * 100)}%`}
					tone="brand"
				/>
			</section>

			<section className="mt-12">
				<div className="flex items-center justify-between border-rule border-b pb-3">
					<Kicker>OPEN POSITIONS</Kicker>
					<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
						{positions === undefined
							? "—"
							: `${positions.length} ${positions.length === 1 ? "position" : "positions"}`}
					</span>
				</div>
				{positions === undefined ? (
					<Skeleton className="mt-6 h-32 w-full" />
				) : positions.length === 0 ? (
					<div className="mt-6 border border-rule border-dashed py-12 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						No open positions.
					</div>
				) : (
					<>
						<ul className="mt-4 md:hidden">
							{positions.map((p) => (
								<li key={p._id} className="ledger-row space-y-2 px-3 py-3">
									<div className="flex items-start justify-between gap-2">
										<Link
											to="/ticket/$id"
											params={{ id: p.marketSlug }}
											className="flex-1 font-display font-semibold text-bone text-sm hover:text-brand"
										>
											{p.question}
										</Link>
										<Badge variant={p.side === "Yes" ? "yes" : "no"}>
											{p.side}
										</Badge>
									</div>
									<div className="grid grid-cols-3 gap-2 font-mono text-xs">
										<MobileStat label="SHARES" value={p.shares.toFixed(2)} />
										<MobileStat label="AVG" value={cents(p.avgPrice)} />
										<MobileStat
											label="P&L"
											value={`${p.pnl >= 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.round(Math.abs(p.pnl))}`}
											tone={p.pnl >= 0 ? "up" : "down"}
										/>
									</div>
								</li>
							))}
						</ul>
						<div className="mt-4 hidden border border-rule md:block">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="pl-4">ID</TableHead>
										<TableHead>Ticket</TableHead>
										<TableHead>Side</TableHead>
										<TableHead className="text-right">Shares</TableHead>
										<TableHead className="text-right">Avg</TableHead>
										<TableHead className="text-right">Now</TableHead>
										<TableHead className="pr-4 text-right">P&L</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{positions.map((p) => (
										<TableRow key={p._id}>
											<TableCell className="pl-4 font-bold font-mono text-bone-3 text-xs">
												{marketId(p.marketSlug)}
											</TableCell>
											<TableCell>
												<Link
													to="/ticket/$id"
													params={{ id: p.marketSlug }}
													className="font-display font-semibold text-bone hover:text-brand"
												>
													{p.question}
												</Link>
											</TableCell>
											<TableCell>
												<Badge variant={p.side === "Yes" ? "yes" : "no"}>
													{p.side}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{p.shares.toFixed(2)}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{cents(p.avgPrice)}
											</TableCell>
											<TableCell className="text-right font-mono tabular-nums">
												{cents(p.current)}
											</TableCell>
											<TableCell
												className={cn(
													"pr-4 text-right font-bold font-mono tabular-nums",
													p.pnl >= 0 ? "text-brand" : "text-magenta"
												)}
											>
												{p.pnl >= 0 ? "+" : "−"}
												{CURRENCY_SYMBOL}
												{Math.round(Math.abs(p.pnl))}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</>
				)}
			</section>

			<section className="mt-12">
				<div className="flex items-center justify-between border-rule border-b pb-3">
					<Kicker>RECENT TRADES</Kicker>
					<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
						{trades === undefined
							? "—"
							: `${trades.length} ${trades.length === 1 ? "trade" : "trades"}`}
					</span>
				</div>
				{trades === undefined ? (
					<Skeleton className="mt-6 h-32 w-full" />
				) : trades.length === 0 ? (
					<div className="mt-6 border border-rule border-dashed py-12 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						No trades yet.
					</div>
				) : (
					<ul>
						{trades.map((t) => (
							<li
								key={t._id}
								className="ledger-row grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-3 sm:gap-5"
							>
								<span className="font-bold font-mono text-bone-3 text-xs tabular-nums">
									{marketId(t.marketSlug)}
								</span>
								<Link
									to="/ticket/$id"
									params={{ id: t.marketSlug }}
									className="line-clamp-1 font-display font-semibold text-bone text-sm hover:text-brand"
								>
									{t.question}
								</Link>
								<Badge variant={t.side === "Yes" ? "yes" : "no"}>
									{t.kind === "sell" ? "↓ " : ""}
									{t.side}
								</Badge>
								<div className="text-right">
									<div className="font-bold font-mono text-bone text-sm tabular-nums">
										{CURRENCY_SYMBOL}
										{Math.round(Math.abs(t.cost)).toLocaleString()}
									</div>
									<div className="font-mono text-[10px] text-bone-3 tabular-nums">
										@ {cents(t.price)}
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
				<div className="mt-6 flex justify-end">
					<Button asChild variant="outline" size="sm">
						<Link to="/activity">
							All site activity <ArrowRight />
						</Link>
					</Button>
				</div>
			</section>

			{isMine ? <MyProposals /> : null}
		</main>
	);
}

function EditableHandle({ currentHandle }: { currentHandle: string }) {
	const updateHandle = useMutation(api.users.updateHandle);
	const [draft, setDraft] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const save = async () => {
		if (draft == null) return;
		setSaving(true);
		try {
			const next = await updateHandle({ handle: draft });
			toast.success("Handle updated", { description: next });
			setDraft(null);
			// Bounce the URL to the new handle
			window.location.href = `/profile/${encodeURIComponent(next.replace(/^@/, ""))}`;
		} catch (err) {
			toast.error("Couldn't update handle", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	if (draft == null) {
		return (
			<div className="mt-1 flex items-center gap-2">
				<h1 className="display-headline break-all text-3xl tracking-[-0.03em] sm:text-4xl">
					{currentHandle}
				</h1>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setDraft(currentHandle)}
					aria-label="Edit handle"
				>
					<Pencil />
				</Button>
			</div>
		);
	}

	return (
		<div className="mt-2 flex flex-wrap items-center gap-2">
			<Input
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				className="mono-input h-9 w-48"
				maxLength={32}
				autoFocus
			/>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => setDraft(null)}
				disabled={saving}
				aria-label="Cancel"
			>
				<X />
			</Button>
			<Button
				variant="default"
				size="sm"
				onClick={save}
				disabled={saving}
				aria-label="Save handle"
			>
				<Check /> {saving ? "Saving…" : "Save"}
			</Button>
		</div>
	);
}

function MyProposals() {
	const proposals = useQuery(api.proposals.listMine, {});
	const remove = useMutation(api.proposals.remove);

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this proposal?")) return;
		try {
			await remove({ proposalId: id as never });
			toast.info("Proposal deleted");
		} catch (err) {
			toast.error("Couldn't delete", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<section className="mt-12 border border-rule bg-ink-2 p-6">
			<div className="flex items-center justify-between border-rule border-b pb-3">
				<div>
					<Kicker>PRIVATE · YOUR PROPOSALS</Kicker>
					<p className="mt-2 text-bone-2 text-sm">
						Tickets you've pitched. Approved ones go live; rejected ones show
						reviewer notes.
					</p>
				</div>
				<Button asChild size="sm">
					<Link to="/propose">
						<Plus /> New
					</Link>
				</Button>
			</div>
			<div className="mt-4">
				{proposals === undefined ? (
					<Skeleton className="h-24" />
				) : proposals.length === 0 ? (
					<div className="border border-rule border-dashed py-8 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						No proposals yet.{" "}
						<Link to="/propose" className="text-brand underline">
							Pitch your first ticket
						</Link>
					</div>
				) : (
					<ul>
						{proposals.map((p) => (
							<li
								key={p._id}
								className="ledger-row flex flex-wrap items-start justify-between gap-2 py-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
										<ProposalStatusBadge status={p.status} />
										<span className="text-bone-3">{p.category}</span>
									</div>
									<div className="mt-2 font-display font-semibold text-bone">
										{p.question}
									</div>
									{p.rejectionReason ? (
										<div className="mt-2 font-mono text-[11px] text-magenta uppercase tracking-[0.1em]">
											{p.rejectionReason}
										</div>
									) : null}
									{p.approvedMarketSlug ? (
										<Link
											to="/ticket/$id"
											params={{ id: p.approvedMarketSlug }}
											className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-brand uppercase tracking-[0.12em] hover:underline"
										>
											OPEN TICKET <ArrowRight className="size-3" />
										</Link>
									) : null}
								</div>
								{p.status !== "approved" ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(p._id)}
									>
										Delete
									</Button>
								) : null}
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}

function ProposalStatusBadge({
	status,
}: {
	status: "pending" | "approved" | "rejected";
}) {
	if (status === "pending")
		return (
			<Badge variant="outline">
				<Clock className="size-3" /> PENDING
			</Badge>
		);
	if (status === "approved") return <Badge variant="yes">APPROVED</Badge>;
	return <Badge variant="no">REJECTED</Badge>;
}

function MobileStat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "up" | "down";
}) {
	return (
		<div>
			<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
				{label}
			</div>
			<div
				className={cn(
					"font-bold font-mono text-sm tabular-nums",
					tone === "up" && "text-brand",
					tone === "down" && "text-magenta"
				)}
			>
				{value}
			</div>
		</div>
	);
}

function ProfileSkeleton() {
	return (
		<>
			<Skeleton className="h-4 w-48" />
			<Skeleton className="mt-6 h-36 w-full" />
			<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{Array.from({ length: 4 }, (_, i) => `prof-skel-${i}`).map((k) => (
					<div className="space-y-2" key={k}>
						<Skeleton className="h-3 w-20" />
						<Skeleton className="h-6 w-24" />
					</div>
				))}
			</div>
			<Skeleton className="mt-10 h-48 w-full" />
			<Skeleton className="mt-10 h-48 w-full" />
		</>
	);
}

function formatJoined(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
