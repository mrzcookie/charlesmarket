import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import { ArrowRight, Check, Clock, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { BracketChip, Kicker } from "@/components/console";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
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
	const [handleDraft, setHandleDraft] = useState<string | null>(null);
	const [savingHandle, setSavingHandle] = useState(false);

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

	const initial = me.handle?.[1] ?? "C";

	return (
		<>
			<section className="border border-rule bg-ink-2 p-6 sm:p-8">
				<div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
					<div className="flex items-center gap-5">
						<Avatar className="size-16 shrink-0 rounded-[4px] sm:size-20">
							{me.image ? <AvatarImage src={me.image} alt="" /> : null}
							<AvatarFallback className="rounded-[4px] bg-brand font-display font-extrabold text-3xl text-brand-foreground">
								{initial.toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<Kicker>ACCOUNT</Kicker>
							<h1 className="display-headline mt-1 text-3xl tracking-[-0.03em] sm:text-4xl">
								{me.handle}
							</h1>
							<div className="mt-3 flex flex-wrap gap-2">
								<Badge>Trader</Badge>
								{me.isAdmin && <BracketChip>ADMIN</BracketChip>}
							</div>
						</div>
					</div>
					<div className="flex flex-col items-start border-rule border-t pt-5 md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-8">
						<div className="label">Cash on hand</div>
						<div className="mt-1 font-bold font-mono text-3xl text-brand tabular-nums sm:text-4xl">
							{CURRENCY_SYMBOL}
							{Math.round(me.balance).toLocaleString()}
						</div>
						<div className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
							in play-money shekels
						</div>
					</div>
				</div>
				<div className="mt-6 border-rule border-t pt-4">
					<Button asChild variant="outline" size="sm">
						<Link
							to="/profile/$username"
							params={{
								username: encodeURIComponent(me.handle.replace(/^@/, "")),
							}}
						>
							View your public profile →
						</Link>
					</Button>
				</div>
			</section>

			<section className="mt-10 border border-rule bg-ink-2 p-6">
				<div className="border-rule border-b pb-3">
					<Kicker>PROFILE</Kicker>
					<p className="mt-2 text-bone-2 text-sm">
						Your handle is what other traders see across activity, comments, and
						the leaderboard.
					</p>
				</div>
				<div className="mt-3 text-sm">
					<Pref
						label="Handle"
						control={
							<div className="flex items-center gap-2">
								{handleDraft == null ? (
									<>
										<span className="font-mono text-bone">{me.handle}</span>
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
											className="mono-input h-8 w-40"
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
					<Pref
						label="Joined"
						control={<StaticVal value={formatJoined(me.joinedAt)} />}
					/>
				</div>
			</section>

			<MyProposals />

			<section className="mt-10 border border-rule bg-ink-2 p-6">
				<div className="border-rule border-b pb-3">
					<Kicker>ACTIVITY</Kicker>
					<p className="mt-2 text-bone-2 text-sm">
						Your trades, comments, and resolutions show up on the tape.
					</p>
				</div>
				<div className="mt-3 flex items-center justify-between">
					<span className="font-mono text-[12px] text-bone-3 uppercase tracking-[0.1em]">
						Lifetime volume{" "}
						<span className="font-bold text-bone tabular-nums">{money(0)}</span>
					</span>
					<Button asChild variant="link" size="sm">
						<Link to="/activity">
							Global tape <ArrowRight />
						</Link>
					</Button>
				</div>
			</section>
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
		<section className="mt-10 border border-rule bg-ink-2 p-6">
			<div className="flex items-center justify-between border-rule border-b pb-3">
				<div>
					<Kicker>YOUR PROPOSALS</Kicker>
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
									{p.rejectionReason && (
										<div className="mt-2 font-mono text-[11px] text-magenta uppercase tracking-[0.1em]">
											{p.rejectionReason}
										</div>
									)}
									{p.approvedMarketSlug && (
										<Link
											to="/market/$id"
											params={{ id: p.approvedMarketSlug }}
											className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-brand uppercase tracking-[0.12em] hover:underline"
										>
											OPEN TICKET <ArrowRight className="size-3" />
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

function StaticVal({ value }: { value: string }) {
	return <span className="font-mono text-bone">{value}</span>;
}

function Pref({ label, control }: { label: string; control: React.ReactNode }) {
	return (
		<div className="ledger-row flex items-center justify-between py-3.5">
			<Label className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.14em]">
				{label}
			</Label>
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
		<div className="mt-12 border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-3 text-2xl">
				Sign in to manage your profile
			</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				Sign in with Google to claim a handle, get a {CURRENCY_SYMBOL}
				{STARTING_BALANCE.toLocaleString()} starter balance, and start trading.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
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
