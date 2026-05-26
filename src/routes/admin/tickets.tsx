import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	Bell,
	CheckCircle2,
	ExternalLink,
	Lock,
	Pencil,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BracketChip, Kicker, ticketId } from "@/components/console";
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
import { CURRENCY_SYMBOL, money } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/tickets")({
	component: TicketsPage,
});

type Row = {
	id: Id<"tickets">;
	createdAt: number;
	closesAtMs: number;
	closesAt: string;
	question: string;
	description: string;
	tags: string[];
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: "Yes" | "No";
	yesPrice: number;
	volume: number;
	liquidity: number;
	slug: string;
	subject: {
		name: string;
		_id?: Id<"users">;
		handle?: string;
		image?: string | null;
	} | null;
	creator: {
		_id: Id<"users">;
		handle: string;
		name: string | null;
		image: string | null;
	} | null;
};

function TicketsPage() {
	const tickets = useQuery(api.admin.listAll, {});
	const pendingReports = useQuery(api.reports.listPending, {});

	const [createOpen, setCreateOpen] = useState(false);
	const [bellOpen, setBellOpen] = useState(false);
	const [drawerRow, setDrawerRow] = useState<Row | null>(null);
	const [filter, setFilter] = useState<
		"all" | "open" | "closed" | "resolved" | "cancelled"
	>("all");
	const [query, setQuery] = useState("");

	const rows = useMemo<Row[]>(() => {
		return (tickets ?? [])
			.map((m) => ({
				id: m._id,
				createdAt: m.createdAt,
				closesAtMs: m.closesAtMs,
				closesAt: m.closesAt,
				question: m.question,
				description: m.description,
				tags: m.tags,
				status: m.status,
				resolution: m.resolution,
				yesPrice: m.yesPrice,
				volume: m.volume,
				liquidity: m.liquidity,
				slug: m.slug,
				subject: m.subject ?? null,
				creator: m.creator ?? null,
			}))
			.sort((a, b) => b.createdAt - a.createdAt);
	}, [tickets]);

	const endedTickets = useMemo(() => {
		const now = Date.now();
		return rows.filter(
			(r) =>
				(r.status === "open" && r.closesAtMs < now) || r.status === "closed"
		);
	}, [rows]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return rows.filter((r) => {
			if (filter !== "all" && r.status !== filter) return false;
			if (!q) return true;
			return (
				r.question.toLowerCase().includes(q) ||
				r.tags.some((t) => t.toLowerCase().includes(q)) ||
				(r.subject?.handle ?? "").toLowerCase().includes(q) ||
				(r.subject?.name ?? "").toLowerCase().includes(q)
			);
		});
	}, [rows, filter, query]);

	const isLoading = tickets === undefined;
	const notificationCount = endedTickets.length + (pendingReports?.length ?? 0);

	const stats = useMemo(() => {
		const totals = {
			total: rows.length,
			open: 0,
			closed: 0,
			resolved: 0,
			cancelled: 0,
			volume: 0,
			openInterest: 0,
		};
		for (const r of rows) {
			totals[r.status] += 1;
			totals.volume += r.volume;
			totals.openInterest += r.liquidity;
		}
		return totals;
	}, [rows]);

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<Kicker>TICKETS</Kicker>
					<h1 className="display-headline mt-2 text-3xl sm:text-4xl">
						Ticket management
					</h1>
					<p className="mt-2 max-w-xl text-bone-2 text-sm">
						Resolve, close, cancel, edit. Anyone publishes from{" "}
						<code className="bg-ink-3 px-1 font-mono text-bone-2 text-xs">
							/create
						</code>
						; you moderate after the fact.
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

			<dl className="grid grid-cols-2 divide-x divide-rule border-rule border-y sm:grid-cols-4 sm:divide-y-0">
				<StatTile
					label="Tickets"
					value={isLoading ? "—" : stats.total.toLocaleString()}
					sub={
						isLoading
							? undefined
							: `${stats.open} live · ${stats.resolved} resolved · ${stats.cancelled} cancelled`
					}
				/>
				<StatTile
					label="Volume"
					value={
						isLoading
							? "—"
							: `${CURRENCY_SYMBOL}${money(stats.volume).replace(CURRENCY_SYMBOL, "")}`
					}
					sub="cumulative"
				/>
				<StatTile
					label="Open interest"
					value={
						isLoading
							? "—"
							: `${CURRENCY_SYMBOL}${money(stats.openInterest).replace(CURRENCY_SYMBOL, "")}`
					}
					sub="across live tickets"
				/>
				<StatTile
					label="Attention"
					value={isLoading ? "—" : `${notificationCount}`}
					sub={
						isLoading
							? undefined
							: notificationCount === 0
								? "all clear"
								: `${endedTickets.length} ended · ${pendingReports?.length ?? 0} reports`
					}
					tone={notificationCount > 0 ? "brand" : undefined}
				/>
			</dl>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
					<div className="flex gap-2">
						{(
							[
								["all", "All"],
								["open", "Open"],
								["closed", "Closed"],
								["resolved", "Resolved"],
								["cancelled", "Cancelled"],
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
						placeholder="Search questions, tags, subjects…"
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
				<div className="border-rule border-y px-6 py-16 text-center">
					<Kicker>{rows.length === 0 ? "Tape's empty" : "No matches"}</Kicker>
					<p className="mx-auto mt-3 max-w-sm text-bone-2 text-sm">
						{rows.length === 0
							? "Nothing's open yet. Make the first ticket and we'll list it here."
							: "Nothing matches the current filter or search."}
					</p>
					{rows.length === 0 ? (
						<Button
							size="sm"
							className="mt-5"
							onClick={() => setCreateOpen(true)}
						>
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
									<TableHead className="pl-4">ID</TableHead>
									<TableHead>Question</TableHead>
									<TableHead>About</TableHead>
									<TableHead>Creator</TableHead>
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
										<TableCell className="pl-4 font-bold font-mono text-bone-3 text-xs">
											{ticketId(row.slug)}
										</TableCell>
										<TableCell>
											<div className="font-display font-semibold text-bone">
												{row.question}
											</div>
										</TableCell>
										<TableCell className="font-mono text-[11px]">
											{row.subject
												? (row.subject.name ?? row.subject.handle)
												: "—"}
										</TableCell>
										<TableCell className="font-mono text-[11px]">
											{row.creator
												? (row.creator.name ?? row.creator.handle)
												: "—"}
										</TableCell>
										<TableCell>
											<StatusBadge row={row} />
										</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{CURRENCY_SYMBOL}
											{Math.round(row.yesPrice * 100)}
										</TableCell>
										<TableCell className="text-right font-mono tabular-nums">
											{money(row.volume)}
										</TableCell>
										<TableCell className="pr-4 text-right font-mono text-xs">
											{relativeFromNow(row.closesAtMs)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<ul className="border-rule border-y md:hidden">
						{filtered.map((row) => (
							<li key={row.id}>
								<button
									type="button"
									onClick={() => setDrawerRow(row)}
									className="ledger-row block w-full px-3 py-3 text-left transition-colors hover:bg-ink-2"
								>
									<div className="flex items-center justify-between gap-2">
										<span className="font-bold font-mono text-[10px] text-bone-3 uppercase tracking-[0.14em]">
											{ticketId(row.slug)}
										</span>
										<StatusBadge row={row} />
									</div>
									<div className="mt-2 font-display font-semibold text-bone text-sm">
										{row.question}
									</div>
									<div className="mt-1 flex items-center justify-between font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
										<span className="truncate">
											{row.subject
												? `ABOUT ${row.subject.name ?? row.subject.handle}`
												: ""}
										</span>
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
				endedTickets={endedTickets}
				pendingReports={pendingReports ?? []}
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
							Pick a subject and publish. Tickets go live immediately.
						</DialogDescription>
					</DialogHeader>
					<CreateTicketForm onSuccess={() => setCreateOpen(false)} />
				</DialogContent>
			</Dialog>
		</div>
	);
}

type PendingReport = {
	_id: string;
	_creationTime: number;
	ticketId: string;
	ticketQuestion: string;
	ticketSlug: string;
	reporterHandle: string;
	description: string;
	status: string;
};

function NotificationsSheet({
	open,
	onOpenChange,
	endedTickets,
	pendingReports,
	onOpenRow,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	endedTickets: Row[];
	pendingReports: PendingReport[];
	onOpenRow: (row: Row) => void;
}) {
	const total = endedTickets.length + pendingReports.length;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full max-w-md overflow-y-auto bg-ink"
			>
				<SheetHeader className="border-rule border-b pr-10">
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
							All tickets resolved, all reports reviewed.
						</p>
					</div>
				) : (
					<div className="mt-4 space-y-8">
						<section>
							<div className="flex items-baseline justify-between border-rule border-b pb-2">
								<Kicker>TICKETS · AWAITING RESOLUTION</Kicker>
								<span className="font-mono text-[11px] text-bone-3 tabular-nums">
									{endedTickets.length}
								</span>
							</div>
							{endedTickets.length === 0 ? (
								<div className="mt-3 border border-rule border-dashed py-6 text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
									All tickets are up to date.
								</div>
							) : (
								<ul className="mt-3 space-y-3">
									{endedTickets.map((m) => (
										<li key={m.id} className="border border-rule bg-ink-2 p-3">
											<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												{ticketId(m.slug)}
											</div>
											<div className="mt-1 font-display font-semibold text-bone text-sm">
												{m.question}
											</div>
											<div className="mt-2 font-mono text-[11px] text-bone-2 uppercase tracking-[0.12em]">
												CLOSED · last yes {CURRENCY_SYMBOL}
												{Math.round(m.yesPrice * 100)}
											</div>
											<div className="mt-3 flex gap-2">
												<InlineResolve ticketId={m.id} side="Yes" />
												<InlineResolve ticketId={m.id} side="No" />
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

						<section>
							<div className="flex items-baseline justify-between border-rule border-b pb-2">
								<Kicker>INSIDER TRADING REPORTS</Kicker>
								<span className="font-mono text-[11px] text-bone-3 tabular-nums">
									{pendingReports.length}
								</span>
							</div>
							{pendingReports.length === 0 ? (
								<div className="mt-3 border border-rule border-dashed py-6 text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
									No pending reports.
								</div>
							) : (
								<ul className="mt-3 space-y-3">
									{pendingReports.map((r) => (
										<li
											key={r._id}
											className="border border-magenta/30 border-rule bg-magenta-wash/20 p-3"
										>
											<div className="flex items-center gap-2 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
												<AlertTriangle className="size-3 text-magenta" />
												<span>
													{r.ticketSlug
														? ticketId(r.ticketSlug)
														: "Unknown ticket"}
												</span>
												<span>· by {r.reporterHandle}</span>
											</div>
											<div className="mt-1 font-display font-semibold text-bone text-sm">
												{r.ticketQuestion}
											</div>
											<p className="mt-2 line-clamp-3 text-bone-2 text-xs">
												{r.description}
											</p>
											<div className="mt-3 flex gap-2">
												<InlineValidateReport
													reportId={r._id as Id<"ticketReports">}
												/>
												<InlineDismissReport
													reportId={r._id as Id<"ticketReports">}
												/>
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

function InlineResolve({
	ticketId,
	side,
}: {
	ticketId: Id<"tickets">;
	side: "Yes" | "No";
}) {
	const resolve = useMutation(api.admin.resolveTicket);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant={side === "Yes" ? "yes" : "no"}
			size="sm"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await resolve({ ticketId, resolution: side });
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

function InlineValidateReport({ reportId }: { reportId: Id<"ticketReports"> }) {
	const validate = useMutation(api.reports.validate);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="no-soft"
			size="sm"
			disabled={busy}
			onClick={async () => {
				if (
					!confirm(
						"Validate report and cancel the ticket? All positions will be refunded."
					)
				)
					return;
				setBusy(true);
				try {
					await validate({ reportId });
					toast.success("Report validated · ticket cancelled");
				} catch (err) {
					toast.error("Action failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<AlertTriangle /> Validate & cancel
		</Button>
	);
}

function InlineDismissReport({ reportId }: { reportId: Id<"ticketReports"> }) {
	const dismiss = useMutation(api.reports.dismiss);
	const [busy, setBusy] = useState(false);
	return (
		<Button
			variant="ghost"
			size="sm"
			disabled={busy}
			onClick={async () => {
				setBusy(true);
				try {
					await dismiss({ reportId });
					toast.info("Report dismissed");
				} catch (err) {
					toast.error("Action failed", {
						description: err instanceof Error ? err.message : String(err),
					});
				} finally {
					setBusy(false);
				}
			}}
		>
			<X /> Dismiss
		</Button>
	);
}

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
	const me = useQuery(api.users.me, {});
	const [question, setQuestion] = useState(row.question);
	const [description, setDescription] = useState(row.description);
	const [tags, setTags] = useState(row.tags.join(", "));
	const [closesAtMs, setClosesAtMs] = useState(row.closesAtMs);
	const [closesAtLabel, setClosesAtLabel] = useState(row.closesAt);
	const [subject, setSubject] = useState<Row["subject"]>(row.subject);
	const [creator, setCreator] = useState<Pick | null>(row.creator);
	const [saving, setSaving] = useState(false);

	const updateTicket = useMutation(api.admin.updateTicket);

	const handleSave = async () => {
		setSaving(true);
		try {
			const subjectChanged =
				(subject?._id ?? null) !== (row.subject?._id ?? null) ||
				(subject?.name ?? null) !== (row.subject?.name ?? null);
			await updateTicket({
				ticketId: row.id,
				question: question.trim(),
				description: description.trim(),
				tags: tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
				closesAt: closesAtLabel.trim() || row.closesAt,
				closesAtMs,
				subjectUserId: subjectChanged && subject?._id ? subject._id : undefined,
				subjectName:
					subjectChanged && !subject?._id && subject?.name
						? subject.name
						: undefined,
				creatorId:
					creator && creator._id !== row.creator?._id ? creator._id : undefined,
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
		question !== row.question ||
		description !== row.description ||
		tags !== row.tags.join(", ") ||
		closesAtMs !== row.closesAtMs ||
		closesAtLabel !== row.closesAt ||
		(subject?._id ?? null) !== (row.subject?._id ?? null) ||
		(subject?.name ?? null) !== (row.subject?.name ?? null) ||
		creator?._id !== row.creator?._id;

	return (
		<>
			<SheetHeader className="border-rule border-b pr-10">
				<div className="flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center border border-rule bg-ink-2 px-2 py-0.5 font-bold font-mono text-[10px] text-bone-2 uppercase tracking-[0.14em]">
						{ticketId(row.slug)}
					</span>
					<StatusBadge row={row} />
				</div>
				<SheetTitle className="font-display text-base leading-snug">
					{row.question}
				</SheetTitle>
				<SheetDescription>
					Closes{" "}
					<span className="text-bone">{relativeFromNow(row.closesAtMs)}</span>
					<span className="px-1">·</span>
					<span className="text-bone-3">
						{new Date(row.closesAtMs).toLocaleString()}
					</span>
				</SheetDescription>
			</SheetHeader>

			<dl className="mt-5 border-rule border-y">
				<PeopleRow label="About" person={row.subject} />
				<PeopleRow label="Creator" person={row.creator} />
			</dl>

			<dl className="grid grid-cols-4 divide-x divide-rule border-rule border-b">
				<MiniStat
					label="Yes"
					value={`${CURRENCY_SYMBOL}${Math.round(row.yesPrice * 100)}`}
					tone="brand"
				/>
				<MiniStat label="Volume" value={money(row.volume)} />
				<MiniStat label="Liquidity" value={money(row.liquidity)} />
				<MiniStat
					label="Closes"
					value={relativeFromNow(row.closesAtMs)}
					tone={row.closesAtMs < Date.now() ? "danger" : undefined}
				/>
			</dl>

			<section className="mt-6">
				<Kicker>Actions</Kicker>
				<TicketActionButtons row={row} onDone={onClose} />
			</section>

			<TransactionsPanel ticketId={row.id} />

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
					<div className="space-y-2">
						<Label htmlFor="td-tags">Tags</Label>
						<Input
							id="td-tags"
							value={tags}
							onChange={(e) => setTags(e.target.value)}
							placeholder="weekend, chaos"
						/>
					</div>

					<div className="grid grid-cols-1 gap-3 border-rule border-t pt-4 sm:grid-cols-2">
						<EditableSubject
							label="Subject (about)"
							subject={subject}
							meId={me?._id}
							onChange={setSubject}
							allowSelf
						/>
						<EditablePerson
							label="Creator"
							person={creator}
							meId={me?._id}
							onChange={setCreator}
							allowSelf
						/>
					</div>

					<div className="grid grid-cols-2 gap-3 border-rule border-t pt-4">
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
		</>
	);
}

function TicketActionButtons({
	row,
	onDone,
}: {
	row: Row;
	onDone: () => void;
}) {
	const closeTicket = useMutation(api.admin.closeTicket);
	const reopenTicket = useMutation(api.admin.reopenTicket);
	const resolveTicket = useMutation(api.admin.resolveTicket);
	const cancelTicket = useMutation(api.admin.cancelTicket);
	const deleteTicket = useMutation(api.admin.deleteTicket);
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

	const isFinished = row.status === "resolved" || row.status === "cancelled";

	return (
		<div className="mt-3 grid grid-cols-2 gap-2">
			{row.status === "open" ? (
				<Button
					variant="secondary"
					disabled={busy}
					onClick={() =>
						run(() => closeTicket({ ticketId: row.id }), "Ticket closed")
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
						run(() => reopenTicket({ ticketId: row.id }), "Ticket reopened")
					}
				>
					<RefreshCw /> Reopen
				</Button>
			) : null}
			{!isFinished ? (
				<>
					<Button
						variant="yes"
						disabled={busy}
						onClick={() =>
							run(
								() => resolveTicket({ ticketId: row.id, resolution: "Yes" }),
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
								() => resolveTicket({ ticketId: row.id, resolution: "No" }),
								"Resolved No"
							)
						}
					>
						<XCircle /> Resolve No
					</Button>
					<Button
						variant="ghost"
						className="col-span-2 text-magenta hover:bg-magenta-wash hover:text-magenta"
						disabled={busy}
						onClick={() => {
							if (
								!confirm(
									`Cancel ticket and refund all positions?\n\n"${row.question}"\n\nThis cannot be undone.`
								)
							)
								return;
							run(
								() => cancelTicket({ ticketId: row.id }),
								"Ticket cancelled · positions refunded"
							);
						}}
					>
						<AlertTriangle /> Cancel & refund
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
					run(() => deleteTicket({ ticketId: row.id }), "Ticket deleted");
				}}
			>
				<Trash2 /> Delete ticket
			</Button>
		</div>
	);
}

function StatTile({
	label,
	value,
	sub,
	tone,
}: {
	label: string;
	value: string;
	sub?: string;
	tone?: "brand";
}) {
	return (
		<div className="flex flex-col gap-1.5 px-4 py-3 sm:px-5 sm:py-4">
			<div className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.16em]">
				{label}
			</div>
			<div
				className={cn(
					"font-bold font-mono text-2xl tabular-nums leading-none sm:text-3xl",
					tone === "brand" ? "text-brand" : "text-bone"
				)}
			>
				{value}
			</div>
			{sub ? (
				<div className="truncate font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
					{sub}
				</div>
			) : null}
		</div>
	);
}

function MiniStat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "brand" | "danger";
}) {
	return (
		<div className="flex flex-col gap-1 px-3 py-2.5">
			<div className="font-mono font-semibold text-[9px] text-bone-3 uppercase tracking-[0.16em]">
				{label}
			</div>
			<div
				className={cn(
					"font-bold font-mono text-sm tabular-nums leading-none",
					tone === "brand" && "text-brand",
					tone === "danger" && "text-magenta"
				)}
			>
				{value}
			</div>
		</div>
	);
}

function EditableSubject({
	label,
	subject,
	meId,
	onChange,
	allowSelf = false,
}: {
	label: string;
	subject: Row["subject"];
	meId: Id<"users"> | undefined;
	onChange: (next: Row["subject"]) => void;
	allowSelf?: boolean;
}) {
	const [editing, setEditing] = useState(false);
	const [nameMode, setNameMode] = useState(false);
	const [nameDraft, setNameDraft] = useState("");
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			{editing ? (
				<div className="space-y-2">
					{nameMode ? (
						<form
							className="flex items-center gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const trimmed = nameDraft.trim();
								if (!trimmed) return;
								onChange({ name: trimmed });
								setNameMode(false);
								setEditing(false);
								setNameDraft("");
							}}
						>
							<Input
								autoFocus
								value={nameDraft}
								onChange={(e) => setNameDraft(e.target.value)}
								placeholder="e.g. Carla from accounting"
								maxLength={60}
							/>
							<Button type="submit" size="sm" disabled={!nameDraft.trim()}>
								Set
							</Button>
						</form>
					) : (
						<UserPicker
							meId={meId}
							allowSelf={allowSelf}
							onPick={(u) => {
								onChange({
									_id: u._id,
									handle: u.handle,
									name: u.name ?? u.handle,
									image: u.image,
								});
								setEditing(false);
							}}
						/>
					)}
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setNameMode((m) => !m)}
						>
							{nameMode ? "Pick a user" : "Use a name instead"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="ml-auto"
							onClick={() => {
								setEditing(false);
								setNameMode(false);
								setNameDraft("");
							}}
						>
							<X /> Cancel
						</Button>
					</div>
				</div>
			) : (
				<div className="flex items-center justify-between gap-2 border border-rule bg-ink px-3 py-2">
					<div className="min-w-0">
						<div className="truncate font-display font-semibold text-sm">
							{subject ? subject.name : "—"}
						</div>
						{subject?.handle ? (
							<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
								{subject.handle}
							</div>
						) : subject ? (
							<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.14em]">
								off-platform
							</div>
						) : null}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setEditing(true)}
					>
						<Pencil /> Change
					</Button>
				</div>
			)}
		</div>
	);
}

function EditablePerson({
	label,
	person,
	meId,
	onChange,
	allowSelf = false,
}: {
	label: string;
	person: Pick | null;
	meId: Id<"users"> | undefined;
	onChange: (next: Pick | null) => void;
	allowSelf?: boolean;
}) {
	const [editing, setEditing] = useState(false);
	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			{editing ? (
				<div className="space-y-2">
					<UserPicker
						meId={meId}
						allowSelf={allowSelf}
						onPick={(u) => {
							onChange(u);
							setEditing(false);
						}}
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setEditing(false)}
					>
						<X /> Cancel
					</Button>
				</div>
			) : (
				<div className="flex items-center justify-between gap-2 border border-rule bg-ink px-3 py-2">
					<div className="min-w-0">
						<div className="truncate font-display font-semibold text-sm">
							{person ? (person.name ?? person.handle) : "—"}
						</div>
						{person ? (
							<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
								{person.handle}
							</div>
						) : null}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setEditing(true)}
					>
						<Pencil /> Change
					</Button>
				</div>
			)}
		</div>
	);
}

function PeopleRow({
	label,
	person,
}: {
	label: string;
	person: Row["subject"] | Row["creator"];
}) {
	return (
		<div className="ledger-row grid grid-cols-[6rem_1fr] items-baseline gap-3 py-2.5">
			<div className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.16em]">
				{label}
			</div>
			{person ? (
				person.handle ? (
					<Link
						to="/profile/$username"
						params={{ username: person.handle.replace(/^@/, "") }}
						className="flex min-w-0 items-baseline gap-2 hover:text-brand"
					>
						<span className="truncate font-display font-semibold text-bone text-sm">
							{person.name ?? person.handle}
						</span>
						<span className="shrink-0 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							{person.handle}
						</span>
					</Link>
				) : (
					<div className="flex min-w-0 items-baseline gap-2">
						<span className="truncate font-display font-semibold text-bone text-sm">
							{person.name}
						</span>
						<span className="shrink-0 font-mono text-[9px] text-bone-3 uppercase tracking-[0.14em]">
							off-platform
						</span>
					</div>
				)
			) : (
				<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					—
				</span>
			)}
		</div>
	);
}

function TransactionsPanel({ ticketId }: { ticketId: Id<"tickets"> }) {
	const trades = useQuery(api.admin.ticketTrades, { ticketId });
	const refund = useMutation(api.admin.refundTrade);
	const [busyId, setBusyId] = useState<string | null>(null);

	const handleRefund = async (tradeId: Id<"trades">, summary: string) => {
		if (
			!confirm(
				`Refund this trade?\n\n${summary}\n\nThe user's cash + position will be reversed. This deletes the trade record.`
			)
		)
			return;
		setBusyId(tradeId);
		try {
			await refund({ tradeId });
			toast.success("Trade refunded");
		} catch (err) {
			toast.error("Refund failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setBusyId(null);
		}
	};

	return (
		<section className="mt-6">
			<div className="flex items-baseline justify-between">
				<Kicker>Tape</Kicker>
				<span className="font-mono text-[10px] text-bone-3 uppercase tabular-nums tracking-[0.12em]">
					{trades?.length ?? "—"} {trades?.length === 1 ? "trade" : "trades"}
				</span>
			</div>
			{trades === undefined ? (
				<Skeleton className="mt-3 h-24" />
			) : trades.length === 0 ? (
				<div className="mt-3 border-rule border-y py-8 text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					No trades yet.
				</div>
			) : (
				<ul className="mt-3 border-rule border-y">
					{trades.map((t) => {
						const isBuy = t.kind === "buy";
						const handle = t.user?.handle ?? "@deleted";
						const name = t.user?.name ?? handle;
						const summary = `${name} ${isBuy ? "bought" : "sold"} ${t.shares.toFixed(2)} ${t.side} @ ${CURRENCY_SYMBOL}${Math.round(t.price * 100)}`;
						const sideColor = t.side === "Yes" ? "text-brand" : "text-magenta";
						return (
							<li
								key={t._id}
								className="ledger-row grid grid-cols-[3rem_1fr_auto_auto] items-baseline gap-3 py-2.5 font-mono text-xs tabular-nums"
							>
								<span className="text-[10px] text-bone-3 uppercase tracking-[0.12em]">
									{tapeTime(t._creationTime)}
								</span>
								<Link
									to="/profile/$username"
									params={{ username: handle.replace(/^@/, "") }}
									className="flex min-w-0 items-baseline gap-2 normal-case tracking-normal hover:text-brand"
								>
									<span className="truncate font-display font-semibold text-bone">
										{name}
									</span>
									<span className={cn("shrink-0 font-bold", sideColor)}>
										{isBuy ? "BUY" : "SELL"} {t.side.toUpperCase()}
									</span>
								</Link>
								<span className="text-bone-2">
									{t.shares.toFixed(2)} @ {CURRENCY_SYMBOL}
									{Math.round(t.price * 100)}
								</span>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											"font-bold",
											isBuy ? "text-bone" : "text-brand"
										)}
									>
										{isBuy ? "−" : "+"}
										{CURRENCY_SYMBOL}
										{Math.round(Math.abs(t.cost)).toLocaleString()}
									</span>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-bone-3 hover:bg-magenta-wash hover:text-magenta"
										title="Refund this trade"
										aria-label="Refund this trade"
										disabled={busyId === t._id}
										onClick={() => handleRefund(t._id, summary)}
									>
										<RotateCcw />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

function tapeTime(ms: number): string {
	const d = new Date(ms);
	const today = new Date();
	const sameDay =
		d.getFullYear() === today.getFullYear() &&
		d.getMonth() === today.getMonth() &&
		d.getDate() === today.getDate();
	if (sameDay) {
		return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatusBadge({ row }: { row: Row }) {
	if (row.status === "open") {
		const overdue = row.closesAtMs < Date.now();
		return overdue ? (
			<BracketChip tone="danger">OVERDUE</BracketChip>
		) : (
			<BracketChip pulse>LIVE</BracketChip>
		);
	}
	if (row.status === "closed") {
		return <BracketChip tone="neutral">CLOSED</BracketChip>;
	}
	if (row.status === "cancelled") {
		return <BracketChip tone="danger">CANCELLED</BracketChip>;
	}
	return (
		<BracketChip tone={row.resolution === "Yes" ? "brand" : "danger"}>
			RESOLVED {row.resolution}
		</BracketChip>
	);
}

type Pick = {
	_id: Id<"users">;
	handle: string;
	name: string | null;
	image: string | null;
};

function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
	const create = useMutation(api.tickets.create);
	const me = useQuery(api.users.me, {});
	const [subject, setSubject] = useState<Pick | null>(null);
	const [question, setQuestion] = useState("");
	const [description, setDescription] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [customAt, setCustomAt] = useState(() =>
		toLocalDatetime(Date.now() + 7 * 86_400_000)
	);
	const [closesAtLabel, setClosesAtLabel] = useState("");
	const [yesPrice, setYesPrice] = useState(0.5);
	const [liquidity, setLiquidity] = useState(2_000);
	const [submitting, setSubmitting] = useState(false);

	const closesAtMs = useMemo(() => fromLocalDatetime(customAt), [customAt]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!subject) {
			toast.error("Pick a subject");
			return;
		}
		setSubmitting(true);
		try {
			const tags = tagInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean);
			const r = await create({
				subjectUserId: subject._id,
				question: question.trim(),
				description: description.trim(),
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
				adminOverride: true,
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
				<Label>Subject</Label>
				{subject ? (
					<div className="flex items-center justify-between border border-brand/40 bg-brand-wash p-3">
						<div className="min-w-0">
							<div className="truncate font-display font-semibold">
								{subject.name ?? subject.handle}
							</div>
							<div className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
								{subject.handle}
							</div>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setSubject(null)}
						>
							<X /> Change
						</Button>
					</div>
				) : (
					<UserPicker meId={me?._id} onPick={setSubject} allowSelf />
				)}
				<p className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					Admin override: you can pick yourself.
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="cm-question">Question</Label>
				<Input
					id="cm-question"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder={
						subject ? `Will ${subject.name ?? subject.handle}…?` : "Will they…?"
					}
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
			<div className="space-y-2">
				<Label htmlFor="cm-tags">Tags</Label>
				<Input
					id="cm-tags"
					value={tagInput}
					onChange={(e) => setTagInput(e.target.value)}
					placeholder="weekend, chaos"
				/>
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
			<DialogFooter>
				<Button type="submit" disabled={submitting || !subject}>
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

function UserPicker({
	meId,
	onPick,
	allowSelf = false,
}: {
	meId: Id<"users"> | undefined;
	onPick: (user: Pick) => void;
	allowSelf?: boolean;
}) {
	const [q, setQ] = useState("");
	const trimmed = q.trim();
	const results = useQuery(
		api.users.search,
		trimmed.length >= 1 ? { q: trimmed, limit: 8 } : "skip"
	);

	return (
		<div className="space-y-2">
			<div className="relative">
				<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
				<Input
					placeholder="Search by name or @handle"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					className="pl-9"
				/>
			</div>
			{trimmed.length >= 1 && (
				<div className="border border-rule bg-ink">
					{results === undefined ? (
						<div className="px-3 py-2 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
							Searching…
						</div>
					) : results.length === 0 ? (
						<div className="px-3 py-2 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
							No matches.
						</div>
					) : (
						<ul>
							{results.map((u) => {
								const isMe = meId === u._id;
								const blocked = isMe && !allowSelf;
								return (
									<li key={u._id}>
										<button
											type="button"
											disabled={blocked}
											onClick={() => onPick(u)}
											className={cn(
												"flex w-full items-center gap-3 border-rule border-b px-3 py-2 text-left transition last:border-b-0",
												blocked
													? "cursor-not-allowed opacity-50"
													: "hover:bg-brand-wash"
											)}
										>
											<div className="min-w-0 flex-1">
												<div className="truncate font-display font-semibold text-sm">
													{u.name ?? u.handle}
												</div>
												<div className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
													{u.handle}
												</div>
											</div>
											{isMe ? (
												<span className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
													You
												</span>
											) : null}
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

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
