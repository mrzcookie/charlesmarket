import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import {
	ArrowRight,
	Check,
	CheckCircle2,
	Clock,
	Pencil,
	Plus,
	X,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_SYMBOL, money, STARTING_BALANCE } from "@/lib/markets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	return (
		<main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
			<AuthLoading>
				<ProfileSkeleton />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel />
			</Unauthenticated>
			<Authenticated>
				<ProfileBody />
			</Authenticated>
		</main>
	);
}

function ProfileBody() {
	const me = useQuery(api.users.me, {});
	const updateHandle = useMutation(api.users.updateHandle);
	const updateName = useMutation(api.users.updateName);
	const [handleDraft, setHandleDraft] = useState<string | null>(null);
	const [savingHandle, setSavingHandle] = useState(false);
	const [nameDraft, setNameDraft] = useState<string | null>(null);
	const [savingName, setSavingName] = useState(false);

	if (me === undefined) return <ProfileSkeleton />;
	if (me === null) return <ProfileSkeleton />;

	const saveHandle = async () => {
		if (handleDraft == null) return;
		setSavingHandle(true);
		try {
			const next = await updateHandle({ handle: handleDraft });
			toast.success("Handle updated", { description: next });
			setHandleDraft(null);
		} catch (err) {
			toast.error("Couldn't update handle", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSavingHandle(false);
		}
	};

	const saveName = async () => {
		if (nameDraft == null) return;
		setSavingName(true);
		try {
			const next = await updateName({ name: nameDraft });
			toast.success("Display name updated", { description: next });
			setNameDraft(null);
		} catch (err) {
			toast.error("Couldn't update display name", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSavingName(false);
		}
	};

	const initial = me.name?.[0] ?? me.email?.[0] ?? me.handle?.[1] ?? "C";

	return (
		<>
			<Card className="bg-gradient-to-br from-accent/40 to-card">
				<CardContent className="flex flex-col gap-5 md:flex-row md:items-center">
					<Avatar className="size-20 shrink-0">
						{me.image ? <AvatarImage src={me.image} alt="" /> : null}
						<AvatarFallback className="bg-gradient-to-br from-primary to-brand-700 font-bold text-2xl text-primary-foreground">
							{initial.toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<h1 className="font-bold text-2xl tracking-tight">{me.handle}</h1>
						<p className="text-muted-foreground">
							{me.email ?? "Signed in"} · Trading on Charlesmarket
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Badge variant="brand">Trader</Badge>
							{me.isAdmin && (
								<Badge
									variant="outline"
									className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
								>
									Moderator
								</Badge>
							)}
						</div>
					</div>
					<div className="flex flex-col items-end">
						<div className="text-muted-foreground text-xs uppercase tracking-wide">
							Balance
						</div>
						<div className="font-bold font-mono text-3xl">
							{CURRENCY_SYMBOL}
							{Math.round(me.balance).toLocaleString()}
						</div>
						<div className="text-muted-foreground text-xs">
							in play-money shekels
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						Visible to other traders across activity, comments, and the
						leaderboard.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-sm">
					<Pref
						label="Display name"
						control={
							<div className="flex items-center gap-2">
								{nameDraft == null ? (
									<>
										<span className="max-w-[16rem] truncate">
											{me.name ?? "—"}
										</span>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setNameDraft(me.name ?? "")}
											aria-label="Edit display name"
										>
											<Pencil />
										</Button>
									</>
								) : (
									<>
										<Input
											value={nameDraft}
											onChange={(e) => setNameDraft(e.target.value)}
											className="h-8 w-48"
											maxLength={60}
											placeholder="Your name"
										/>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setNameDraft(null)}
											disabled={savingName}
											aria-label="Cancel"
										>
											<X />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={saveName}
											disabled={savingName}
											aria-label="Save display name"
										>
											<Check />
										</Button>
									</>
								)}
							</div>
						}
					/>
					<Pref
						label="Handle"
						control={
							<div className="flex items-center gap-2">
								{handleDraft == null ? (
									<>
										<span className="font-mono">{me.handle}</span>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setHandleDraft(me.handle)}
											aria-label="Edit handle"
										>
											<Pencil />
										</Button>
									</>
								) : (
									<>
										<Input
											value={handleDraft}
											onChange={(e) => setHandleDraft(e.target.value)}
											className="h-8 w-40 font-mono"
											maxLength={32}
										/>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setHandleDraft(null)}
											disabled={savingHandle}
											aria-label="Cancel"
										>
											<X />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={saveHandle}
											disabled={savingHandle}
											aria-label="Save handle"
										>
											<Check />
										</Button>
									</>
								)}
							</div>
						}
					/>
				</CardContent>
			</Card>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Account</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="space-y-3 text-sm">
						<Stat label="Joined" value={formatJoined(me.joinedAt)} />
						<Stat label="Email" value={me.email ?? "—"} />
					</dl>
				</CardContent>
			</Card>

			<MyProposals />

			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Activity</CardTitle>
					<CardDescription>
						Your trades, comments, and resolutions show up here. Lifetime volume
						tracks every order.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between">
					<span className="text-muted-foreground text-sm">
						Estimated lifetime volume: {money(0)}
					</span>
					<Button asChild variant="link" size="sm" className="px-0">
						<Link to="/activity">
							View global activity <ArrowRight />
						</Link>
					</Button>
				</CardContent>
			</Card>
		</>
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
		<Card className="mt-6">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Your proposals</CardTitle>
						<CardDescription>
							Markets you've pitched. Approved ones go live; rejected ones show
							reviewer notes.
						</CardDescription>
					</div>
					<Button asChild size="sm">
						<Link to="/propose">
							<Plus /> New
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{proposals === undefined ? (
					<Skeleton className="h-24" />
				) : proposals.length === 0 ? (
					<div className="rounded-md border border-dashed py-8 text-center text-muted-foreground text-sm">
						No proposals yet.{" "}
						<Link to="/propose" className="text-primary underline">
							Pitch your first market
						</Link>
						.
					</div>
				) : (
					<ul className="space-y-2">
						{proposals.map((p) => (
							<li
								key={p._id}
								className="flex flex-wrap items-start justify-between gap-2 rounded-md border bg-card px-3 py-2"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<ProposalStatusBadge status={p.status} />
										<span className="text-muted-foreground text-xs">
											{p.category}
										</span>
									</div>
									<div className="mt-1 truncate font-medium text-sm">
										{p.question}
									</div>
									{p.rejectionReason && (
										<div className="mt-1 text-destructive text-xs">
											{p.rejectionReason}
										</div>
									)}
									{p.approvedMarketSlug && (
										<Link
											to="/market/$id"
											params={{ id: p.approvedMarketSlug }}
											className="mt-1 inline-flex items-center gap-1 text-primary text-xs hover:underline"
										>
											View market <ArrowRight className="size-3" />
										</Link>
									)}
								</div>
								{p.status !== "approved" && (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(p._id)}
									>
										Delete
									</Button>
								)}
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function ProposalStatusBadge({
	status,
}: {
	status: "pending" | "approved" | "rejected";
}) {
	if (status === "pending")
		return (
			<Badge variant="outline" className="gap-1">
				<Clock className="size-3" /> Pending
			</Badge>
		);
	if (status === "approved")
		return (
			<Badge variant="yes" className="gap-1">
				<CheckCircle2 className="size-3" /> Approved
			</Badge>
		);
	return (
		<Badge variant="no" className="gap-1">
			<XCircle className="size-3" /> Rejected
		</Badge>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="font-medium">{value}</dd>
		</div>
	);
}

function Pref({ label, control }: { label: string; control: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between py-3">
			<Label className="font-normal">{label}</Label>
			{control}
		</div>
	);
}

function formatJoined(ms?: number): string {
	if (!ms) return "—";
	return new Date(ms).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function SignInPanel() {
	return (
		<Card className="mt-8 border-primary/30 bg-accent/30">
			<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
				<h2 className="font-semibold text-xl">
					Sign in to manage your profile
				</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					Sign in with Google to claim a handle, get a {CURRENCY_SYMBOL}
					{STARTING_BALANCE.toLocaleString()} starter balance, and start
					trading.
				</p>
				<SignInButton size="lg" label="Sign in with Google" />
			</CardContent>
		</Card>
	);
}

function ProfileSkeleton() {
	return (
		<>
			<Skeleton className="h-32 w-full" />
			<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
				<Skeleton className="h-40" />
				<Skeleton className="h-40" />
			</div>
			<Skeleton className="mt-6 h-48" />
		</>
	);
}
