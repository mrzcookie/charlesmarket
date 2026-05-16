import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	Check,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Minus,
	Pencil,
	Plus,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BracketChip, Kicker } from "@/components/console";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/users")({
	component: UsersPage,
});

type UserRow = {
	_id: Id<"users">;
	_creationTime: number;
	email: string | null;
	handle: string;
	name: string | null;
	balance: number;
	joinedAt: number | null;
	isAdmin: boolean;
};

type SortKey = "joinedAt" | "balance" | "handle";

function UsersPage() {
	const users = useQuery(api.admin.listUsers, {});
	const [query, setQuery] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);

	const rows = useMemo(() => {
		if (!users) return [];
		const q = query.trim().toLowerCase();
		const filtered = q
			? users.filter(
					(u) =>
						u.handle.toLowerCase().includes(q) ||
						(u.name ?? "").toLowerCase().includes(q) ||
						(u.email ?? "").toLowerCase().includes(q)
				)
			: users;
		const sorted = [...filtered] as UserRow[];
		sorted.sort((a, b) => {
			let cmp = 0;
			if (sortKey === "balance") cmp = (a.balance ?? 0) - (b.balance ?? 0);
			else if (sortKey === "handle") cmp = a.handle.localeCompare(b.handle);
			else cmp = (a.joinedAt ?? 0) - (b.joinedAt ?? 0);
			return sortDir === "asc" ? cmp : -cmp;
		});
		return sorted;
	}, [users, query, sortKey, sortDir]);

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir(key === "handle" ? "asc" : "desc");
		}
	};

	const isLoading = users === undefined;

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<Kicker>ACCOUNTS</Kicker>
					<h1 className="display-headline mt-2 text-3xl sm:text-4xl">Users</h1>
					<p className="mt-2 max-w-xl text-bone-2 text-sm">
						Edit handles, adjust balances, grant or revoke admin, and inspect
						every trader's full activity.
					</p>
				</div>
				{users !== undefined ? (
					<Badge variant="outline">
						{users.length} {users.length === 1 ? "USER" : "USERS"}
					</Badge>
				) : null}
			</header>

			<div className="relative max-w-md">
				<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-bone-3" />
				<Input
					type="search"
					placeholder="Search by handle, name, or email…"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="pl-9"
				/>
				{query ? (
					<button
						type="button"
						onClick={() => setQuery("")}
						className="absolute top-1/2 right-3 -translate-y-1/2 text-bone-3 hover:text-bone"
						aria-label="Clear search"
					>
						<X className="size-4" />
					</button>
				) : null}
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 6 }, (_, i) => `user-skel-${i}`).map((k) => (
						<Skeleton key={k} className="h-14 w-full" />
					))}
				</div>
			) : rows.length === 0 ? (
				<div className="space-y-3 border border-rule border-dashed bg-ink-2 px-6 py-12 text-center">
					<Kicker>
						{users && users.length === 0 ? "EMPTY" : "NO MATCHES"}
					</Kicker>
					<p className="font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
						{users && users.length === 0
							? "No users yet. Once people sign in, they show up here."
							: "Nothing matches that search."}
					</p>
				</div>
			) : (
				<>
					<div className="hidden border border-rule md:block">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12 pl-4" />
									<TableHead>
										<SortButton
											active={sortKey === "handle"}
											dir={sortDir}
											onClick={() => toggleSort("handle")}
										>
											Handle
										</SortButton>
									</TableHead>
									<TableHead className="hidden lg:table-cell">Email</TableHead>
									<TableHead className="text-right">
										<SortButton
											active={sortKey === "balance"}
											dir={sortDir}
											onClick={() => toggleSort("balance")}
											className="ml-auto"
										>
											Balance
										</SortButton>
									</TableHead>
									<TableHead>Role</TableHead>
									<TableHead className="pr-4 text-right">
										<SortButton
											active={sortKey === "joinedAt"}
											dir={sortDir}
											onClick={() => toggleSort("joinedAt")}
											className="ml-auto"
										>
											Joined
										</SortButton>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((u) => (
									<TableRow
										key={u._id}
										className="cursor-pointer transition-colors hover:bg-ink-3"
										onClick={() => setDrawerUser(u)}
									>
										<TableCell className="pl-4">
											<TraderAvatar handle={u.handle} />
										</TableCell>
										<TableCell>
											<div className="font-mono font-semibold text-bone">
												{u.handle}
											</div>
											{u.name ? (
												<div className="font-mono text-bone-3 text-xs">
													{u.name}
												</div>
											) : null}
										</TableCell>
										<TableCell className="hidden max-w-[220px] truncate font-mono text-bone-2 text-xs lg:table-cell">
											{u.email ?? "—"}
										</TableCell>
										<TableCell className="text-right font-mono text-sm tabular-nums">
											{CURRENCY_SYMBOL}
											{Math.round(u.balance).toLocaleString()}
										</TableCell>
										<TableCell>
											{u.isAdmin ? (
												<BracketChip>ADMIN</BracketChip>
											) : (
												<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
													trader
												</span>
											)}
										</TableCell>
										<TableCell className="pr-4 text-right font-mono text-bone-3 text-xs">
											{formatJoined(u.joinedAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<ul className="space-y-2 md:hidden">
						{rows.map((u) => (
							<li key={u._id}>
								<button
									type="button"
									onClick={() => setDrawerUser(u)}
									className="flex w-full items-center gap-3 border border-rule bg-ink-2 p-3 text-left transition-colors hover:border-rule-bright"
								>
									<TraderAvatar handle={u.handle} />
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate font-mono font-semibold text-bone text-sm">
												{u.handle}
											</span>
											{u.isAdmin ? <BracketChip>ADMIN</BracketChip> : null}
										</div>
										<div className="mt-0.5 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
											{CURRENCY_SYMBOL}
											{Math.round(u.balance).toLocaleString()} ·{" "}
											{formatJoined(u.joinedAt)}
										</div>
									</div>
								</button>
							</li>
						))}
					</ul>
				</>
			)}

			<UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
		</div>
	);
}

// ----------------------------------------------------------------------------
// Sort button
// ----------------------------------------------------------------------------

function SortButton({
	children,
	active,
	dir,
	onClick,
	className,
}: {
	children: React.ReactNode;
	active: boolean;
	dir: "asc" | "desc";
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center gap-1 transition-colors hover:text-bone",
				active && "text-bone",
				className
			)}
		>
			{children}
			{active ? (
				dir === "asc" ? (
					<ChevronUp className="size-3" />
				) : (
					<ChevronDown className="size-3" />
				)
			) : null}
		</button>
	);
}

