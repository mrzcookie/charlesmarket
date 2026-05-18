import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	Check,
	CheckCircle2,
	ExternalLink,
	Lock,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BracketChip, Kicker, marketId } from "@/components/console";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { CURRENCY_SYMBOL, categories, money } from "@/lib/markets";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/tickets")({
	component: TicketsPage,
});

// ----------------------------------------------------------------------------
// Unified row shape (markets + proposals merged)
// ----------------------------------------------------------------------------

type MarketRow = {
	kind: "market";
	id: string;
	createdAt: number;
	closesAtMs: number;
	closesAt: string;
	question: string;
	description: string;
	category: string;
	tags: string[];
	status: "open" | "closed" | "resolved";
	resolution?: "Yes" | "No";
	yesPrice: number;
	volume: number;
	liquidity: number;
	slug: string;
	marketId: Id<"markets">;
};

type ProposalRow = {
	kind: "proposal";
	id: string;
	createdAt: number;
	closesAtMs: number;
	closesAt: string;
	question: string;
	description: string;
	category: string;
	tags: string[];
	status: "pending" | "approved" | "rejected";
	proposalId: Id<"marketProposals">;
	proposerHandle: string;
	rejectionReason?: string;
	approvedMarketSlug?: string;
	initialYesPrice: number;
	initialLiquidity: number;
};

type Row = MarketRow | ProposalRow;

