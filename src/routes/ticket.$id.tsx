import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
	Authenticated,
	useConvexAuth,
	useMutation,
	useQuery,
} from "convex/react";
import { AlertTriangle, LogIn } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { BracketChip, ticketId } from "@/components/console";
import { PriceBar, QuickBuyDialog, TrendBadge } from "@/components/ticket-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { crumbForPath, getPreviousPath } from "@/lib/route-history";
import { pageHead } from "@/lib/seo";
import { useDynamicHead } from "@/lib/seo-client";
import {
	CURRENCY_SYMBOL,
	cents,
	money,
	toUITicket,
	trail,
	type UITicket,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { useBalance } from "@/lib/wallet";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/ticket/$id")({
	component: TicketDetail,
	head: ({ params }) =>
		pageHead({
			title: "Ticket",
			description:
				"Trade Yes/No tickets in shekels. Live prices, order book, and resolution status.",
			path: `/ticket/${params.id}`,
		}),
});

function TicketDetail() {
	const { id } = useParams({ from: "/ticket/$id" });
	const doc = useQuery(api.tickets.getBySlug, { slug: id });
	const [quickBuyOpen, setQuickBuyOpen] = useState(false);
	const [quickBuySide, setQuickBuySide] = useState<"Yes" | "No">("Yes");

	const yesPct = doc ? Math.round(doc.yesPrice * 100) : null;
	const dynamicTitle = doc ? `${doc.question} · ${yesPct}% Yes` : "Ticket";
	const dynamicDescription = doc
		? `${doc.question} Trade Yes/No in shekels. Current Yes price ${yesPct}₪.`
		: "A prediction ticket on Charles.market.";
	useDynamicHead({
		title: dynamicTitle,
		description: dynamicDescription,
		path: `/ticket/${id}`,
	});

	if (doc === undefined) return <TicketDetailSkeleton />;
	if (doc === null) return <TicketNotFound id={id} />;

	const ticket = toUITicket(doc);
	const isClosed = doc.status !== "open";

	const openQuick = (side: "Yes" | "No") => {
		setQuickBuySide(side);
		setQuickBuyOpen(true);
	};

	return (
		<>
			<main className="mx-auto w-full max-w-[1280px] px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:pb-12">
				<Breadcrumbs ticket={ticket} />
				<div className="mt-5 grid grid-cols-1 gap-6 sm:mt-6 lg:grid-cols-[1.7fr_380px] lg:gap-10">
					<TicketHeader ticket={ticket} isOpen={!isClosed} />
					<aside className="hidden space-y-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block lg:self-start">
						<OrderTicket ticket={ticket} />
						<Stats ticket={ticket} />
					</aside>
					<PriceChartCard ticket={ticket} />
					<div className="lg:hidden">
						<Stats ticket={ticket} />
					</div>
					<TicketTabs ticket={ticket} />
				</div>
			</main>

			{!isClosed ? (
				<div className="sticky bottom-0 z-20 border-rule border-t bg-ink/95 px-4 py-3 backdrop-blur lg:hidden">
					<div className="mx-auto flex w-full max-w-[1280px] items-center gap-2">
						<button
							type="button"
							onClick={() => openQuick("Yes")}
							className="bezel flex flex-1 items-center justify-between rounded-[4px] border border-brand bg-brand px-4 py-3 text-brand-foreground transition-colors hover:bg-brand-deep active:translate-y-[1px]"
						>
							<span className="font-bold font-mono text-[11px] uppercase tracking-[0.14em]">
								Buy Yes
							</span>
							<span className="font-bold font-mono text-base tabular-nums">
								{cents(ticket.yesPrice)}
							</span>
						</button>
						<button
							type="button"
							onClick={() => openQuick("No")}
							className="bezel flex flex-1 items-center justify-between rounded-[4px] border border-magenta bg-magenta px-4 py-3 text-magenta-foreground transition-colors hover:bg-magenta-deep active:translate-y-[1px]"
						>
							<span className="font-bold font-mono text-[11px] uppercase tracking-[0.14em]">
								Buy No
							</span>
							<span className="font-bold font-mono text-base tabular-nums">
								{cents(1 - ticket.yesPrice)}
							</span>
						</button>
					</div>
				</div>
			) : null}

			<QuickBuyDialog
				ticket={ticket}
				open={quickBuyOpen}
				onOpenChange={setQuickBuyOpen}
				initialSide={quickBuySide}
			/>
		</>
	);
}

