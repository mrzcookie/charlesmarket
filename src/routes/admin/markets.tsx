import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery } from "convex/react";
import {
	Bell,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Clock,
	ExternalLink,
	Filter,
	Lock,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Kicker } from "@/components/console";
import { useRegisterTable } from "@/components/table-devtools";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CURRENCY_SYMBOL, categories, money } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/markets")({
	component: MarketsPage,
});

type UnifiedRow = {
	id: string;
	rowType: "market" | "proposal";
	question: string;
	category: string;
	status: string;
	closesAtMs: number;
	closesAt: string;
	yesPrice?: number;
	volume?: number;
	slug?: string;
	resolution?: "Yes" | "No";
	marketId?: Id<"markets">;
	proposalId?: Id<"marketProposals">;
	proposerHandle?: string;
	rejectionReason?: string;
	approvedMarketSlug?: string;
};

function MarketsPage() {
	const markets = useQuery(api.admin.listAll, {});
	const proposals = useQuery(api.proposals.listAll, {});

	const rows = useMemo<UnifiedRow[]>(() => {
		const marketRows: UnifiedRow[] = (markets ?? []).map((m) => ({
			id: m._id,
			rowType: "market",
			question: m.question,
			category: m.category,
			status: m.status,
			closesAtMs: m.closesAtMs,
			closesAt: m.closesAt,
			yesPrice: m.yesPrice,
			volume: m.volume,
			slug: m.slug,
			resolution: m.resolution,
			marketId: m._id,
		}));

		const proposalRows: UnifiedRow[] = (proposals ?? [])
			.filter((p) => p.status !== "approved")
			.map((p) => ({
				id: p._id,
				rowType: "proposal",
				question: p.question,
				category: p.category,
				status: p.status,
				closesAtMs: p.closesAtMs,
				closesAt: p.closesAt,
				proposalId: p._id,
				proposerHandle: p.proposerHandle,
				rejectionReason: p.rejectionReason,
				approvedMarketSlug: p.approvedMarketSlug,
			}));

		return [...marketRows, ...proposalRows].sort(
			(a, b) => b.closesAtMs - a.closesAtMs
		);
	}, [markets, proposals]);

	const endedMarkets = useMemo(() => {
		const now = Date.now();
		return (markets ?? []).filter(
			(m) =>
				(m.status === "open" && m.closesAtMs < now) || m.status === "closed"
		);
	}, [markets]);

	const isLoading = markets === undefined || proposals === undefined;

	return (
		<div className="space-y-6">
			<MarketsHeader
				endedCount={endedMarkets.length}
				endedMarkets={endedMarkets}
			/>
			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 5 }, (_, i) => `mkt-skel-${i}`).map((k) => (
						<Skeleton key={k} className="h-12 w-full rounded-lg" />
					))}
				</div>
			) : (
				<MarketsTable rows={rows} />
			)}
		</div>
	);
}

