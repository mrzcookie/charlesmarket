import { createFileRoute } from "@tanstack/react-router";
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
	Activity,
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Pencil,
	Search,
	Trash2,
	X,
} from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
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
} from "@/components/ui/dialog";
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
import { CURRENCY_SYMBOL } from "@/lib/markets";
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

function UsersPage() {
	const users = useQuery(api.admin.listUsers, {});
	const [globalFilter, setGlobalFilter] = useState("");

	const filteredUsers = useMemo(() => {
		if (!users) return [];
		if (!globalFilter.trim()) return users;
		const q = globalFilter.toLowerCase();
		return users.filter(
			(u) =>
				u.handle.toLowerCase().includes(q) ||
				(u.name ?? "").toLowerCase().includes(q) ||
				(u.email ?? "").toLowerCase().includes(q)
		);
	}, [users, globalFilter]);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<Kicker>ACCOUNTS</Kicker>
					<h1 className="display-headline mt-2 text-3xl sm:text-4xl">Users</h1>
					<p className="mt-2 max-w-xl text-bone-2 text-sm">
						Manage handles, display names, admin access, and account status.
					</p>
				</div>
				{users !== undefined && (
					<Badge variant="outline">
						{users.length} {users.length === 1 ? "USER" : "USERS"}
					</Badge>
				)}
			</div>

			<div className="relative">
				<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					className="pl-9"
					placeholder="Search by handle, name, or email…"
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

			{users === undefined ? (
				<div className="space-y-3">
					{Array.from({ length: 6 }, (_, i) => `user-skel-${i}`).map((k) => (
						<Skeleton key={k} className="h-14 w-full rounded-lg" />
					))}
				</div>
			) : (
				<UsersTable rows={filteredUsers as UserRow[]} />
			)}
		</div>
	);
}