// ----------------------------------------------------------------------------
// User detail drawer
// ----------------------------------------------------------------------------

function UserDrawer({
	user,
	onClose,
}: {
	user: UserRow | null;
	onClose: () => void;
}) {
	return (
		<Sheet open={user != null} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="right"
				className="w-full max-w-xl overflow-y-auto bg-ink"
			>
				{user ? (
					<UserDrawerBody key={user._id} user={user} onClose={onClose} />
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function UserDrawerBody({
	user,
	onClose,
}: {
	user: UserRow;
	onClose: () => void;
}) {
	const updateUser = useMutation(api.admin.adminUpdateUser);
	const deleteUserMutation = useMutation(api.admin.deleteUser);
	const grantAdmin = useMutation(api.admin.grantAdmin);
	const revokeAdmin = useMutation(api.admin.revokeAdmin);
	const adjustBalance = useMutation(api.admin.adjustBalance);

	const [handle, setHandle] = useState(user.handle);
	const [savingHandle, setSavingHandle] = useState(false);
	const [editingHandle, setEditingHandle] = useState(false);
	const [balanceDraft, setBalanceDraft] = useState(
		String(Math.round(user.balance))
	);
	const [savingBalance, setSavingBalance] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const saveHandle = async () => {
		setSavingHandle(true);
		try {
			await updateUser({ userId: user._id, handle: handle.trim() });
			toast.success("Handle updated");
			setEditingHandle(false);
		} catch (err) {
			toast.error("Save failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSavingHandle(false);
		}
	};

	const saveBalance = async () => {
		const n = Number(balanceDraft);
		if (!Number.isFinite(n) || n < 0) {
			toast.error("Balance must be a non-negative number");
			return;
		}
		setSavingBalance(true);
		try {
			const next = await adjustBalance({ userId: user._id, setTo: n });
			toast.success(
				`Balance set to ${CURRENCY_SYMBOL}${next.toLocaleString()}`
			);
		} catch (err) {
			toast.error("Adjust failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSavingBalance(false);
		}
	};

	const bump = async (delta: number) => {
		setSavingBalance(true);
		try {
			const next = await adjustBalance({ userId: user._id, delta });
			setBalanceDraft(String(next));
			toast.success(
				`${delta > 0 ? "+" : "−"}${CURRENCY_SYMBOL}${Math.abs(delta).toLocaleString()} · now ${CURRENCY_SYMBOL}${next.toLocaleString()}`
			);
		} catch (err) {
			toast.error("Adjust failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSavingBalance(false);
		}
	};

	const toggleAdmin = async () => {
		try {
			if (user.isAdmin) {
				await revokeAdmin({ userId: user._id });
				toast.info(`Admin revoked from ${user.handle}`);
			} else {
				if (!user.email) throw new Error("No email on file for this user");
				await grantAdmin({ email: user.email });
				toast.success(`Admin granted to ${user.handle}`);
			}
		} catch (err) {
			toast.error("Permissions failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	const performDelete = async () => {
		try {
			await deleteUserMutation({ userId: user._id });
			toast.info(`${user.handle} deleted`);
			onClose();
		} catch (err) {
			toast.error("Delete failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		}
	};

	return (
		<>
			<SheetHeader className="border-rule border-b">
				<div className="flex items-start gap-4">
					<Avatar className="size-12 shrink-0 rounded-[4px]">
						<AvatarFallback className="rounded-[4px] bg-brand font-bold font-mono text-brand-foreground text-sm">
							{user.handle.charAt(1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<SheetTitle className="break-all font-display">
							{user.handle}
						</SheetTitle>
						<SheetDescription className="font-mono text-xs">
							{user.email ?? "no email on file"} · Joined{" "}
							{formatJoined(user.joinedAt)}
						</SheetDescription>
						<div className="mt-2 flex flex-wrap gap-2">
							{user.isAdmin ? <BracketChip>ADMIN</BracketChip> : null}
							<Badge variant="outline">Trader</Badge>
						</div>
					</div>
				</div>
			</SheetHeader>

			<section className="mt-5 border border-rule bg-ink-2 p-4">
				<div className="flex items-center justify-between">
					<Kicker>HANDLE</Kicker>
					{!editingHandle ? (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => setEditingHandle(true)}
							aria-label="Edit handle"
						>
							<Pencil />
						</Button>
					) : null}
				</div>
				{editingHandle ? (
					<div className="mt-3 flex gap-2">
						<Input
							value={handle}
							onChange={(e) => setHandle(e.target.value)}
							className="mono-input"
							maxLength={32}
							autoFocus
						/>
						<Button
							variant="default"
							size="sm"
							onClick={saveHandle}
							disabled={savingHandle}
						>
							<Check />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setHandle(user.handle);
								setEditingHandle(false);
							}}
							disabled={savingHandle}
						>
							<X />
						</Button>
					</div>
				) : (
					<div className="mt-2 font-mono font-semibold text-bone text-sm">
						{user.handle}
					</div>
				)}
			</section>

			<section className="mt-4 border border-rule bg-ink-2 p-4">
				<Kicker>CASH BALANCE</Kicker>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="font-mono text-bone-3 text-sm">
						{CURRENCY_SYMBOL}
					</span>
					<Input
						value={balanceDraft}
						onChange={(e) => setBalanceDraft(e.target.value)}
						className="mono-input max-w-[120px]"
						inputMode="numeric"
					/>
					<Button
						variant="default"
						size="sm"
						disabled={savingBalance}
						onClick={saveBalance}
					>
						<Check /> Set
					</Button>
				</div>
				<div className="mt-3 flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={savingBalance}
						onClick={() => bump(-1000)}
					>
						<Minus /> {CURRENCY_SYMBOL}1k
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={savingBalance}
						onClick={() => bump(-100)}
					>
						<Minus /> {CURRENCY_SYMBOL}100
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={savingBalance}
						onClick={() => bump(100)}
					>
						<Plus /> {CURRENCY_SYMBOL}100
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={savingBalance}
						onClick={() => bump(1000)}
					>
						<Plus /> {CURRENCY_SYMBOL}1k
					</Button>
				</div>
			</section>

			<section className="mt-4 border border-rule bg-ink-2 p-4">
				<div className="flex items-center justify-between">
					<div>
						<Kicker>ADMIN ACCESS</Kicker>
						<p className="mt-1 text-bone-2 text-xs">
							{user.isAdmin
								? "Can approve proposals, resolve and delete tickets, and manage users."
								: "Trader-level access only."}
						</p>
					</div>
					<Switch checked={user.isAdmin} onCheckedChange={toggleAdmin} />
				</div>
			</section>

			<section className="mt-4">
				<div className="flex items-center justify-between gap-2 border-rule border-b pb-2">
					<Kicker>FULL ACTIVITY</Kicker>
					<Button asChild variant="outline" size="sm">
						<Link
							to="/profile/$username"
							params={{
								username: encodeURIComponent(user.handle.replace(/^@/, "")),
							}}
						>
							<ExternalLink /> Public profile
						</Link>
					</Button>
				</div>
				<UserActivity userId={user._id} />
			</section>

			<section className="mt-8 border border-magenta/30 bg-magenta-wash/40 p-4">
				<Kicker>DANGER ZONE</Kicker>
				{!confirmDelete ? (
					<>
						<p className="mt-2 text-bone-2 text-xs">
							Permanently deletes the user record. Their positions and trades
							remain in the database but become orphaned.
						</p>
						<Button
							variant="ghost"
							size="sm"
							className="mt-3 text-magenta hover:bg-magenta-wash hover:text-magenta"
							onClick={() => setConfirmDelete(true)}
						>
							<Trash2 /> Delete user
						</Button>
					</>
				) : (
					<>
						<p className="mt-2 font-mono text-[12px] text-magenta uppercase tracking-[0.1em]">
							Confirm delete {user.handle}?
						</p>
						<div className="mt-3 flex gap-2">
							<Button variant="destructive" size="sm" onClick={performDelete}>
								<Trash2 /> Delete permanently
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setConfirmDelete(false)}
							>
								Cancel
							</Button>
						</div>
					</>
				)}
			</section>
		</>
	);
}

// ----------------------------------------------------------------------------
// User activity feed (admin view)
// ----------------------------------------------------------------------------

type ActivityEvent = FunctionReturnType<typeof api.admin.userActivity>[number];

function UserActivity({ userId }: { userId: Id<"users"> }) {
	const events = useQuery(api.admin.userActivity, { userId, limit: 50 });
	if (events === undefined) {
		return <Skeleton className="mt-4 h-32 w-full" />;
	}
	if (events.length === 0) {
		return (
			<div className="mt-4 border border-rule border-dashed py-8 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
				No activity yet.
			</div>
		);
	}
	return (
		<ul className="mt-4">
			{events.map((e) => (
				<li key={e._id}>
					<ActivityRow event={e} />
				</li>
			))}
		</ul>
	);
}

function ActivityRow({ event }: { event: ActivityEvent }) {
	return (
		<div className="ledger-row grid grid-cols-[auto_1fr_auto] items-start gap-3 py-3">
			<KindMark kind={event.kind} />
			<div className="min-w-0">
				<EventBody event={event} />
				{event.kind === "comment" && event.body ? (
					<p className="mt-1 text-bone-2 text-xs leading-relaxed">
						{event.body}
					</p>
				) : null}
				{event.kind === "proposal" && event.rejectionReason ? (
					<p className="mt-1 text-magenta text-xs">{event.rejectionReason}</p>
				) : null}
			</div>
			<span className="whitespace-nowrap font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
				{relativeTime(event.ts)}
			</span>
		</div>
	);
}

function EventBody({ event }: { event: ActivityEvent }) {
	if (event.kind === "trade") {
		return (
			<div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
				<span>{event.action === "sell" ? "sold" : "bought"}</span>
				<Badge variant={event.side === "Yes" ? "yes" : "no"}>
					{event.side} {money(Math.abs(event.cost))}
				</Badge>
				<span>@</span>
				<span className="font-bold text-bone tabular-nums">
					{cents(event.price)}
				</span>
				<span aria-hidden="true">·</span>
				<Link
					to="/ticket/$id"
					params={{ id: event.marketSlug }}
					className="font-display font-semibold text-bone normal-case tracking-normal hover:text-brand"
				>
					{event.question}
				</Link>
			</div>
		);
	}
	if (event.kind === "comment") {
		return (
			<div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
				<span>commented on</span>
				<Link
					to="/ticket/$id"
					params={{ id: event.marketSlug }}
					className="font-display font-semibold text-bone normal-case tracking-normal hover:text-brand"
				>
					{event.question}
				</Link>
			</div>
		);
	}
	if (event.kind === "proposal") {
		const statusTone =
			event.status === "approved"
				? "text-brand"
				: event.status === "rejected"
					? "text-magenta"
					: "text-bone-2";
		return (
			<div className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-bone-2 uppercase tracking-[0.1em]">
				<span>proposed</span>
				{event.approvedMarketSlug ? (
					<Link
						to="/ticket/$id"
						params={{ id: event.approvedMarketSlug }}
						className="font-display font-semibold text-bone normal-case tracking-normal hover:text-brand"
					>
						{event.question}
					</Link>
				) : (
					<span className="font-display font-semibold text-bone normal-case tracking-normal">
						{event.question}
					</span>
				)}
				<span aria-hidden="true">·</span>
				<span className={cn("font-bold", statusTone)}>{event.status}</span>
			</div>
		);
	}
	return null;
}

function KindMark({ kind }: { kind: ActivityEvent["kind"] }) {
	const map: Record<ActivityEvent["kind"], { label: string; tone: string }> = {
		trade: { label: "TRD", tone: "border-brand/40 bg-brand-wash text-brand" },
		comment: { label: "MSG", tone: "border-rule bg-ink text-bone-2" },
		proposal: { label: "PRO", tone: "border-rule bg-ink-2 text-bone" },
	};
	const m = map[kind] ?? {
		label: "···",
		tone: "border-rule bg-ink text-bone-2",
	};
	return (
		<div
			className={`grid h-7 w-10 shrink-0 place-items-center border font-bold font-mono text-[10px] uppercase tracking-[0.16em] ${m.tone}`}
		>
			{m.label}
		</div>
	);
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function TraderAvatar({ handle }: { handle: string }) {
	const initial = handle.replace(/^@/, "").slice(0, 1).toUpperCase();
	return (
		<Avatar className="size-8 rounded-[2px]">
			<AvatarFallback className="rounded-[2px] bg-brand font-bold font-mono text-brand-foreground text-xs">
				{initial}
			</AvatarFallback>
		</Avatar>
	);
}

function formatJoined(ms: number | null): string {
	if (!ms) return "—";
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function relativeTime(ts: number): string {
	const diff = Date.now() - ts;
	if (diff < 60_000) return "now";
	const mins = Math.floor(diff / 60_000);
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(diff / 3_600_000);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(diff / 86_400_000);
	if (days < 7) return `${days}d`;
	return `${Math.floor(days / 7)}w`;
}