function MarketsHeader({
	endedCount,
	endedMarkets,
}: {
	endedCount: number;
	endedMarkets: ReturnType<typeof useQuery<typeof api.admin.listAll>>;
}) {
	const [createOpen, setCreateOpen] = useState(false);
	const [bellOpen, setBellOpen] = useState(false);

	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div>
				<Kicker>TICKETS &amp; PROPOSALS</Kicker>
				<h1 className="display-headline mt-2 text-3xl sm:text-4xl">
					Ticket management
				</h1>
				<p className="mt-2 max-w-xl text-bone-2 text-sm">
					Approve proposals, resolve tickets, and manage the full lifecycle.
				</p>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="icon"
					className={cn(
						"relative",
						endedCount > 0 &&
							"border-brand/60 text-brand hover:bg-brand-wash dark:text-brand dark:hover:bg-brand-wash"
					)}
					onClick={() => setBellOpen(true)}
					title={`${endedCount} market${endedCount !== 1 ? "s" : ""} need attention`}
				>
					<Bell className="size-4" />
					{endedCount > 0 && (
						<span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand font-bold text-[10px] text-white">
							{endedCount > 9 ? "9+" : endedCount}
						</span>
					)}
				</Button>

				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button className="gap-2">
							<Plus className="size-4" />
							Create market
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Create market</DialogTitle>
							<DialogDescription>
								Skips the proposal flow. Use for editorial picks or trusted
								markets.
							</DialogDescription>
						</DialogHeader>
						<CreateMarketForm onSuccess={() => setCreateOpen(false)} />
					</DialogContent>
				</Dialog>
			</div>

			<Sheet open={bellOpen} onOpenChange={setBellOpen}>
				<SheetContent side="right" className="w-full max-w-md">
					<SheetHeader>
						<SheetTitle className="flex items-center gap-2">
							<Bell className="size-4 text-brand" />
							Markets needing attention
						</SheetTitle>
						<SheetDescription>
							{endedCount === 0
								? "All markets are up to date."
								: `${endedCount} market${endedCount !== 1 ? "s" : ""} require resolution.`}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-4 space-y-3">
						{endedCount === 0 ? (
							<div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">
								<CheckCircle2 className="mx-auto mb-2 size-6 opacity-40" />
								No markets need attention right now.
							</div>
						) : (
							(endedMarkets ?? []).map((m) => (
								<EndedMarketCard key={m._id} market={m} />
							))
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

function EndedMarketCard({
	market,
}: {
	market: NonNullable<
		ReturnType<typeof useQuery<typeof api.admin.listAll>>
	>[number];
}) {
	const resolve = useMutation(api.admin.resolveMarket);
	const close = useMutation(api.admin.closeMarket);
	const now = Date.now();
	const isOverdue = market.status === "open" && market.closesAtMs < now;
	const overdueMs = now - market.closesAtMs;
	const overdueDays = Math.floor(overdueMs / 86_400_000);
	const overdueHours = Math.floor((overdueMs % 86_400_000) / 3_600_000);

	const handleResolve = async (side: "Yes" | "No") => {
		try {
			await resolve({ marketId: market._id, resolution: side });
			toast.success(`Resolved as ${side}`);
		} catch (err) {
			toast.error("Resolve failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const handleClose = async () => {
		try {
			await close({ marketId: market._id });
			toast.info("Market closed");
		} catch (err) {
			toast.error("Close failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<div className="rounded-lg border bg-card p-3">
			<div className="mb-2 flex items-start justify-between gap-2">
				<p className="line-clamp-2 font-medium text-sm leading-snug">
					{market.question}
				</p>
				{isOverdue ? (
					<Badge
						variant="outline"
						className="shrink-0 border-brand/40 text-brand text-xs dark:text-brand"
					>
						<Clock className="mr-1 size-3" />
						{overdueDays > 0
							? `${overdueDays}d overdue`
							: `${overdueHours}h overdue`}
					</Badge>
				) : (
					<Badge variant="outline" className="shrink-0 text-xs">
						<Lock className="mr-1 size-3" />
						Closed
					</Badge>
				)}
			</div>
			<div className="flex flex-wrap gap-1.5">
				{market.status === "open" && (
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs"
						onClick={handleClose}
					>
						<Lock className="size-3" /> Close
					</Button>
				)}
				<Button
					size="sm"
					variant="yes-soft"
					className="h-7 text-xs"
					onClick={() => handleResolve("Yes")}
				>
					Resolve Yes
				</Button>
				<Button
					size="sm"
					variant="no-soft"
					className="h-7 text-xs"
					onClick={() => handleResolve("No")}
				>
					Resolve No
				</Button>
			</div>
		</div>
	);
}

function MarketsTable({ rows }: { rows: UnifiedRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const resolve = useMutation(api.admin.resolveMarket);
	const close = useMutation(api.admin.closeMarket);
	const reopen = useMutation(api.admin.reopenMarket);
	const deleteMarket = useMutation(api.admin.deleteMarket);
	const approve = useMutation(api.proposals.approve);
	const removeProposal = useMutation(api.proposals.remove);

	const [confirmDialog, setConfirmDialog] = useState<{
		open: boolean;
		title: string;
		description: string;
		onConfirm: () => Promise<void>;
	}>({ open: false, title: "", description: "", onConfirm: async () => {} });

	const [rejectDialog, setRejectDialog] = useState<{
		open: boolean;
		proposalId: Id<"marketProposals"> | null;
	}>({ open: false, proposalId: null });

	const handleResolve = useCallback(
		async (id: Id<"markets">, side: "Yes" | "No", question: string) => {
			setConfirmDialog({
				open: true,
				title: `Resolve as ${side}?`,
				description: `"${question}" — This pays out all positions and cannot be undone.`,
				onConfirm: async () => {
					await resolve({ marketId: id, resolution: side });
					toast.success(`Resolved as ${side}`);
				},
			});
		},
		[resolve]
	);

	const handleClose = useCallback(
		async (id: Id<"markets">) => {
			try {
				await close({ marketId: id });
				toast.info("Market closed to trading");
			} catch (err) {
				toast.error("Close failed", {
					description: err instanceof Error ? err.message : String(err),
				});
			}
		},
		[close]
	);

	const handleReopen = useCallback(
		async (id: Id<"markets">) => {
			try {
				await reopen({ marketId: id });
				toast.info("Market reopened");
			} catch (err) {
				toast.error("Reopen failed", {
					description: err instanceof Error ? err.message : String(err),
				});
			}
		},
		[reopen]
	);

	const handleDeleteMarket = useCallback(
		async (id: Id<"markets">, question: string) => {
			setConfirmDialog({
				open: true,
				title: "Delete market?",
				description: `"${question}" — All trades, positions, and comments will be permanently removed.`,
				onConfirm: async () => {
					await deleteMarket({ marketId: id });
					toast.info("Market deleted");
				},
			});
		},
		[deleteMarket]
	);

	const handleApprove = useCallback(
		async (id: Id<"marketProposals">) => {
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
		},
		[approve]
	);

	const handleDeleteProposal = useCallback(
		async (id: Id<"marketProposals">, question: string) => {
			setConfirmDialog({
				open: true,
				title: "Delete proposal?",
				description: `"${question}" will be permanently removed.`,
				onConfirm: async () => {
					await removeProposal({ proposalId: id });
					toast.info("Proposal deleted");
				},
			});
		},
		[removeProposal]
	);

	const filteredRows = useMemo(() => {
		let r = rows;
		if (typeFilter !== "all") r = r.filter((x) => x.rowType === typeFilter);
		if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
		if (globalFilter.trim()) {
			const q = globalFilter.toLowerCase();
			r = r.filter((x) => x.question.toLowerCase().includes(q));
		}
		return r;
	}, [rows, typeFilter, statusFilter, globalFilter]);

	const columns = useMemo<ColumnDef<UnifiedRow>[]>(
		() => [
			{
				id: "rowType",
				header: "Type",
				accessorKey: "rowType",
				cell: ({ row }) =>
					row.original.rowType === "market" ? (
						<Badge variant="brand" className="text-xs">
							Market
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="border-violet-500/40 text-violet-600 text-xs dark:text-violet-400"
						>
							Proposal
						</Badge>
					),
				enableSorting: false,
				size: 100,
			},
			{
				id: "question",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Question
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorKey: "question",
				cell: ({ row }) => {
					const r = row.original;
					return (
						<div className="max-w-[380px]">
							{r.rowType === "market" && r.slug ? (
								<Link
									to="/ticket/$id"
									params={{ id: r.slug }}
									className="font-medium text-sm hover:text-primary hover:underline"
								>
									{r.question}
								</Link>
							) : (
								<span className="font-medium text-sm">{r.question}</span>
							)}
							{r.rowType === "proposal" && r.proposerHandle && (
								<p className="mt-0.5 text-muted-foreground text-xs">
									by {r.proposerHandle}
								</p>
							)}
							{r.rejectionReason && (
								<p className="mt-0.5 text-destructive text-xs">
									Rejected: {r.rejectionReason}
								</p>
							)}
						</div>
					);
				},
				enableSorting: true,
			},
			{
				id: "category",
				header: "Category",
				accessorKey: "category",
				cell: ({ row }) => (
					<Badge variant="outline" className="text-xs">
						{row.original.category}
					</Badge>
				),
				enableSorting: false,
			},
			{
				id: "status",
				header: "Status",
				accessorKey: "status",
				cell: ({ row }) => (
					<StatusBadge
						status={row.original.status}
						resolution={row.original.resolution}
						closesAtMs={row.original.closesAtMs}
					/>
				),
				enableSorting: false,
			},
			{
				id: "yesPrice",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Yes%
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorFn: (row) => row.yesPrice ?? -1,
				cell: ({ row }) =>
					row.original.rowType === "market" ? (
						<span className="font-mono text-sm">
							{Math.round((row.original.yesPrice ?? 0) * 100)}%
						</span>
					) : (
						<span className="text-muted-foreground text-xs">—</span>
					),
				enableSorting: true,
			},
			{
				id: "volume",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Volume
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorFn: (row) => row.volume ?? -1,
				cell: ({ row }) =>
					row.original.rowType === "market" ? (
						<span className="font-mono text-sm">
							{money(row.original.volume ?? 0)}
						</span>
					) : (
						<span className="text-muted-foreground text-xs">—</span>
					),
				enableSorting: true,
			},
			{
				id: "closesAt",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Closes
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorKey: "closesAtMs",
				cell: ({ row }) => {
					const isOverdue =
						row.original.closesAtMs < Date.now() &&
						row.original.status === "open";
					return (
						<span
							className={cn(
								"text-xs",
								isOverdue
									? "font-medium text-brand dark:text-brand"
									: "text-muted-foreground"
							)}
						>
							{isOverdue && <Clock className="mr-1 inline size-3" />}
							{row.original.closesAt}
						</span>
					);
				},
				enableSorting: true,
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<ActionsCell
						row={row.original}
						onResolve={handleResolve}
						onClose={handleClose}
						onReopen={handleReopen}
						onDeleteMarket={handleDeleteMarket}
						onApprove={handleApprove}
						onReject={(id) => setRejectDialog({ open: true, proposalId: id })}
						onDeleteProposal={handleDeleteProposal}
					/>
				),
				enableSorting: false,
				size: 60,
			},
		],
		[
			handleResolve,
			handleClose,
			handleReopen,
			handleDeleteMarket,
			handleApprove,
			handleDeleteProposal,
		]
	);

	const table = useReactTable({
		data: filteredRows,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: { pagination: { pageSize: 20 } },
		debugTable: import.meta.env.DEV,
	});

	useRegisterTable("Markets & Proposals", table);

	return (
		<>
			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-48 flex-1">
					<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-9"
						placeholder="Search questions…"
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
					/>
					{globalFilter && (
						<button
							type="button"
							onClick={() => setGlobalFilter("")}
							className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="size-4" />
						</button>
					)}
				</div>

				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-[150px]">
						<Filter className="mr-2 size-3.5 text-muted-foreground" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All types</SelectItem>
						<SelectItem value="market">Markets</SelectItem>
						<SelectItem value="proposal">Proposals</SelectItem>
					</SelectContent>
				</Select>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="open">Open</SelectItem>
						<SelectItem value="closed">Closed</SelectItem>
						<SelectItem value="resolved">Resolved</SelectItem>
						<SelectItem value="pending">Pending</SelectItem>
						<SelectItem value="rejected">Rejected</SelectItem>
					</SelectContent>
				</Select>

				{(typeFilter !== "all" || statusFilter !== "all" || globalFilter) && (
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground"
						onClick={() => {
							setTypeFilter("all");
							setStatusFilter("all");
							setGlobalFilter("");
						}}
					>
						<X className="size-3.5" />
						Clear filters
					</Button>
				)}

				<span className="ml-auto text-muted-foreground text-xs">
					{filteredRows.length} row{filteredRows.length !== 1 ? "s" : ""}
				</span>
			</div>

			{/* Table */}
			<div className="rounded-lg border bg-card">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((hg) => (
								<TableRow key={hg.id} className="hover:bg-transparent">
									{hg.headers.map((header) => (
										<TableHead key={header.id} className="whitespace-nowrap">
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="py-16 text-center text-muted-foreground text-sm"
									>
										<div className="flex flex-col items-center gap-2">
											<Filter className="size-6 opacity-30" />
											No rows match the current filters.
										</div>
									</TableCell>
								</TableRow>
							) : (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id} className="group">
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id} className="py-3">
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				{table.getPageCount() > 1 && (
					<div className="flex items-center justify-between border-t px-4 py-3">
						<p className="text-muted-foreground text-sm">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</p>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="icon"
								className="size-8"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="size-8"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight className="size-4" />
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Confirm dialog */}
			<ConfirmDialog
				open={confirmDialog.open}
				title={confirmDialog.title}
				description={confirmDialog.description}
				onConfirm={async () => {
					try {
						await confirmDialog.onConfirm();
					} catch (err) {
						toast.error("Action failed", {
							description: err instanceof Error ? err.message : String(err),
						});
					} finally {
						setConfirmDialog((d) => ({ ...d, open: false }));
					}
				}}
				onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
			/>

			{/* Reject dialog */}
			<RejectProposalDialog
				open={rejectDialog.open}
				proposalId={rejectDialog.proposalId}
				onClose={() => setRejectDialog({ open: false, proposalId: null })}
			/>
		</>
	);
}

function ActionsCell({
	row,
	onResolve,
	onClose,
	onReopen,
	onDeleteMarket,
	onApprove,
	onReject,
	onDeleteProposal,
}: {
	row: UnifiedRow;
	onResolve: (id: Id<"markets">, side: "Yes" | "No", question: string) => void;
	onClose: (id: Id<"markets">) => void;
	onReopen: (id: Id<"markets">) => void;
	onDeleteMarket: (id: Id<"markets">, question: string) => void;
	onApprove: (id: Id<"marketProposals">) => void;
	onReject: (id: Id<"marketProposals">) => void;
	onDeleteProposal: (id: Id<"marketProposals">, question: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				{row.rowType === "market" && row.marketId
					? (() => {
							const marketId = row.marketId;
							return (
								<>
									{row.slug && (
										<DropdownMenuItem asChild>
											<Link
												to="/ticket/$id"
												params={{ id: row.slug }}
												className="flex items-center gap-2"
											>
												<ExternalLink className="size-3.5" />
												View market
											</Link>
										</DropdownMenuItem>
									)}
									{row.status === "open" && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => onClose(marketId)}>
												<Lock className="size-3.5" />
												Close trading
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-brand focus:text-brand"
												onClick={() => onResolve(marketId, "Yes", row.question)}
											>
												<CheckCircle2 className="size-3.5" />
												Resolve Yes
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-magenta focus:text-magenta"
												onClick={() => onResolve(marketId, "No", row.question)}
											>
												<XCircle className="size-3.5" />
												Resolve No
											</DropdownMenuItem>
										</>
									)}
									{row.status === "closed" && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={() => onReopen(marketId)}>
												Reopen trading
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-brand focus:text-brand"
												onClick={() => onResolve(marketId, "Yes", row.question)}
											>
												<CheckCircle2 className="size-3.5" />
												Resolve Yes
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-magenta focus:text-magenta"
												onClick={() => onResolve(marketId, "No", row.question)}
											>
												<XCircle className="size-3.5" />
												Resolve No
											</DropdownMenuItem>
										</>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => onDeleteMarket(marketId, row.question)}
									>
										<Trash2 className="size-3.5" />
										Delete market
									</DropdownMenuItem>
								</>
							);
						})()
					: null}

				{row.rowType === "proposal" && row.proposalId
					? (() => {
							const proposalId = row.proposalId;
							return (
								<>
									{row.status === "pending" && (
										<>
											<DropdownMenuItem
												className="text-brand focus:text-brand"
												onClick={() => onApprove(proposalId)}
											>
												<CheckCircle2 className="size-3.5" />
												Approve
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onClick={() => onReject(proposalId)}
											>
												<XCircle className="size-3.5" />
												Reject
											</DropdownMenuItem>
										</>
									)}
									{row.approvedMarketSlug && (
										<DropdownMenuItem asChild>
											<Link
												to="/ticket/$id"
												params={{ id: row.approvedMarketSlug }}
												className="flex items-center gap-2"
											>
												<ExternalLink className="size-3.5" />
												View market
											</Link>
										</DropdownMenuItem>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => onDeleteProposal(proposalId, row.question)}
									>
										<Trash2 className="size-3.5" />
										Delete proposal
									</DropdownMenuItem>
								</>
							);
						})()
					: null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function StatusBadge({
	status,
	resolution,
	closesAtMs,
}: {
	status: string;
	resolution?: "Yes" | "No";
	closesAtMs: number;
}) {
	const isOverdue = status === "open" && closesAtMs < Date.now();

	if (status === "open")
		return isOverdue ? (
			<Badge
				variant="outline"
				className="gap-1 border-brand/40 text-brand dark:text-brand"
			>
				<Clock className="size-3" />
				Overdue
			</Badge>
		) : (
			<Badge variant="brand" className="gap-1">
				<span className="size-1.5 rounded-full bg-primary-foreground" />
				Open
			</Badge>
		);

	if (status === "closed")
		return (
			<Badge variant="outline" className="gap-1">
				<Lock className="size-3" />
				Closed
			</Badge>
		);

	if (status === "resolved")
		return (
			<Badge variant={resolution === "Yes" ? "yes" : "no"} className="gap-1">
				{resolution === "Yes" ? (
					<CheckCircle2 className="size-3" />
				) : (
					<XCircle className="size-3" />
				)}
				{resolution}
			</Badge>
		);

	if (status === "pending")
		return (
			<Badge
				variant="outline"
				className="gap-1 border-brand/40 bg-brand-wash text-brand dark:bg-brand-wash dark:text-brand"
			>
				Pending
			</Badge>
		);

	if (status === "rejected")
		return (
			<Badge variant="outline" className="gap-1 text-destructive">
				<XCircle className="size-3" />
				Rejected
			</Badge>
		);

	return <Badge variant="outline">{status}</Badge>;
}

function ConfirmDialog({
	open,
	title,
	description,
	onConfirm,
	onCancel,
}: {
	open: boolean;
	title: string;
	description: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const [loading, setLoading] = useState(false);
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel} disabled={loading}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={loading}
						onClick={async () => {
							setLoading(true);
							await onConfirm();
							setLoading(false);
						}}
					>
						{loading ? "Working…" : "Confirm"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RejectProposalDialog({
	open,
	proposalId,
	onClose,
}: {
	open: boolean;
	proposalId: Id<"marketProposals"> | null;
	onClose: () => void;
}) {
	const rejectMutation = useMutation(api.proposals.reject);
	const [reason, setReason] = useState("");
	const [loading, setLoading] = useState(false);

	const handleReject = async () => {
		if (!proposalId) return;
		setLoading(true);
		try {
			await rejectMutation({
				proposalId,
				reason: reason.trim() || undefined,
			});
			toast.info("Proposal rejected");
			onClose();
			setReason("");
		} catch (err) {
			toast.error("Reject failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Reject proposal</DialogTitle>
					<DialogDescription>
						Optionally provide a reason. The proposer will see this note.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="reject-reason">Reason (optional)</Label>
					<Textarea
						id="reject-reason"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g. Too vague, or already covered by an existing market."
						rows={3}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={loading}
						onClick={handleReject}
					>
						{loading ? "Rejecting…" : "Reject"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CreateMarketForm({ onSuccess }: { onSuccess: () => void }) {
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
		<form className="space-y-5" onSubmit={handleSubmit}>
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
				<Label htmlFor="cm-description">Description (optional)</Label>
				<Textarea
					id="cm-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					maxLength={1_000}
				/>
			</div>
			<div className="grid grid-cols-2 gap-4">
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
					<Label htmlFor="cm-tags">Tags (comma-separated)</Label>
					<Input
						id="cm-tags"
						value={tagInput}
						onChange={(e) => setTagInput(e.target.value)}
						placeholder="weekend, chaos"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
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
					<Label htmlFor="cm-closes-label">Display label (optional)</Label>
					<Input
						id="cm-closes-label"
						value={closesAt}
						onChange={(e) => setClosesAt(e.target.value)}
						placeholder="e.g. 'Fri 9:00 PM'"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
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
						className="mt-2 w-full accent-primary"
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
						className="font-mono"
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label htmlFor="cm-slug">Slug (optional)</Label>
				<Input
					id="cm-slug"
					value={slug}
					onChange={(e) => setSlug(e.target.value)}
					placeholder="auto-generated from question"
					className="font-mono text-sm"
				/>
			</div>
			<DialogFooter>
				<Button
					type="submit"
					disabled={submitting}
					className="w-full sm:w-auto"
				>
					{submitting ? (
						"Creating…"
					) : (
						<>
							<Plus className="size-4" />
							Create market
						</>
					)}
				</Button>
			</DialogFooter>
		</form>
	);
}