function UsersTable({ rows }: { rows: UserRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "joinedAt", desc: true },
	]);
	const updateUser = useMutation(api.admin.adminUpdateUser);
	const deleteUserMutation = useMutation(api.admin.deleteUser);
	const grantAdmin = useMutation(api.admin.grantAdmin);
	const revokeAdmin = useMutation(api.admin.revokeAdmin);

	const [activityUser, setActivityUser] = useState<UserRow | null>(null);
	const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);

	const handleToggleAdmin = useCallback(
		async (user: UserRow) => {
			try {
				if (user.isAdmin) {
					await revokeAdmin({ userId: user._id });
					toast.info(`Admin revoked from ${user.handle}`);
				} else {
					if (!user.email) throw new Error("No email for this user");
					await grantAdmin({ email: user.email });
					toast.success(`Admin granted to ${user.handle}`);
				}
			} catch (err) {
				toast.error("Failed to update admin status", {
					description: err instanceof Error ? err.message : String(err),
				});
			}
		},
		[revokeAdmin, grantAdmin]
	);

	const handleUpdateField = useCallback(
		async (userId: Id<"users">, field: "handle" | "name", value: string) => {
			try {
				await updateUser({ userId, [field]: value });
				toast.success("Saved");
			} catch (err) {
				toast.error("Save failed", {
					description: err instanceof Error ? err.message : String(err),
				});
				throw err;
			}
		},
		[updateUser]
	);

	const columns = useMemo<ColumnDef<UserRow>[]>(
		() => [
			{
				id: "avatar",
				header: "",
				cell: ({ row }) => {
					const u = row.original;
					const initials = u.handle.replace("@", "").slice(0, 2).toUpperCase();
					return (
						<div className="flex size-8 shrink-0 items-center justify-center rounded-[2px] bg-brand font-bold font-mono text-brand-foreground text-xs">
							{initials}
						</div>
					);
				},
				size: 48,
				enableSorting: false,
			},
			{
				id: "handle",
				header: "Handle",
				accessorKey: "handle",
				cell: ({ row }) => (
					<EditableCell
						value={row.original.handle}
						onSave={(v) => handleUpdateField(row.original._id, "handle", v)}
					/>
				),
				enableSorting: true,
			},
			{
				id: "name",
				header: "Display name",
				accessorKey: "name",
				cell: ({ row }) => (
					<EditableCell
						value={row.original.name ?? ""}
						placeholder="No name"
						onSave={(v) => handleUpdateField(row.original._id, "name", v)}
					/>
				),
				enableSorting: true,
			},
			{
				id: "email",
				header: "Email",
				accessorKey: "email",
				cell: ({ row }) => (
					<span className="max-w-[200px] truncate text-muted-foreground text-xs">
						{row.original.email ?? "—"}
					</span>
				),
				enableSorting: false,
			},
			{
				id: "balance",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Balance
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorKey: "balance",
				cell: ({ row }) => (
					<span className="font-mono text-sm">
						{CURRENCY_SYMBOL}
						{Math.round(row.original.balance).toLocaleString()}
					</span>
				),
				enableSorting: true,
			},
			{
				id: "joinedAt",
				header: ({ column }) => (
					<button
						type="button"
						className="flex items-center gap-1 hover:text-foreground"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Joined
						<ChevronsUpDown className="size-3.5 opacity-50" />
					</button>
				),
				accessorFn: (row) => row.joinedAt ?? row._creationTime,
				cell: ({ row }) => {
					const ts = row.original.joinedAt ?? row.original._creationTime;
					return (
						<span className="text-muted-foreground text-xs">
							{new Date(ts).toLocaleDateString([], {
								month: "short",
								day: "numeric",
								year: "numeric",
							})}
						</span>
					);
				},
				enableSorting: true,
			},
			{
				id: "isAdmin",
				header: "Admin",
				accessorKey: "isAdmin",
				cell: ({ row }) => (
					<Switch
						checked={row.original.isAdmin}
						onCheckedChange={() => handleToggleAdmin(row.original)}
						aria-label={`Toggle admin for ${row.original.handle}`}
					/>
				),
				enableSorting: false,
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground hover:text-foreground"
							title="View activity"
							onClick={() => setActivityUser(row.original)}
						>
							<Activity className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground hover:text-destructive"
							title="Delete user"
							onClick={() => setDeleteConfirm(row.original)}
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				),
				enableSorting: false,
				size: 80,
			},
		],
		[handleUpdateField, handleToggleAdmin]
	);

	const table = useReactTable({
		data: rows,
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: { pagination: { pageSize: 25 } },
		debugTable: import.meta.env.DEV,
	});

	useRegisterTable("Users", table);

	return (
		<>
			<div className="rounded-lg border bg-card">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((hg) => (
								<TableRow key={hg.id} className="hover:bg-transparent">
									{hg.headers.map((header) => (
										<TableHead key={header.id}>
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
										No users found.
									</TableCell>
								</TableRow>
							) : (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
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

			{/* Activity Sheet */}
			<Sheet
				open={!!activityUser}
				onOpenChange={(o) => !o && setActivityUser(null)}
			>
				<SheetContent side="right" className="w-full max-w-lg">
					{activityUser && <UserActivityPanel user={activityUser} />}
				</SheetContent>
			</Sheet>

			{/* Delete Confirm Dialog */}
			{deleteConfirm && (
				<DeleteUserDialog
					user={deleteConfirm}
					onConfirm={async () => {
						try {
							await deleteUserMutation({ userId: deleteConfirm._id });
							toast.info(`User ${deleteConfirm.handle} deleted`);
							setDeleteConfirm(null);
						} catch (err) {
							toast.error("Delete failed", {
								description: err instanceof Error ? err.message : String(err),
							});
						}
					}}
					onCancel={() => setDeleteConfirm(null)}
				/>
			)}
		</>
	);
}

function EditableCell({
	value,
	placeholder,
	onSave,
}: {
	value: string;
	placeholder?: string;
	onSave: (v: string) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const startEdit = () => {
		setDraft(value);
		setEditing(true);
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	const cancel = () => {
		setDraft(value);
		setEditing(false);
	};

	const save = async () => {
		if (draft === value) {
			setEditing(false);
			return;
		}
		setSaving(true);
		try {
			await onSave(draft);
			setEditing(false);
		} catch {
			setDraft(value);
			setEditing(false);
		} finally {
			setSaving(false);
		}
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") save();
		if (e.key === "Escape") cancel();
	};

	if (editing) {
		return (
			<div className="flex items-center gap-1">
				<Input
					ref={inputRef}
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={save}
					onKeyDown={onKeyDown}
					disabled={saving}
					className="h-7 w-36 px-2 py-0 text-sm"
				/>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0"
					onClick={save}
					disabled={saving}
				>
					<Check className="size-3 text-brand" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0"
					onClick={cancel}
					disabled={saving}
				>
					<X className="size-3 text-muted-foreground" />
				</Button>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={startEdit}
			className={cn(
				"group flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-accent",
				!value && "text-muted-foreground italic"
			)}
			title="Click to edit"
		>
			<span>{value || (placeholder ?? "—")}</span>
			<Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
		</button>
	);
}

function UserActivityPanel({ user }: { user: UserRow }) {
	const trades = useQuery(api.admin.userTrades, { userId: user._id });

	return (
		<>
			<SheetHeader>
				<SheetTitle className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-[2px] bg-brand font-bold font-mono text-brand-foreground text-xs">
						{user.handle.replace("@", "").slice(0, 2).toUpperCase()}
					</div>
					{user.handle}
				</SheetTitle>
				<SheetDescription>
					{user.name && <span>{user.name} · </span>}
					{user.email ?? "No email"} ·{" "}
					<span className="font-medium">
						{CURRENCY_SYMBOL}
						{Math.round(user.balance).toLocaleString()}
					</span>
				</SheetDescription>
			</SheetHeader>

			<div className="mt-6">
				<p className="mb-3 font-medium text-sm">Recent trades</p>
				{trades === undefined ? (
					<div className="space-y-2">
						{Array.from({ length: 4 }, (_, i) => `trade-skel-${i}`).map((k) => (
							<Skeleton key={k} className="h-16 w-full rounded-lg" />
						))}
					</div>
				) : trades.length === 0 ? (
					<div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">
						No trades yet.
					</div>
				) : (
					<div className="space-y-2">
						{trades.map((t) => (
							<div
								key={t._id}
								className="rounded-lg border bg-card p-3 text-sm"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-sm leading-snug">
											{t.marketQuestion}
										</p>
										<div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
											<Badge
												variant={t.side === "Yes" ? "yes" : "no"}
												className="px-1.5 py-0 text-xs"
											>
												{t.side}
											</Badge>
											<span className="capitalize">{t.kind}</span>
											<span>·</span>
											<span>
												{Math.round(t.shares)} shares @{" "}
												{Math.round(t.price * 100)}%
											</span>
										</div>
									</div>
									<div className="shrink-0 text-right">
										<p
											className={cn(
												"font-medium font-mono text-sm",
												t.cost > 0 ? "text-destructive" : "text-brand"
											)}
										>
											{t.cost > 0 ? "−" : "+"}
											{CURRENCY_SYMBOL}
											{Math.abs(Math.round(t.cost)).toLocaleString()}
										</p>
										<p className="text-muted-foreground text-xs">
											{new Date(t._creationTime).toLocaleDateString([], {
												month: "short",
												day: "numeric",
											})}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}

function DeleteUserDialog({
	user,
	onConfirm,
	onCancel,
}: {
	user: UserRow;
	onConfirm: () => Promise<void>;
	onCancel: () => void;
}) {
	const [loading, setLoading] = useState(false);

	return (
		<Dialog open onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Delete user?</DialogTitle>
					<DialogDescription>
						<span className="font-medium">{user.handle}</span>
						{user.email && (
							<span className="text-muted-foreground"> ({user.email})</span>
						)}{" "}
						will be permanently removed. This cannot be undone.
					</DialogDescription>
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
						{loading ? "Deleting…" : "Delete"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