function Breadcrumbs({ ticket }: { ticket: UITicket }) {
	const referrer = useMemo(() => {
		const prev = getPreviousPath();
		// If they came from another ticket detail page, that's noise — default to
		// Tickets list. Profile referrer is more useful since they likely clicked
		// the subject's name from the previous ticket.
		if (prev?.startsWith("/ticket/")) {
			return { label: "Tickets", to: "/tickets" };
		}
		return crumbForPath(prev ?? "/tickets");
	}, []);
	return (
		<nav className="flex items-center gap-2 overflow-hidden whitespace-nowrap font-mono text-[11px] text-bone-3 uppercase tracking-[0.14em]">
			<Link to={referrer.to} className="shrink-0 hover:text-brand">
				{referrer.label}
			</Link>
			<span aria-hidden="true">/</span>
			<span className="text-bone">{ticketId(ticket.slug)}</span>
		</nav>
	);
}

function TicketHeader({
	ticket,
	isOpen,
}: {
	ticket: UITicket;
	isOpen: boolean;
}) {
	return (
		<div>
			<div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
				<span className="font-bold text-bone">{ticketId(ticket.slug)}</span>
				{ticket.tags.length > 0 ? (
					<>
						<span className="text-bone-3">·</span>
						{ticket.tags.map((t) => (
							<span key={t} className="text-bone-3">
								#{t}
							</span>
						))}
					</>
				) : null}
				<BracketChip pulse className="ml-auto">
					LIVE
				</BracketChip>
			</div>
			<h1 className="display-headline mt-4 text-3xl leading-[0.98] sm:text-4xl md:text-[3.25rem]">
				{ticket.question}
			</h1>
			{ticket.subject ? (
				<div className="mt-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.14em]">
					ABOUT{" "}
					{ticket.subject.handle ? (
						<Link
							to="/profile/$username"
							params={{ username: ticket.subject.handle.replace(/^@/, "") }}
							className="font-bold text-bone normal-case tracking-normal hover:text-brand"
						>
							{ticket.subject.name}
						</Link>
					) : (
						<span className="font-bold text-bone normal-case tracking-normal">
							{ticket.subject.name}
						</span>
					)}
				</div>
			) : null}
			<div className="mt-6 flex items-end justify-between">
				<div>
					<div className="label">Yes price</div>
					<div className="mt-1 font-bold font-mono text-4xl text-brand tabular-nums leading-none sm:text-5xl">
						{cents(ticket.yesPrice)}
					</div>
				</div>
				<TrendBadge trend={ticket.trend} delta={ticket.delta} />
			</div>
			<div className="mt-5 max-w-xl">
				<PriceBar yes={ticket.yesPrice} no={1 - ticket.yesPrice} />
			</div>
			{isOpen ? (
				<Authenticated>
					<div className="mt-4">
						<ReportDialog ticketId={ticket._id as Id<"tickets">} />
					</div>
				</Authenticated>
			) : null}
		</div>
	);
}

