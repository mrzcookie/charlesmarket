import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	Check,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Filter,
	Minus,
	Pencil,
	Plus,
	Search,
	Trash2,
	User,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BracketChip, Kicker } from "@/components/console";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
type ActivityFilter = "all" | "trade" | "comment" | "proposal";

function UsersPage() {
	const users = useQuery(api.admin.listUsers, {});
	const [query, setQuery] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("joinedAt");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
	const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

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

			<div className="flex flex-wrap items-center gap-3">
				<UserCombobox
					users={users ?? []}
					query={query}
					onQueryChange={setQuery}
					onSelect={(user) => setDrawerUser(user)}
				/>
				<Select
					value={activityFilter}
					onValueChange={(v) => setActivityFilter(v as ActivityFilter)}
				>
					<SelectTrigger className="w-auto gap-2">
						<Filter className="size-3.5 shrink-0 text-bone-3" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent position="popper" align="start">
						<SelectItem value="all">All activity</SelectItem>
						<SelectItem value="trade">Trades</SelectItem>
						<SelectItem value="comment">Comments</SelectItem>
						<SelectItem value="proposal">Proposals</SelectItem>
					</SelectContent>
				</Select>
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

			<UserDrawer
				user={drawerUser}
				onClose={() => setDrawerUser(null)}
				activityFilter={activityFilter}
				setActivityFilter={setActivityFilter}
			/>
		</div>
	);
}

// ----------------------------------------------------------------------------
// User search combobox
// ----------------------------------------------------------------------------

function UserCombobox({
	users,
	query,
	onQueryChange,
	onSelect,
}: {
	users: UserRow[];
	query: string;
	onQueryChange: (q: string) => void;
	onSelect: (user: UserRow) => void;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const suggestions = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users.slice(0, 15);
		return users
			.filter(
				(u) =>
					u.handle.toLowerCase().includes(q) ||
					(u.name ?? "").toLowerCase().includes(q) ||
					(u.email ?? "").toLowerCase().includes(q)
			)
			.slice(0, 15);
	}, [users, query]);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"flex h-9 min-w-[180px] items-center gap-2 rounded-[4px] border bg-ink-2 px-3 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
					open
						? "border-brand text-bone"
						: "border-rule text-bone hover:border-rule-bright"
				)}
			>
				<User className="size-3.5 shrink-0 text-bone-3" />
				<span className="flex-1 truncate text-left">
					{query || "All users"}
				</span>
				{query ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQueryChange("");
							setOpen(false);
						}}
						className="text-bone-3 hover:text-bone"
						aria-label="Clear search"
					>
						<X className="size-3" />
					</button>
				) : (
					<ChevronDown
						className={cn(
							"size-3.5 text-bone-3 transition-transform",
							open && "rotate-180"
						)}
					/>
				)}
			</button>

			{open && (
				<div className="absolute top-full left-0 z-50 mt-1 w-64 border border-rule bg-ink-2">
					<div className="border-rule border-b p-2">
						<div className="relative">
							<Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-bone-3" />
							<input
								// biome-ignore lint/a11y/noAutofocus: search field in controlled dropdown
								autoFocus
								value={query}
								onChange={(e) => onQueryChange(e.target.value)}
								placeholder="Search users..."
								className="w-full bg-transparent py-1.5 pr-2 pl-7 font-mono text-[11px] text-bone outline-none placeholder:text-bone-3"
							/>
						</div>
					</div>
					<div className="max-h-52 overflow-y-auto p-1">
						{suggestions.length === 0 ? (
							<div className="px-2 py-3 text-center font-mono text-[11px] text-bone-3">
								No users found
							</div>
						) : (
							suggestions.map((u) => (
								<button
									key={u._id}
									type="button"
									onClick={() => {
										onSelect(u);
										onQueryChange(u.handle);
										setOpen(false);
									}}
									className="flex w-full items-center gap-2 rounded-[2px] px-2 py-1.5 text-left transition-colors hover:bg-ink-3"
								>
									<TraderAvatar handle={u.handle} />
									<div className="min-w-0 flex-1">
										<div className="truncate font-mono font-semibold text-[11px] text-bone">
											{u.handle}
										</div>
										{u.name ? (
											<div className="truncate font-mono text-[10px] text-bone-3">
												{u.name}
											</div>
										) : null}
									</div>
									{u.isAdmin ? (
										<BracketChip className="ml-auto shrink-0">
											ADMIN
										</BracketChip>
									) : null}
								</button>
							))
						)}
					</div>
				</div>
			)}
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
	activityFilter,
	setActivityFilter,
}: {
	user: UserRow | null;
	onClose: () => void;
	activityFilter: ActivityFilter;
	setActivityFilter: (f: ActivityFilter) => void;
}) {
	return (
		<Sheet open={user != null} onOpenChange={(o) => !o && onClose()}>
			<SheetContent
				side="right"
				className="w-full max-w-xl overflow-y-auto bg-ink"
			>
				{user ? (
					<UserDrawerBody
						key={user._id}
						user={user}
						onClose={onClose}
						activityFilter={activityFilter}
						setActivityFilter={setActivityFilter}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function UserDrawerBody({
	user,
	onClose,
	activityFilter,
	setActivityFilter,
}: {
	user: UserRow;
	onClose: () => void;
	activityFilter: ActivityFilter;
	setActivityFilter: (f: ActivityFilter) => void;
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
				<div className="flex flex-wrap items-center justify-between gap-2 border-rule border-b pb-2">
					<div className="flex items-center gap-3">
						<Kicker>FULL ACTIVITY</Kicker>
						<Select
							value={activityFilter}
							onValueChange={(v) => setActivityFilter(v as ActivityFilter)}
						>
							<SelectTrigger size="sm" className="h-7 gap-1.5 px-2 text-[10px]">
								<Filter className="size-3 shrink-0 text-bone-3" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent position="popper" align="start">
								<SelectItem value="all">All</SelectItem>
								<SelectItem value="trade">Trades</SelectItem>
								<SelectItem value="comment">Comments</SelectItem>
								<SelectItem value="proposal">Proposals</SelectItem>
							</SelectContent>
						</Select>
					</div>
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
				<UserActivity userId={user._id} activityFilter={activityFilter} />
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

function UserActivity({
	userId,
	activityFilter,
}: {
	userId: Id<"users">;
	activityFilter: ActivityFilter;
}) {
	const events = useQuery(api.admin.userActivity, { userId, limit: 50 });

	const filtered = useMemo(() => {
		if (!events) return null;
		if (activityFilter === "all") return events;
		return events.filter((e) => e.kind === activityFilter);
	}, [events, activityFilter]);

	if (filtered === null) {
		return <Skeleton className="mt-4 h-32 w-full" />;
	}
	if (filtered.length === 0) {
		const label =
			activityFilter === "trade"
				? "trades"
				: activityFilter === "comment"
					? "comments"
					: activityFilter === "proposal"
						? "proposals"
						: "activity";
		return (
			<div className="mt-4 border border-rule border-dashed py-8 text-center font-mono text-[12px] text-bone-3 uppercase tracking-[0.12em]">
				No {label} yet.
			</div>
		);
	}
	return (
		<ul className="mt-4">
			{filtered.map((e) => (
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