function TicketsPage() {
	const markets = useQuery(api.admin.listAll, {});
	const proposals = useQuery(api.proposals.listAll, {});

	const [createOpen, setCreateOpen] = useState(false);
	const [bellOpen, setBellOpen] = useState(false);
	const [drawerRow, setDrawerRow] = useState<Row | null>(null);
	const [filter, setFilter] = useState<
		"all" | "open" | "closed" | "resolved" | "pending"
	>("all");
	const [query, setQuery] = useState("");

	const rows = useMemo<Row[]>(() => {
		const marketRows: MarketRow[] = (markets ?? []).map((m) => ({
			kind: "market",
			id: m._id,
			createdAt: m.createdAt,
			closesAtMs: m.closesAtMs,
			closesAt: m.closesAt,
			question: m.question,
			description: m.description,
			category: m.category,
			tags: m.tags,
			status: m.status,
			resolution: m.resolution,
			yesPrice: m.yesPrice,
			volume: m.volume,
			liquidity: m.liquidity,
			slug: m.slug,
			marketId: m._id,
		}));
		const proposalRows: ProposalRow[] = (proposals ?? [])
			.filter((p) => p.status !== "approved")
			.map((p) => ({
				kind: "proposal",
				id: p._id,
				createdAt: p._creationTime,
				closesAtMs: p.closesAtMs,
				closesAt: p.closesAt,
				question: p.question,
				description: p.description,
				category: p.category,
				tags: p.tags,
				status: p.status,
				proposalId: p._id,
				proposerHandle: p.proposerHandle,
				rejectionReason: p.rejectionReason,
				approvedMarketSlug: p.approvedMarketSlug,
				initialYesPrice: p.initialYesPrice,
				initialLiquidity: p.initialLiquidity,
			}));
		return [...proposalRows, ...marketRows].sort(
			(a, b) => b.createdAt - a.createdAt
		);
	}, [markets, proposals]);

	const pendingProposals = useMemo(
		() =>
			rows.filter(
				(r): r is ProposalRow => r.kind === "proposal" && r.status === "pending"
			),
		[rows]
	);
	const endedMarkets = useMemo(() => {
		const now = Date.now();
		return rows.filter(
			(r): r is MarketRow =>
				r.kind === "market" &&
				((r.status === "open" && r.closesAtMs < now) || r.status === "closed")
		);
	}, [rows]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return rows.filter((r) => {
			if (filter !== "all" && r.status !== filter) return false;
			if (!q) return true;
			return (
				r.question.toLowerCase().includes(q) ||
				r.tags.some((t) => t.toLowerCase().includes(q))
			);
		});
	}, [rows, filter, query]);

	const isLoading = markets === undefined || proposals === undefined;
	const notificationCount = pendingProposals.length + endedMarkets.length;

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<Kicker>TICKETS & PROPOSALS</Kicker>
					<h1 className="display-headline mt-2 text-3xl sm:text-4xl">
						Ticket management
					</h1>
					<p className="mt-2 max-w-xl text-bone-2 text-sm">
						Approve proposals, resolve tickets, and edit everything.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						className="relative"
						onClick={() => setBellOpen(true)}
						title={`${notificationCount} pending actions`}
						aria-label="Notifications"
					>
						<Bell />
						{notificationCount > 0 ? (
							<span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 font-bold font-mono text-[10px] text-brand-foreground tabular-nums">
								{notificationCount > 99 ? "99" : notificationCount}
							</span>
						) : null}
					</Button>
					<Button onClick={() => setCreateOpen(true)}>
						<Plus /> Create ticket
					</Button>
				</div>
			</header>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
					<div className="flex gap-2">
						{(
							[
								["all", "All"],
								["pending", "Pending"],
								["open", "Open"],
								["closed", "Closed"],
								["resolved", "Resolved"],
							] as const
						).map(([value, label]) => (
							<Toggle
								key={value}
								variant="outline"
								size="sm"
								pressed={filter === value}
								onPressedChange={(on) => on && setFilter(value)}
							>
								{label}
							</Toggle>
						))}
					</div>
				</div>
				<div className="relative max-w-xs">
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
					<Input
						type="search"
						placeholder="Search questions or tags…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 6 }, (_, i) => `ticket-skel-${i}`).map((k) => (
						<Skeleton key={k} className="h-14 w-full" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<div className="space-y-4 border border-rule border-dashed bg-ink-2 px-6 py-12 text-center">
					<Kicker>{rows.length === 0 ? "EMPTY" : "NO MATCHES"}</Kicker>
					<p className="font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						{rows.length === 0
							? "No tickets in the system yet. Create the first one."
							: "Nothing matches the current filter or search."}
					</p>
					{rows.length === 0 ? (
						<Button size="sm" onClick={() => setCreateOpen(true)}>
							<Plus /> Create ticket
						</Button>
					) : null}
				</div>
			) : (
				<>
					<div className="hidden border border-rule md:block">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="pl-4">Type</TableHead>
									<TableHead>Question</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Yes</TableHead>
									<TableHead className="text-right">Volume</TableHead>
									<TableHead className="pr-4 text-right">Closes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((row) => (
									<TableRow
										key={row.id}
										className="cursor-pointer transition-colors hover:bg-ink-3"
										onClick={() => setDrawerRow(row)}
									>
										<TableCell className="pl-4">
											<RowTypeChip row={row} />
										</TableCell>
										<TableCell>
											<div className="font-display font-semibold text-bone">
												{row.question}
											</div>
											<div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												<span>{row.category}</span>
												{row.kind === "proposal" ? (
													<>
														<span>·</span>
														<span>by {row.proposerHandle}</span>
													</>
												) : null}
												{row.kind === "market" ? (
													<>
														<span>·</span>
														<span>{marketId(row.slug)}</span>
													</>
												) : null}
											</div>
										</TableCell>
										<TableCell>
											<StatusBadge row={row} />
										</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{row.kind === "market"
												? `${CURRENCY_SYMBOL}${Math.round(row.yesPrice * 100)}`
												: "—"}
										</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{row.kind === "market" ? money(row.volume) : "—"}
										</TableCell>
										<TableCell className="pr-4 text-right font-mono text-xs">
											{relativeFromNow(row.closesAtMs)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<ul className="space-y-2 md:hidden">
						{filtered.map((row) => (
							<li key={row.id}>
								<button
									type="button"
									onClick={() => setDrawerRow(row)}
									className="w-full border border-rule bg-ink-2 p-4 text-left transition-colors hover:border-rule-bright"
								>
									<div className="flex items-center justify-between gap-2">
										<RowTypeChip row={row} />
										<StatusBadge row={row} />
									</div>
									<div className="mt-3 font-display font-semibold text-bone text-sm">
										{row.question}
									</div>
									<div className="mt-2 flex items-center justify-between font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
										<span>{row.category}</span>
										<span>{relativeFromNow(row.closesAtMs)}</span>
									</div>
								</button>
							</li>
						))}
					</ul>
				</>
			)}

			<NotificationsSheet
				open={bellOpen}
				onOpenChange={setBellOpen}
				pendingProposals={pendingProposals}
				endedMarkets={endedMarkets}
				onOpenRow={(row) => {
					setBellOpen(false);
					setDrawerRow(row);
				}}
			/>

			<TicketDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create ticket</DialogTitle>
						<DialogDescription>
							Skip the proposal flow. Use for editorial picks or trusted
							tickets.
						</DialogDescription>
					</DialogHeader>
					<CreateTicketForm onSuccess={() => setCreateOpen(false)} />
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Notifications sheet
// ----------------------------------------------------------------------------

function NotificationsSheet({
	open,
	onOpenChange,
	pendingProposals,
	endedMarkets,
	onOpenRow,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pendingProposals: ProposalRow[];
	endedMarkets: MarketRow[];
	onOpenRow: (row: Row) => void;
}) {
	const total = pendingProposals.length + endedMarkets.length;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full max-w-md overflow-y-auto bg-ink"
			>
				<SheetHeader className="border-rule border-b">
					<SheetTitle className="flex items-center gap-2 font-bold font-display">
						<Bell className="size-4 text-brand" />
						Notifications
					</SheetTitle>
					<SheetDescription>
						{total === 0
							? "Inbox zero. Nothing needs you."
							: `${total} ${total === 1 ? "item needs" : "items need"} your attention.`}
					</SheetDescription>
				</SheetHeader>

				{total === 0 ? (
					<div className="mt-8 border border-rule border-dashed bg-ink-2 px-6 py-12 text-center">
						<div
							className="bracket-chip mx-auto inline-flex"
							data-tone="neutral"
						>
							ALL CLEAR
						</div>
						<h3 className="display-headline mt-3 text-xl">Nothing pending.</h3>
						<p className="mt-2 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
							Proposals approved, tickets resolved.
						</p>
					</div>
				) : (
					<div className="mt-4 space-y-8">
						<section>
							<div className="flex items-baseline justify-between border-rule border-b pb-2">
								<Kicker>PROPOSALS · AWAITING REVIEW</Kicker>
								<span className="font-mono text-[11px] text-bone-3 tabular-nums">
									{pendingProposals.length}
								</span>
							</div>
							{pendingProposals.length === 0 ? (
								<div className="mt-3 border border-rule border-dashed py-6 text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
									Nothing pending.
								</div>
							) : (
								<ul className="mt-3 space-y-3">
									{pendingProposals.map((p) => (
										<li
											key={p.proposalId}
											className="border border-rule bg-ink-2 p-3"
										>
											<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												{p.category} · by {p.proposerHandle}
											</div>
											<div className="mt-1 font-display font-semibold text-bone text-sm">
												{p.question}
											</div>
											{p.description ? (
												<p className="mt-2 line-clamp-2 text-bone-2 text-xs">
													{p.description}
												</p>
											) : null}
											<div className="mt-3 flex gap-2">
												<InlineApprove proposalId={p.proposalId} />
												<InlineReject proposalId={p.proposalId} />
												<Button
													variant="ghost"
													size="sm"
													className="ml-auto"
													onClick={() => onOpenRow(p)}
												>
													Edit
												</Button>
											</div>
										</li>
									))}
								</ul>
							)}
						</section>

						<section>
							<div className="flex items-baseline justify-between border-rule border-b pb-2">
								<Kicker>TICKETS · AWAITING RESOLUTION</Kicker>
								<span className="font-mono text-[11px] text-bone-3 tabular-nums">
									{endedMarkets.length}
								</span>
							</div>
							{endedMarkets.length === 0 ? (
								<div className="mt-3 border border-rule border-dashed py-6 text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
									All tickets are up to date.
								</div>
							) : (
								<ul className="mt-3 space-y-3">
									{endedMarkets.map((m) => (
										<li
											key={m.marketId}
											className="border border-rule bg-ink-2 p-3"
										>
											<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												{marketId(m.slug)} · {m.category}
											</div>
											<div className="mt-1 font-display font-semibold text-bone text-sm">
												{m.question}
											</div>
											<div className="mt-2 font-mono text-[11px] text-bone-2 uppercase tracking-[0.12em]">
												CLOSED · last yes {CURRENCY_SYMBOL}
												{Math.round(m.yesPrice * 100)}
											</div>
											<div className="mt-3 flex gap-2">
												<InlineResolve marketId={m.marketId} side="Yes" />
												<InlineResolve marketId={m.marketId} side="No" />
												<Button
													variant="ghost"
													size="sm"
													className="ml-auto"
													onClick={() => onOpenRow(m)}
												>
													Open
												</Button>
											</div>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

function InlineApprove({ proposalId }: { proposalId: Id<"marketProposals"> }) {
	const approve = useMutation(api.proposals.approve);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="yes"
			size="sm"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await approve({ proposalId });
					toast.success("Proposal approved");
				} catch (err) {
					toast.error("Approve failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<Check /> Approve
		</Button>
	);
}

function InlineReject({ proposalId }: { proposalId: Id<"marketProposals"> }) {
	const reject = useMutation(api.proposals.reject);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="no-soft"
			size="sm"
			disabled={busy}
			onClick={async () => {
				const reason = prompt("Rejection reason (optional)") ?? undefined;
				setBusy(true);
				try {
					await reject({ proposalId, reason });
					toast.success("Proposal rejected");
				} catch (err) {
					toast.error("Reject failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<X /> Reject
		</Button>
	);
}

function InlineResolve({
	marketId,
	side,
}: {
	marketId: Id<"markets">;
	side: "Yes" | "No";
}) {
	const resolve = useMutation(api.admin.resolveMarket);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant={side === "Yes" ? "yes" : "no"}
			size="sm"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await resolve({ marketId, resolution: side });
					toast.success(`Resolved ${side}`);
				} catch (err) {
					toast.error("Resolve failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			{side === "Yes" ? <CheckCircle2 /> : <XCircle />} Resolve {side}
		</Button>
	);
}

// ----------------------------------------------------------------------------
// Per-ticket edit drawer
// ----------------------------------------------------------------------------

function TicketDrawer({
	row,
	onClose,
}: {
	row: Row | null;
	onClose: () => void;
}) {
	return (
		<Sheet open={row != null} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="right"
				className="w-full max-w-xl overflow-y-auto bg-ink"
			>
				{row ? (
					<TicketDrawerBody key={row.id} row={row} onClose={onClose} />
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function TicketDrawerBody({ row, onClose }: { row: Row; onClose: () => void }) {
	const [question, setQuestion] = useState(row.question);
	const [description, setDescription] = useState(row.description);
	const [category, setCategory] = useState(row.category);
	const [tags, setTags] = useState(row.tags.join(", "));
	const [closesAtMs, setClosesAtMs] = useState(row.closesAtMs);
	const [closesAtLabel, setClosesAtLabel] = useState(row.closesAt);
	const [saving, setSaving] = useState(false);

	const updateMarket = useMutation(api.admin.updateMarket);

	const handleSave = async () => {
		if (row.kind !== "market") return;
		setSaving(true);
		try {
			await updateMarket({
				marketId: row.marketId,
				question: question.trim(),
				description: description.trim(),
				category,
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				closesAt: closesAtLabel.trim() || row.closesAt,
				closesAtMs,
			});
			toast.success("Ticket saved");
			onClose();
		} catch (err) {
			toast.error("Save failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSaving(false);
		}
	};

	const dirty =
		row.kind === "market" &&
		(question !== row.question ||
			description !== row.description ||
			category !== row.category ||
			tags !== row.tags.join(", ") ||
			closesAtMs !== row.closesAtMs ||
			closesAtLabel !== row.closesAt);

	return (
		<>
			<SheetHeader className="border-rule border-b">
				<div className="flex items-center justify-between gap-2">
					<RowTypeChip row={row} />
					<StatusBadge row={row} />
				</div>
				<SheetTitle className="font-display text-base leading-snug">
					{row.question}
				</SheetTitle>
				<SheetDescription>
					{row.kind === "market"
						? `${marketId(row.slug)} · ${row.category}`
						: `Submitted by ${row.proposerHandle} · ${row.category}`}
				</SheetDescription>
			</SheetHeader>

			{row.kind === "proposal" ? (
				<section className="mt-5 border border-rule bg-ink-2 p-4">
					<Kicker>PROPOSAL ACTIONS</Kicker>
					{row.description ? (
						<p className="mt-3 whitespace-pre-line text-bone-2 text-sm leading-relaxed">
							{row.description}
						</p>
					) : null}
					<div className="mt-3 grid grid-cols-2 gap-3 border-rule border-t pt-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
						<div>
							<div className="text-bone-3">Starting Yes</div>
							<div className="mt-0.5 font-bold text-bone tabular-nums">
								{CURRENCY_SYMBOL}
								{Math.round(row.initialYesPrice * 100)}
							</div>
						</div>
						<div>
							<div className="text-bone-3">Liquidity</div>
							<div className="mt-0.5 font-bold text-bone tabular-nums">
								{money(row.initialLiquidity)}
							</div>
						</div>
					</div>
					<div className="mt-4 space-y-2">
						<ApproveButton
							proposalId={row.proposalId}
							onDone={onClose}
							className="w-full"
						/>
						<div className="grid grid-cols-2 gap-2">
							<RejectButton proposalId={row.proposalId} onDone={onClose} />
							<DeleteProposalButton
								proposalId={row.proposalId}
								onDone={onClose}
							/>
						</div>
					</div>
					{row.rejectionReason ? (
						<div className="mt-3 border border-magenta/40 bg-magenta-wash p-3 font-mono text-[11px] text-magenta uppercase tracking-[0.1em]">
							{row.rejectionReason}
						</div>
					) : null}
				</section>
			) : (
				<section className="mt-5 border border-rule bg-ink-2 p-4">
					<Kicker>MARKET ACTIONS</Kicker>
					<MarketActionButtons row={row} onDone={onClose} />
				</section>
			)}

			{row.kind === "market" ? (
				<section className="mt-5">
					<div className="border-rule border-b pb-3">
						<Kicker>EDIT</Kicker>
					</div>
					<div className="mt-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="td-question">Question</Label>
							<Input
								id="td-question"
								value={question}
								onChange={(e) => setQuestion(e.target.value)}
								maxLength={140}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="td-description">Description</Label>
							<Textarea
								id="td-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								maxLength={1_000}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="td-category">Category</Label>
								<Select value={category} onValueChange={setCategory}>
									<SelectTrigger id="td-category">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{categories.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="td-tags">Tags</Label>
								<Input
									id="td-tags"
									value={tags}
									onChange={(e) => setTags(e.target.value)}
									placeholder="weekend, chaos"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="td-closes">Closes at</Label>
								<Input
									id="td-closes"
									type="datetime-local"
									value={toLocalDatetime(closesAtMs)}
									onChange={(e) =>
										setClosesAtMs(fromLocalDatetime(e.target.value))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="td-closes-label">Display label</Label>
								<Input
									id="td-closes-label"
									value={closesAtLabel}
									onChange={(e) => setClosesAtLabel(e.target.value)}
									placeholder="e.g. 'Fri 9:00 PM'"
								/>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2 border-rule border-t pt-4">
							<Button onClick={handleSave} disabled={!dirty || saving}>
								<Pencil /> {saving ? "Saving…" : "Save changes"}
							</Button>
							<Button asChild variant="outline">
								<Link to="/ticket/$id" params={{ id: row.slug }}>
									<ExternalLink /> View
								</Link>
							</Button>
						</div>
					</div>
				</section>
			) : null}
		</>
	);
}

function ApproveButton({
	proposalId,
	onDone,
	className,
}: {
	proposalId: Id<"marketProposals">;
	onDone: () => void;
	className?: string;
}) {
	const approve = useMutation(api.proposals.approve);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="yes"
			className={className}
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await approve({ proposalId });
					toast.success("Proposal approved");
					onDone();
				} catch (err) {
					toast.error("Approve failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<Check /> {busy ? "Approving…" : "Approve & open"}
		</Button>
	);
}

function RejectButton({
	proposalId,
	onDone,
}: {
	proposalId: Id<"marketProposals">;
	onDone: () => void;
}) {
	const reject = useMutation(api.proposals.reject);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="no-soft"
			disabled={busy}
			onClick={async () => {
				const reason = prompt("Rejection reason (optional)") ?? undefined;
				setBusy(true);
				try {
					await reject({ proposalId, reason });
					toast.info("Proposal rejected");
					onDone();
				} catch (err) {
					toast.error("Reject failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<X /> Reject
		</Button>
	);
}

function DeleteProposalButton({
	proposalId,
	onDone,
}: {
	proposalId: Id<"marketProposals">;
	onDone: () => void;
}) {
	const remove = useMutation(api.proposals.remove);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="ghost"
			className="text-magenta hover:bg-magenta-wash hover:text-magenta"
			disabled={busy}
			onClick={async () => {
				if (!confirm("Delete this proposal permanently?")) return;
				setBusy(true);
				try {
					await remove({ proposalId });
					toast.info("Proposal deleted");
					onDone();
				} catch (err) {
					toast.error("Delete failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<Trash2 /> Delete
		</Button>
	);
}

function MarketActionButtons({
	row,
	onDone,
}: {
	row: MarketRow;
	onDone: () => void;
}) {
	const closeMarket = useMutation(api.admin.closeMarket);
	const reopenMarket = useMutation(api.admin.reopenMarket);
	const resolveMarket = useMutation(api.admin.resolveMarket);
	const deleteMarket = useMutation(api.admin.deleteMarket);
	const [busy, setBusy] = useState(false);

	const run = async (action: () => Promise<unknown>, success: string) => {
		setBusy(true);
		try {
			await action();
			toast.success(success);
			onDone();
		} catch (err) {
			toast.error("Action failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mt-3 grid grid-cols-2 gap-2">
			{row.status === "open" ? (
				<Button
					variant="secondary"
					disabled={busy}
					onClick={() =>
						run(() => closeMarket({ marketId: row.marketId }), "Ticket closed")
					}
				>
					<Lock /> Close
				</Button>
			) : null}
			{row.status === "closed" ? (
				<Button
					variant="secondary"
					disabled={busy}
					onClick={() =>
						run(
							() => reopenMarket({ marketId: row.marketId }),
							"Ticket reopened"
						)
					}
				>
					<RefreshCw /> Reopen
				</Button>
			) : null}
			{row.status !== "resolved" ? (
				<>
					<Button
						variant="yes"
						disabled={busy}
						onClick={() =>
							run(
								() => resolveMarket({ marketId: row.marketId, resolution: "Yes" }),
								"Resolved Yes"
							)
						}
					>
						<CheckCircle2 /> Resolve Yes
					</Button>
					<Button
						variant="no"
						disabled={busy}
						onClick={() =>
							run(
								() => resolveMarket({ marketId: row.marketId, resolution: "No" }),
								"Resolved No"
							)
						}
					>
						<XCircle /> Resolve No
					</Button>
				</>
			) : null}
			<Button
				variant="ghost"
				className="col-span-2 text-magenta hover:bg-magenta-wash hover:text-magenta"
				disabled={busy}
				onClick={() => {
					if (!confirm(`Delete this ticket permanently? "${row.question}"`))
						return;
					run(() => deleteMarket({ marketId: row.marketId }), "Ticket deleted");
				}}
			>
				<Trash2 /> Delete ticket
			</Button>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Row-type chip and status badge
// ----------------------------------------------------------------------------

function RowTypeChip({ row }: { row: Row }) {
	if (row.kind === "proposal") {
		return (
			<span className="inline-flex items-center border border-rule bg-ink-2 px-2 py-0.5 font-bold font-mono text-[10px] text-bone-2 uppercase tracking-[0.14em]">
				PROPOSAL
			</span>
		);
	}
	return (
		<span className="inline-flex items-center border border-rule bg-ink-2 px-2 py-0.5 font-bold font-mono text-[10px] text-bone-2 uppercase tracking-[0.14em]">
			TICKET
		</span>
	);
}

function StatusBadge({ row }: { row: Row }) {
	if (row.kind === "proposal") {
		if (row.status === "pending") {
			return <BracketChip pulse>PENDING</BracketChip>;
		}
		if (row.status === "rejected") {
			return <BracketChip tone="danger">REJECTED</BracketChip>;
		}
		return <BracketChip>APPROVED</BracketChip>;
	}
	if (row.status === "open") {
		const overdue = row.closesAtMs < Date.now();
		return overdue ? (
			<BracketChip tone="danger">OVERDUE</BracketChip>
		) : (
			<BracketChip pulse>OPEN</BracketChip>
		);
	}
	if (row.status === "closed") {
		return <BracketChip tone="neutral">CLOSED</BracketChip>;
	}
	return (
		<Badge variant={row.resolution === "Yes" ? "yes" : "no"}>
			RESOLVED {row.resolution}
		</Badge>
	);
}

// ----------------------------------------------------------------------------
// Create form (kept close to the existing one)
// ----------------------------------------------------------------------------

function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
	const create = useMutation(api.admin.createMarket);
	const [question, setQuestion] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("Antics");
	const [tagInput, setTagInput] = useState("");
	const [customAt, setCustomAt] = useState(() =>
		toLocalDatetime(Date.now() + 7 * 86_400_000)
	);
	const [closesAtLabel, setClosesAtLabel] = useState("");
	const [yesPrice, setYesPrice] = useState(0.5);
	const [liquidity, setLiquidity] = useState(2_000);
	const [slug, setSlug] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const closesAtMs = useMemo(() => fromLocalDatetime(customAt), [customAt]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			const tags = tagInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			const r = await create({
				question: question.trim(),
				description: description.trim(),
				category,
				tags,
				closesAt:
					closesAtLabel.trim() ||
					new Date(closesAtMs).toLocaleDateString([], {
						month: "short",
						day: "numeric",
					}),
				closesAtMs,
				initialYesPrice: yesPrice,
				initialLiquidity: liquidity,
				slugOverride: slug.trim() || undefined,
			});
			toast.success("Ticket created", { description: `/ticket/${r.slug}` });
			onSuccess();
		} catch (err) {
			toast.error("Create failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-2">
				<Label htmlFor="cm-question">Question</Label>
				<Input
					id="cm-question"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="Will Charles…?"
					maxLength={140}
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="cm-description">Description</Label>
				<Textarea
					id="cm-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					maxLength={1_000}
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2">
					<Label htmlFor="cm-cat">Category</Label>
					<Select value={category} onValueChange={setCategory}>
						<SelectTrigger id="cm-cat">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{categories.map((c) => (
								<SelectItem key={c} value={c}>
									{c}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="cm-tags">Tags</Label>
					<Input
						id="cm-tags"
						value={tagInput}
						onChange={(e) => setTagInput(e.target.value)}
						placeholder="weekend, chaos"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2">
					<Label htmlFor="cm-closes">Closes at</Label>
					<Input
						id="cm-closes"
						type="datetime-local"
						value={customAt}
						onChange={(e) => setCustomAt(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="cm-closes-label">Display label</Label>
					<Input
						id="cm-closes-label"
						value={closesAtLabel}
						onChange={(e) => setClosesAtLabel(e.target.value)}
						placeholder="Fri 9:00 PM"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2">
					<Label htmlFor="cm-yes">
						Starting Yes ({CURRENCY_SYMBOL}
						{Math.round(yesPrice * 100)})
					</Label>
					<input
						id="cm-yes"
						type="range"
						min={0.02}
						max={0.98}
						step={0.01}
						value={yesPrice}
						onChange={(e) => setYesPrice(Number(e.target.value))}
						className="mt-2 w-full accent-brand"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="cm-liq">Initial liquidity</Label>
					<Input
						id="cm-liq"
						type="number"
						min={100}
						max={50_000}
						step={50}
						value={liquidity}
						onChange={(e) => setLiquidity(Number(e.target.value))}
						className="mono-input"
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="cm-slug">Slug (optional)</Label>
				<Input
					id="cm-slug"
					value={slug}
					onChange={(e) => setSlug(e.target.value)}
					placeholder="auto-generated"
					className="mono-input"
				/>
			</div>
			<DialogFooter>
				<Button type="submit" disabled={submitting}>
					{submitting ? (
						"Creating…"
					) : (
						<>
							<Plus /> Create ticket
						</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function toLocalDatetime(ms: number): string {
	const d = new Date(ms);
	const off = d.getTimezoneOffset() * 60_000;
	return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromLocalDatetime(s: string): number {
	const ms = new Date(s).getTime();
	return Number.isFinite(ms) ? ms : Date.now();
}

function relativeFromNow(ms: number): string {
	const diff = ms - Date.now();
	const abs = Math.abs(diff);
	const day = 86_400_000;
	const hour = 3_600_000;
	const min = 60_000;
	const sign = diff < 0 ? "-" : "";
	if (abs >= day) return `${sign}${Math.round(abs / day)}d`;
	if (abs >= hour) return `${sign}${Math.round(abs / hour)}h`;
	if (abs >= min) return `${sign}${Math.round(abs / min)}m`;
	return "now";
}
