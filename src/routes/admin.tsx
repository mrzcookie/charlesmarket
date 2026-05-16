import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ExternalLink,
	Lock,
	Plus,
	ShieldCheck,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import { CURRENCY_SYMBOL, categories, money } from "@/lib/markets";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin")({
	component: AdminPage,
});

function AdminPage() {
	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
			<AuthLoading>
				<Skeleton className="h-96 w-full" />
			</AuthLoading>
			<Unauthenticated>
				<SignInGate />
			</Unauthenticated>
			<Authenticated>
				<AuthedAdmin />
			</Authenticated>
		</main>
	);
}

function AuthedAdmin() {
	const me = useQuery(api.users.me, {});
	if (me === undefined) return <Skeleton className="h-96 w-full" />;
	if (!me?.isAdmin) return <NotAuthorized />;

	return (
		<>
			<header className="flex flex-col gap-2">
				<Badge variant="brand" className="w-fit gap-1.5">
					<ShieldCheck className="size-3.5" /> Admin console
				</Badge>
				<h1 className="font-bold text-3xl tracking-tight">
					Manage markets &amp; proposals
				</h1>
				<p className="max-w-2xl text-muted-foreground">
					Approve community submissions, create markets directly, and resolve
					open markets when reality decides.
				</p>
			</header>

			<Tabs defaultValue="proposals" className="mt-8">
				<TabsList>
					<TabsTrigger value="proposals">Proposals</TabsTrigger>
					<TabsTrigger value="markets">Markets</TabsTrigger>
					<TabsTrigger value="create">Create market</TabsTrigger>
				</TabsList>

				<TabsContent value="proposals" className="mt-4">
					<ProposalsPanel />
				</TabsContent>

				<TabsContent value="markets" className="mt-4">
					<MarketsPanel />
				</TabsContent>

				<TabsContent value="create" className="mt-4">
					<CreateMarketForm />
				</TabsContent>
			</Tabs>
		</>
	);
}