function ReportDialog({ ticketId: mId }: { ticketId: Id<"tickets"> }) {
	const submit = useMutation(api.reports.submit);
	const [open, setOpen] = useState(false);
	const [description, setDescription] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await submit({ ticketId: mId, description });
			toast.success("Report submitted", {
				description: "An admin will review your report.",
			});
			setOpen(false);
			setDescription("");
		} catch (err) {
			toast.error("Report failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em] transition-colors hover:text-magenta"
				>
					<AlertTriangle className="size-3" />
					Report insider trading
				</button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Report suspected insider trading</DialogTitle>
					<DialogDescription>
						Describe what you observed. An admin will review your report and may
						cancel the ticket and refund all positions.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="report-desc">Description</Label>
						<Textarea
							id="report-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe what you observed in detail…"
							rows={5}
							maxLength={2000}
							required
							minLength={20}
						/>
						<p className="text-right font-mono text-[10px] text-bone-3 tabular-nums">
							{description.length}/2000
						</p>
					</div>
					<DialogFooter>
						<Button
							type="submit"
							disabled={submitting || description.length < 20}
						>
							{submitting ? "Submitting…" : "Submit report"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function PriceChartCard({ ticket }: { ticket: UITicket }) {
	const [range, setRange] = useState<"1H" | "6H" | "1D" | "1W" | "ALL">("ALL");
	const liveHistory = useQuery(api.tickets.history, {
		ticketId: ticket._id as Id<"tickets">,
		limit: 100,
	});
	const points = useMemo(() => {
		if (liveHistory && liveHistory.length >= 2) {
			return liveHistory.map((t, i) => ({ t: i, yes: t.yesPrice }));
		}
		return trail(ticket.yesPrice);
	}, [liveHistory, ticket.yesPrice]);

	const w = 800;
	const h = 220;
	const path = points
		.map((p, i) => {
			const x = (i / (points.length - 1)) * w;
			const y = h - p.yes * h;
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
	const last = points[points.length - 1].yes;
	const first = points[0].yes;
	const upward = last >= first;
	const color = upward ? "var(--brand)" : "var(--magenta)";

	return (
		<div className="border border-rule bg-ink-2 p-5">
			<header className="flex flex-col items-start gap-2 border-rule border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<span className="kicker">YES PRICE / HISTORY</span>
					{liveHistory === undefined ? null : liveHistory.length < 2 ? (
						<span className="font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							(synthetic, trade to start tracking)
						</span>
					) : null}
				</div>
				<ToggleGroup
					type="single"
					size="sm"
					value={range}
					onValueChange={(v) => v && setRange(v as typeof range)}
					className="self-end sm:self-auto"
				>
					{(["1H", "6H", "1D", "1W", "ALL"] as const).map((r) => (
						<ToggleGroupItem key={r} value={r}>
							{r}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</header>
			<svg
				viewBox={`0 0 ${w} ${h}`}
				className="mt-4 h-44 w-full sm:h-60"
				preserveAspectRatio="none"
				aria-label="Yes price history"
			>
				<title>Yes price history</title>
				<defs>
					<linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor={color} stopOpacity="0.18" />
						<stop offset="100%" stopColor={color} stopOpacity="0" />
					</linearGradient>
					<pattern
						id="chart-grid"
						width="80"
						height="44"
						patternUnits="userSpaceOnUse"
					>
						<path
							d="M 80 0 L 0 0 0 44"
							fill="none"
							stroke="var(--rule)"
							strokeWidth="0.5"
						/>
					</pattern>
				</defs>
				<rect width="100%" height="100%" fill="url(#chart-grid)" />
				<path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#chart-grad)" />
				<path
					d={path}
					fill="none"
					stroke={color}
					strokeWidth="1.75"
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}

function TicketTabs({ ticket }: { ticket: UITicket }) {
	return (
		<div className="border border-rule bg-ink-2 p-5">
			<Tabs defaultValue="about" className="w-full">
				<TabsList>
					<TabsTrigger value="about">About</TabsTrigger>
					<TabsTrigger value="trades">Trades</TabsTrigger>
					<TabsTrigger value="orderbook">Book</TabsTrigger>
					<TabsTrigger value="comments">Comments</TabsTrigger>
				</TabsList>
				<TabsContent value="about">
					<AboutTab ticket={ticket} />
				</TabsContent>
				<TabsContent value="trades">
					<TradesTab ticketId={ticket._id as Id<"tickets">} />
				</TabsContent>
				<TabsContent value="orderbook">
					<OrderBookTab ticket={ticket} />
				</TabsContent>
				<TabsContent value="comments">
					<CommentsTab ticketId={ticket._id as Id<"tickets">} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function AboutTab({ ticket }: { ticket: UITicket }) {
	return (
		<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
			{ticket.description && (
				<div>
					<div className="kicker">RESOLVES</div>
					<p className="mt-3 whitespace-pre-line text-bone-2 text-sm leading-relaxed">
						{ticket.description}
					</p>
				</div>
			)}
			<div className="space-y-0 font-mono text-sm">
				<KV label="Closes" value={ticket.closesAt} />
				<KV label="Open interest" value={money(ticket.openInterest)} />
				<KV label="Volume" value={money(ticket.volume)} />
				<KV label="Liquidity" value={money(ticket.liquidity)} />
			</div>
		</div>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between border-rule border-b py-2.5 font-mono text-[12px] uppercase tracking-[0.1em] last:border-b-0">
			<span className="text-bone-3">{label}</span>
			<span className="text-bone tabular-nums">{value}</span>
		</div>
	);
}

function TradesTab({ ticketId }: { ticketId: Id<"tickets"> }) {
	const trades = useQuery(api.trades.byMarket, { ticketId, limit: 25 });
	if (trades === undefined) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		);
	}
	if (trades.length === 0) {
		return (
			<p className="py-8 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
				No trades yet. Be the first.
			</p>
		);
	}
	return (
		<div className="-mx-5 overflow-x-auto px-5">
			<Table className="min-w-[460px]">
				<TableHeader>
					<TableRow>
						<TableHead>Trader</TableHead>
						<TableHead>Side</TableHead>
						<TableHead className="text-right">Shares</TableHead>
						<TableHead className="text-right">Price</TableHead>
						<TableHead className="text-right">When</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{trades.map((t) => (
						<TableRow key={t._id}>
							<TableCell>
								<Link
									to="/profile/$username"
									params={{
										username: encodeURIComponent(t.handle.replace(/^@/, "")),
									}}
									className="flex items-center gap-2 hover:text-brand"
								>
									<Avatar className="size-6 rounded-[2px]">
										<AvatarFallback className="rounded-[2px] bg-brand font-bold font-mono text-[10px] text-brand-foreground">
											{t.handle.charAt(1).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="truncate font-mono text-xs">{t.handle}</span>
								</Link>
							</TableCell>
							<TableCell>
								<Badge variant={t.side === "Yes" ? "yes" : "no"}>
									{t.kind === "sell" ? "↓ " : ""}
									{t.side}
								</Badge>
							</TableCell>
							<TableCell className="text-right font-mono tabular-nums">
								{t.shares.toFixed(2)}
							</TableCell>
							<TableCell className="text-right font-mono tabular-nums">
								{cents(t.price)}
							</TableCell>
							<TableCell className="whitespace-nowrap text-right font-mono text-bone-3 text-xs">
								{relativeTime(t._creationTime)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function OrderBookTab({ ticket }: { ticket: UITicket }) {
	const yes = ticket.yesPrice;
	const asks = [0.04, 0.03, 0.02, 0.01].map((d, i) => ({
		price: yes + d,
		size: 200 + i * 120,
	}));
	const bids = [0.01, 0.02, 0.03, 0.04].map((d, i) => ({
		price: yes - d,
		size: 180 + i * 90,
	}));
	const max = Math.max(...asks.map((a) => a.size), ...bids.map((b) => b.size));

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div>
				<div className="kicker text-magenta">ASKS / SELL YES</div>
				<ul className="mt-3 space-y-1">
					{asks.map((a) => (
						<BookRow key={a.price} {...a} max={max} side="ask" />
					))}
				</ul>
			</div>
			<div>
				<div className="kicker">BIDS / BUY YES</div>
				<ul className="mt-3 space-y-1">
					{bids.map((b) => (
						<BookRow key={b.price} {...b} max={max} side="bid" />
					))}
				</ul>
			</div>
			<p className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em] md:col-span-2">
				Synthetic book, derived from the current Yes price. Real book lands with
				the matching engine.
			</p>
		</div>
	);
}

function BookRow({
	price,
	size,
	max,
	side,
}: {
	price: number;
	size: number;
	max: number;
	side: "ask" | "bid";
}) {
	const pct = (size / max) * 100;
	return (
		<li className="relative flex items-center justify-between border border-rule px-3 py-1.5 font-mono text-sm">
			<span
				aria-hidden="true"
				className={cn(
					"absolute inset-y-0 left-0",
					side === "ask" ? "bg-magenta-wash" : "bg-brand-wash"
				)}
				style={{ width: `${pct}%` }}
			/>
			<span
				className={cn(
					"relative font-bold tabular-nums",
					side === "ask" ? "text-magenta" : "text-brand"
				)}
			>
				{cents(price)}
			</span>
			<span className="relative text-bone-2 tabular-nums">{money(size)}</span>
		</li>
	);
}

function CommentsTab({ ticketId }: { ticketId: Id<"tickets"> }) {
	const comments = useQuery(api.comments.byMarket, { ticketId, limit: 50 });
	const { isAuthenticated } = useConvexAuth();
	const addComment = useMutation(api.comments.add);
	const [body, setBody] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const submit = async () => {
		const trimmed = body.trim();
		if (!trimmed) return;
		setSubmitting(true);
		try {
			await addComment({ ticketId, body: trimmed });
			setBody("");
			toast.success("Comment posted");
		} catch (err) {
			toast.error("Couldn't post comment", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-5">
			{comments === undefined ? (
				<div className="space-y-2">
					{Array.from({ length: 2 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			) : comments.length === 0 ? (
				<p className="py-6 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
					No comments yet.
				</p>
			) : (
				comments.map((c) => (
					<div key={c._id} className="border border-rule bg-ink p-4">
						<div className="flex items-center gap-2 font-mono text-xs">
							<Link
								to="/profile/$username"
								params={{
									username: encodeURIComponent(c.handle.replace(/^@/, "")),
								}}
								className="flex items-center gap-2 hover:text-brand"
							>
								<Avatar className="size-6 rounded-[2px]">
									<AvatarFallback className="rounded-[2px] bg-brand font-bold font-mono text-[10px] text-brand-foreground">
										{c.handle.charAt(1).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span className="font-bold text-bone hover:text-brand">
									{c.handle}
								</span>
							</Link>
							<span className="text-bone-3 uppercase tracking-[0.12em]">
								{relativeTime(c._creationTime)}
							</span>
						</div>
						<p className="mt-3 text-bone-2 text-sm leading-relaxed">{c.body}</p>
					</div>
				))
			)}

			{isAuthenticated ? (
				<div className="space-y-2 border-rule border-t pt-5">
					<Label
						htmlFor="comment"
						className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.14em]"
					>
						Add your take
					</Label>
					<Textarea
						id="comment"
						rows={3}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="What's your read?"
					/>
					<div className="flex justify-end">
						<Button
							size="sm"
							onClick={submit}
							disabled={submitting || !body.trim()}
						>
							Post comment
						</Button>
					</div>
				</div>
			) : (
				<div className="border border-rule border-dashed p-5 text-center">
					<p className="text-bone-2 text-sm">Sign in to join the discussion.</p>
					<SignInButton className="mt-4" />
				</div>
			)}
		</div>
	);
}

function OrderTicket({ ticket }: { ticket: UITicket }) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { balance, mounted } = useBalance();
	const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
	const placeOrder = useMutation(api.orders.place);

	const [side, setSide] = useState<"Yes" | "No">("Yes");
	const [amount, setAmount] = useState("100");
	const [submitting, setSubmitting] = useState(false);

	const price = side === "Yes" ? ticket.yesPrice : 1 - ticket.yesPrice;
	const cost = Number(amount) || 0;
	const shares = price > 0 ? cost / price : 0;
	const payout = shares;
	const insufficient = isAuthenticated && cost > balance;
	const id = ticketId(ticket.slug);
	const isSubject = !!me && ticket.subject?._id === me._id;
	const isCreator = !!me && ticket.creator?._id === me._id;
	const blocked = isSubject || isCreator;
	const blockReason = isSubject
		? "You can't trade on a ticket about you. The ticket settles by what everyone else thinks."
		: isCreator
			? "You can't trade on a ticket you created. The ticket settles by what everyone else thinks."
			: null;

	const submit = async () => {
		if (cost <= 0) return;
		if (insufficient) {
			toast.error("Not enough shekels", {
				description: `You have ${CURRENCY_SYMBOL}${Math.round(balance)} but tried to spend ${CURRENCY_SYMBOL}${Math.round(cost)}.`,
			});
			return;
		}
		setSubmitting(true);
		try {
			const result = await placeOrder({
				ticketId: ticket._id as Id<"tickets">,
				side,
				amount: cost,
			});
			toast.success(
				`Bought ${side} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`,
				{
					description: `${result.shares.toFixed(2)} shares @ ${cents(result.price)} · payout ${CURRENCY_SYMBOL}${Math.round(result.shares).toLocaleString()}`,
				}
			);
			setAmount("0");
		} catch (err) {
			toast.error("Order failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="border border-rule bg-ink-2 p-5">
				<div className="space-y-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
			</div>
		);
	}

	if (blocked) {
		return (
			<div className="border border-rule bg-ink-2 p-5">
				<div className="flex items-center justify-between">
					<span className="kicker">ORDER · {id}</span>
					<BracketChip tone="danger">CAN'T TRADE</BracketChip>
				</div>
				<h3 className="display-headline mt-3 text-lg">
					{isSubject ? "This ticket is about you" : "You created this ticket"}
				</h3>
				<p className="mt-2 text-bone-2 text-sm">{blockReason}</p>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<div className="price-slab" data-side="yes" data-active="true">
						<span className="font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							YES
						</span>
						<span className="font-bold text-base text-brand">
							{cents(ticket.yesPrice)}
						</span>
					</div>
					<div className="price-slab" data-side="no" data-active="true">
						<span className="font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							NO
						</span>
						<span className="font-bold text-base text-magenta">
							{cents(1 - ticket.yesPrice)}
						</span>
					</div>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="border border-rule bg-ink-2 p-5">
				<div className="flex items-center justify-between">
					<span className="kicker">ORDER · {id}</span>
					<BracketChip tone="neutral">SIGNED OUT</BracketChip>
				</div>
				<h3 className="display-headline mt-3 text-lg">Sign in to bid</h3>
				<p className="mt-2 text-bone-2 text-sm">
					Trading needs an account. Everyone starts with {CURRENCY_SYMBOL}2,000
					in play-money shekels.
				</p>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<div className="price-slab" data-side="yes" data-active="true">
						<span className="font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							YES
						</span>
						<span className="font-bold text-base text-brand">
							{cents(ticket.yesPrice)}
						</span>
					</div>
					<div className="price-slab" data-side="no" data-active="true">
						<span className="font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							NO
						</span>
						<span className="font-bold text-base text-magenta">
							{cents(1 - ticket.yesPrice)}
						</span>
					</div>
				</div>
				<SignInButton
					variant="default"
					size="lg"
					className="mt-4 w-full"
					label="Sign in with Google"
				/>
				<div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					<LogIn className="size-3.5" />
					Google sign-in
				</div>
			</div>
		);
	}

	return (
		<div className="border border-rule bg-ink-2 p-5">
			<div className="flex items-center justify-between border-rule border-b pb-3">
				<span className="kicker">ORDER · {id}</span>
				<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					Cash{" "}
					<span className="font-bold text-bone tabular-nums">
						{CURRENCY_SYMBOL}
						{mounted ? Math.round(balance).toLocaleString() : "—"}
					</span>
				</span>
			</div>

			<div className="mt-4 space-y-4">
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setSide("Yes")}
						data-side="yes"
						data-active={side === "Yes" ? "true" : undefined}
						className="price-slab"
					>
						<span className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							YES
						</span>
						<span
							className={cn(
								"font-bold font-mono text-lg tabular-nums",
								side === "Yes" ? "text-brand" : "text-bone"
							)}
						>
							{cents(ticket.yesPrice)}
						</span>
					</button>
					<button
						type="button"
						onClick={() => setSide("No")}
						data-side="no"
						data-active={side === "No" ? "true" : undefined}
						className="price-slab"
					>
						<span className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							NO
						</span>
						<span
							className={cn(
								"font-bold font-mono text-lg tabular-nums",
								side === "No" ? "text-magenta" : "text-bone"
							)}
						>
							{cents(1 - ticket.yesPrice)}
						</span>
					</button>
				</div>

				<div className="space-y-2">
					<Label
						htmlFor="amount"
						className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.14em]"
					>
						Amount
					</Label>
					<div
						className={cn(
							"flex items-center gap-2 rounded-[4px] border border-rule bg-ink px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
							insufficient && "border-magenta/60 focus-within:border-magenta"
						)}
					>
						<span className="font-mono text-bone-3">{CURRENCY_SYMBOL}</span>
						<Input
							id="amount"
							inputMode="decimal"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							className="mono-input h-11 border-0 bg-transparent p-0 text-lg shadow-none focus-visible:border-0 focus-visible:ring-0"
						/>
					</div>
					<div className="grid grid-cols-4 gap-1.5 pt-1">
						{["50", "100", "250", "500"].map((v) => (
							<Button
								key={v}
								variant="outline"
								size="sm"
								onClick={() => setAmount(v)}
							>
								{CURRENCY_SYMBOL}
								{v}
							</Button>
						))}
					</div>
				</div>

				<div className="space-y-1.5 border border-rule bg-ink p-3 font-mono text-[12px] tabular-nums">
					<Row label="AVG PRICE" value={cents(price)} />
					<Row label="SHARES" value={shares.toFixed(2)} />
					<div className="border-rule border-t pt-1.5">
						<Row
							label="MAX PAYOUT"
							value={`${CURRENCY_SYMBOL}${Math.round(payout).toLocaleString()}`}
							accent
						/>
					</div>
				</div>

				<Button
					variant={side === "Yes" ? "yes" : "no"}
					size="lg"
					className="h-12 w-full text-sm"
					disabled={submitting || insufficient || cost <= 0}
					onClick={submit}
				>
					{submitting
						? "PLACING…"
						: insufficient
							? "NOT ENOUGH SHEKELS"
							: cost <= 0
								? "ENTER AN AMOUNT"
								: `BUY ${side.toUpperCase()} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`}
				</Button>

				<p className="text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
					Play money · Everyone starts with {CURRENCY_SYMBOL}2,000
				</p>
			</div>
		</div>
	);
}

function Row({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center justify-between text-[12px]">
			<span className="text-bone-3 tracking-[0.12em]">{label}</span>
			<span className={cn(accent ? "font-bold text-brand" : "text-bone")}>
				{value}
			</span>
		</div>
	);
}

function Stats({ ticket }: { ticket: UITicket }) {
	return (
		<div className="border border-rule bg-ink-2 p-5">
			<div className="kicker border-rule border-b pb-3">TICKET STATS</div>
			<div className="mt-3 space-y-0 font-mono text-sm">
				<KV label="Volume" value={money(ticket.volume)} />
				<KV label="Liquidity" value={money(ticket.liquidity)} />
				<KV label="Open interest" value={money(ticket.openInterest)} />
				<KV label="Closes" value={ticket.closesAt} />
			</div>
		</div>
	);
}

function TicketDetailSkeleton() {
	return (
		<main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 sm:py-12">
			<Skeleton className="h-4 w-72" />
			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_380px] lg:gap-10">
				<div className="space-y-6">
					<div>
						<Skeleton className="h-4 w-20" />
						<Skeleton className="mt-4 h-14 w-full" />
						<Skeleton className="mt-4 h-12 w-40" />
						<Skeleton className="mt-3 h-2 w-full max-w-md" />
					</div>
					<Skeleton className="h-72 w-full" />
					<Skeleton className="h-80 w-full" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-96 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			</div>
		</main>
	);
}

function TicketNotFound({ id }: { id: string }) {
	return (
		<main className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
			<BracketChip tone="danger">404 / NO SUCH TICKET</BracketChip>
			<h1 className="display-headline mt-6 text-4xl">Ticket not found</h1>
			<p className="mt-3 text-bone-2">
				Nothing matches "{id}". Probably Charles deleted it.
			</p>
			<Button asChild className="mt-8">
				<Link to="/tickets">Browse tickets</Link>
			</Button>
		</main>
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
	const weeks = Math.floor(days / 7);
	return `${weeks}w ago`;
}