function ProposalsPanel() {
	const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
		"pending"
	);
	const proposals = useQuery(api.proposals.listAll, { status });
	const approve = useMutation(api.proposals.approve);
	const reject = useMutation(api.proposals.reject);
	const remove = useMutation(api.proposals.remove);

	const handleApprove = async (id: Id<"marketProposals">) => {
		try {
			const r = await approve({ proposalId: id });
			toast.success("Market created", {
				description: `Live at /market/${r.slug}`,
			});
		} catch (err) {
			toast.error("Approve failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleReject = async (id: Id<"marketProposals">) => {
		const reason = prompt("Reason for rejection? (optional)") ?? undefined;
		try {
			await reject({ proposalId: id, reason });
			toast.info("Proposal rejected");
		} catch (err) {
			toast.error("Reject failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleDelete = async (id: Id<"marketProposals">) => {
		if (!confirm("Delete this proposal permanently?")) return;
		try {
			await remove({ proposalId: id });
			toast.info("Proposal deleted");
		} catch (err) {
			toast.error("Delete failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<CardTitle>Community proposals</CardTitle>
						<CardDescription>
							Approve to mint a live market. Reject sends it back with notes.
						</CardDescription>
					</div>
					<Select
						value={status}
						onValueChange={(v) => setStatus(v as typeof status)}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="approved">Approved</SelectItem>
							<SelectItem value="rejected">Rejected</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				{proposals === undefined ? (
					<Skeleton className="h-40" />
				) : proposals.length === 0 ? (
					<div className="rounded-md border border-dashed py-12 text-center text-muted-foreground text-sm">
						No {status} proposals.
					</div>
				) : (
					<div className="space-y-3">
						{proposals.map((p) => (
							<div key={p._id} className="rounded-lg border bg-card p-4">
								<div className="flex flex-wrap items-start justify-between gap-2">
									<div className="flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<Badge variant="outline">{p.category}</Badge>
											<span className="text-muted-foreground text-xs">
												from{" "}
												<span className="font-mono">{p.proposerHandle}</span> ·{" "}
												{new Date(p._creationTime).toLocaleDateString()}
											</span>
										</div>
										<h3 className="mt-2 font-semibold text-base leading-snug">
											{p.question}
										</h3>
										{p.description && (
											<p className="mt-1 text-muted-foreground text-sm">
												{p.description}
											</p>
										)}
										<dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
											<KV label="Closes" value={p.closesAt} />
											<KV
												label="Yes start"
												value={`${CURRENCY_SYMBOL}${Math.round(
													p.initialYesPrice * 100
												)}`}
											/>
											<KV label="Liquidity" value={money(p.initialLiquidity)} />
										</dl>
										{p.rejectionReason && (
											<div className="mt-3 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-xs">
												<span className="font-medium">Rejection note:</span>{" "}
												{p.rejectionReason}
											</div>
										)}
										{p.approvedMarketSlug && (
											<div className="mt-3 text-xs">
												<Button
													asChild
													variant="link"
													size="sm"
													className="px-0"
												>
													<Link
														to="/market/$id"
														params={{
															id: p.approvedMarketSlug,
														}}
													>
														View live market{" "}
														<ExternalLink className="ml-1 size-3" />
													</Link>
												</Button>
											</div>
										)}
									</div>
									<div className="flex flex-col items-end gap-2">
										{p.status === "pending" && (
											<>
												<Button size="sm" onClick={() => handleApprove(p._id)}>
													<Check /> Approve
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleReject(p._id)}
												>
													<X /> Reject
												</Button>
											</>
										)}
										{p.status !== "approved" && (
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleDelete(p._id)}
											>
												<Trash2 /> Delete
											</Button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function MarketsPanel() {
	const markets = useQuery(api.admin.listAll, {});
	const resolve = useMutation(api.admin.resolveMarket);
	const close = useMutation(api.admin.closeMarket);
	const reopen = useMutation(api.admin.reopenMarket);
	const remove = useMutation(api.admin.deleteMarket);

	const [filter, setFilter] = useState<"all" | "open" | "closed" | "resolved">(
		"all"
	);

	const filtered = useMemo(() => {
		if (!markets) return [];
		if (filter === "all") return markets;
		return markets.filter((m) => m.status === filter);
	}, [markets, filter]);

	const handleResolve = async (
		id: Id<"markets">,
		side: "Yes" | "No",
		question: string
	) => {
		if (
			!confirm(
				`Resolve "${question}" as ${side}? This pays out all positions and cannot be undone.`
			)
		)
			return;
		try {
			await resolve({ marketId: id, resolution: side });
			toast.success(`Resolved as ${side}`);
		} catch (err) {
			toast.error("Resolve failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleClose = async (id: Id<"markets">) => {
		try {
			await close({ marketId: id });
			toast.info("Market closed to trading");
		} catch (err) {
			toast.error("Close failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleReopen = async (id: Id<"markets">) => {
		try {
			await reopen({ marketId: id });
			toast.info("Market reopened");
		} catch (err) {
			toast.error("Reopen failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleDelete = async (id: Id<"markets">, question: string) => {
		if (
			!confirm(
				`Permanently delete "${question}"? All trades, positions, and comments will be removed.`
			)
		)
			return;
		try {
			await remove({ marketId: id });
			toast.info("Market deleted");
		} catch (err) {
			toast.error("Delete failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<CardTitle>All markets</CardTitle>
						<CardDescription>
							Close to halt trading. Resolve to settle positions.
						</CardDescription>
					</div>
					<Select
						value={filter}
						onValueChange={(v) => setFilter(v as typeof filter)}
					>
						<SelectTrigger className="w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="closed">Closed</SelectItem>
							<SelectItem value="resolved">Resolved</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				{markets === undefined ? (
					<Skeleton className="h-40" />
				) : filtered.length === 0 ? (
					<div className="rounded-md border border-dashed py-12 text-center text-muted-foreground text-sm">
						No markets in this view.
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Market</TableHead>
									<TableHead className="hidden md:table-cell">
										Category
									</TableHead>
									<TableHead className="text-right">Yes</TableHead>
									<TableHead className="hidden text-right sm:table-cell">
										Volume
									</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((m) => (
									<MarketRow
										key={m._id}
										market={m}
										onResolve={handleResolve}
										onClose={handleClose}
										onReopen={handleReopen}
										onDelete={handleDelete}
									/>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function MarketRow({
	market,
	onResolve,
	onClose,
	onReopen,
	onDelete,
}: {
	market: Doc<"markets">;
	onResolve: (id: Id<"markets">, side: "Yes" | "No", question: string) => void;
	onClose: (id: Id<"markets">) => void;
	onReopen: (id: Id<"markets">) => void;
	onDelete: (id: Id<"markets">, question: string) => void;
}) {
	return (
		<TableRow>
			<TableCell className="max-w-[360px]">
				<Link
					to="/market/$id"
					params={{ id: market.slug }}
					className="font-medium hover:text-primary"
				>
					{market.question}
				</Link>
				<div className="text-muted-foreground text-xs">/{market.slug}</div>
			</TableCell>
			<TableCell className="hidden md:table-cell">
				<Badge variant="outline">{market.category}</Badge>
			</TableCell>
			<TableCell className="text-right font-mono">
				{Math.round(market.yesPrice * 100)}%
			</TableCell>
			<TableCell className="hidden text-right font-mono sm:table-cell">
				{money(market.volume)}
			</TableCell>
			<TableCell>
				<StatusBadge market={market} />
			</TableCell>
			<TableCell className="text-right">
				<div className="flex flex-wrap justify-end gap-1">
					{market.status === "open" && (
						<>
							<Button
								size="sm"
								variant="yes-soft"
								onClick={() => onResolve(market._id, "Yes", market.question)}
							>
								Yes
							</Button>
							<Button
								size="sm"
								variant="no-soft"
								onClick={() => onResolve(market._id, "No", market.question)}
							>
								No
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => onClose(market._id)}
							>
								<Lock />
							</Button>
						</>
					)}
					{market.status === "closed" && (
						<>
							<Button
								size="sm"
								variant="yes-soft"
								onClick={() => onResolve(market._id, "Yes", market.question)}
							>
								Resolve Yes
							</Button>
							<Button
								size="sm"
								variant="no-soft"
								onClick={() => onResolve(market._id, "No", market.question)}
							>
								Resolve No
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => onReopen(market._id)}
							>
								Reopen
							</Button>
						</>
					)}
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onDelete(market._id, market.question)}
						aria-label="Delete market"
					>
						<Trash2 />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

function StatusBadge({ market }: { market: Doc<"markets"> }) {
	if (market.status === "open")
		return (
			<Badge variant="brand" className="gap-1">
				<span className="size-1.5 rounded-full bg-primary-foreground" />
				Open
			</Badge>
		);
	if (market.status === "closed")
		return (
			<Badge variant="outline" className="gap-1">
				<Lock className="size-3" /> Closed
			</Badge>
		);
	return (
		<Badge
			variant={market.resolution === "Yes" ? "yes" : "no"}
			className="gap-1"
		>
			{market.resolution === "Yes" ? (
				<CheckCircle2 className="size-3" />
			) : (
				<XCircle className="size-3" />
			)}
			{market.resolution}
		</Badge>
	);
}

function CreateMarketForm() {
	const create = useMutation(api.admin.createMarket);
	const [question, setQuestion] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("Antics");
	const [tagInput, setTagInput] = useState("");
	const [closesAt, setClosesAt] = useState("");
	const [customAt, setCustomAt] = useState<string>(() => {
		const d = new Date(Date.now() + 7 * 86_400_000);
		const off = d.getTimezoneOffset() * 60_000;
		return new Date(d.getTime() - off).toISOString().slice(0, 16);
	});
	const [yesPrice, setYesPrice] = useState(0.5);
	const [liquidity, setLiquidity] = useState(2_000);
	const [slug, setSlug] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const closesAtMs = useMemo(() => {
		const ms = new Date(customAt).getTime();
		return Number.isFinite(ms) ? ms : Number.NaN;
	}, [customAt]);

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
					closesAt.trim() ||
					new Date(closesAtMs).toLocaleDateString([], {
						month: "short",
						day: "numeric",
					}),
				closesAtMs,
				initialYesPrice: yesPrice,
				initialLiquidity: liquidity,
				slugOverride: slug.trim() || undefined,
			});
			toast.success("Market created", {
				description: `/market/${r.slug}`,
			});
			setQuestion("");
			setDescription("");
			setTagInput("");
			setClosesAt("");
			setSlug("");
		} catch (err) {
			toast.error("Create failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create market directly</CardTitle>
				<CardDescription>
					Skips the proposal flow. Use for editorial picks or to add trusted
					markets.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="a-question">Question</Label>
						<Input
							id="a-question"
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder="Will Charles…?"
							maxLength={140}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="a-description">Description (optional)</Label>
						<Textarea
							id="a-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							maxLength={1_000}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="a-cat">Category</Label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger id="a-cat">
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
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="a-slug">Slug (optional)</Label>
							<Input
								id="a-slug"
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="auto-generated from question"
								className="font-mono"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="a-tags">Tags (comma-separated)</Label>
							<Input
								id="a-tags"
								value={tagInput}
								onChange={(e) => setTagInput(e.target.value)}
								placeholder="weekend, chaos"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="a-closes">Closes at</Label>
							<Input
								id="a-closes"
								type="datetime-local"
								value={customAt}
								onChange={(e) => setCustomAt(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="a-closesLabel">Display label (optional)</Label>
							<Input
								id="a-closesLabel"
								value={closesAt}
								onChange={(e) => setClosesAt(e.target.value)}
								placeholder="e.g. 'Fri 9:00 PM'"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="a-yes">
								Starting Yes ({CURRENCY_SYMBOL}
								{Math.round(yesPrice * 100)})
							</Label>
							<input
								id="a-yes"
								type="range"
								min={0.02}
								max={0.98}
								step={0.01}
								value={yesPrice}
								onChange={(e) => setYesPrice(Number(e.target.value))}
								className="w-full accent-primary"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="a-liq">Initial liquidity</Label>
							<Input
								id="a-liq"
								type="number"
								min={100}
								max={50_000}
								step={50}
								value={liquidity}
								onChange={(e) => setLiquidity(Number(e.target.value))}
								className="font-mono"
							/>
						</div>
					</div>
					<Button type="submit" disabled={submitting}>
						{submitting ? (
							"Creating…"
						) : (
							<>
								<Plus /> Create market
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function KV({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-muted-foreground uppercase tracking-wide">{label}</dt>
			<dd className="font-medium">{value}</dd>
		</div>
	);
}

function NotAuthorized() {
	return (
		<Card className="mt-12 border-amber-500/40 bg-amber-50 dark:border-amber-700/30 dark:bg-amber-500/5">
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<AlertTriangle className="size-8 text-amber-600 dark:text-amber-400" />
				<h2 className="font-semibold text-xl">Admin only</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					This area is restricted to moderators. Ask an existing admin to grant
					you access.
				</p>
				<Button asChild variant="outline">
					<Link to="/markets">Back to markets</Link>
				</Button>
			</CardContent>
		</Card>
	);
}

function SignInGate() {
	return (
		<Card className="mt-12 border-primary/30 bg-accent/30">
			<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
				<h2 className="font-semibold text-xl">Sign in to continue</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					Admin tools require authentication.
				</p>
				<SignInButton size="lg" label="Sign in with Google" />
			</CardContent>
		</Card>
	);
}
