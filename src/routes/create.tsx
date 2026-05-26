import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from "convex/react";
import { Check, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { Kicker } from "@/components/console";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { pageHead } from "@/lib/seo";
import { CURRENCY_SYMBOL } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/create")({
	component: CreatePage,
	head: () =>
		pageHead({
			title: "Create a ticket",
			description:
				"Pick a person, write a Yes/No question about them, and the ticket goes live immediately. They can't trade their own. Neither can you.",
			path: "/create",
		}),
});

const DAY = 86_400_000;

type Preset = "tonight" | "3d" | "1w" | "2w" | "1m" | "custom";

const PRESETS: { value: Preset; label: string; ms: number | null }[] = [
	{ value: "tonight", label: "Tonight 11:59 PM", ms: null },
	{ value: "3d", label: "In 3 days", ms: 3 * DAY },
	{ value: "1w", label: "In 1 week", ms: 7 * DAY },
	{ value: "2w", label: "In 2 weeks", ms: 14 * DAY },
	{ value: "1m", label: "In 1 month", ms: 30 * DAY },
	{ value: "custom", label: "Pick date/time", ms: null },
];

function tonightMs(): number {
	const d = new Date();
	d.setHours(23, 59, 0, 0);
	return d.getTime();
}

function toLocalDatetimeValue(ms: number): string {
	const d = new Date(ms);
	const off = d.getTimezoneOffset() * 60_000;
	return new Date(ms - off).toISOString().slice(0, 16);
}

function fromLocalDatetimeValue(s: string): number {
	const ms = new Date(s).getTime();
	return Number.isFinite(ms) ? ms : Number.NaN;
}

function formatCloseLabel(ms: number): string {
	const d = new Date(ms);
	const today = new Date();
	const tomorrow = new Date(today.getTime() + DAY);
	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
	const time = d.toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
	if (sameDay(d, today)) return `Today ${time}`;
	if (sameDay(d, tomorrow)) return `Tomorrow ${time}`;
	const within = d.getTime() - today.getTime() < 6 * DAY;
	if (within) {
		return `${d.toLocaleDateString([], {
			weekday: "short",
		})} ${time}`;
	}
	return d.toLocaleDateString([], {
		month: "short",
		day: "numeric",
	});
}

function CreatePage() {
	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<header>
				<Kicker>CREATE</Kicker>
				<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
					New ticket
				</h1>
				<p className="mt-3 max-w-2xl text-bone-2 text-sm sm:text-base">
					Pick a person, write a Yes/No question about them, set when it closes.
					It goes live the second you publish. You and the subject can't trade
					it; everyone else can.
				</p>
			</header>

			<AuthLoading>
				<Skeleton className="mt-8 h-96" />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel />
			</Unauthenticated>
			<Authenticated>
				<AuthedBody />
			</Authenticated>
		</main>
	);
}

type Pick = {
	_id: Id<"users">;
	handle: string;
	name: string | null;
	image: string | null;
};

type SubjectChoice =
	| { kind: "user"; user: Pick }
	| { kind: "name"; name: string };

function AuthedBody() {
	const me = useQuery(api.users.me, {});
	const create = useMutation(api.tickets.create);
	const navigate = useNavigate();

	const [subject, setSubject] = useState<SubjectChoice | null>(null);
	const [question, setQuestion] = useState("");
	const [description, setDescription] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [preset, setPreset] = useState<Preset>("1w");
	const [customAt, setCustomAt] = useState<string>(
		toLocalDatetimeValue(Date.now() + 7 * DAY)
	);
	const [yesPrice, setYesPrice] = useState<number>(0.5);
	const [liquidity, setLiquidity] = useState<number>(1_000);
	const [submitting, setSubmitting] = useState(false);

	const closesAtMs = useMemo(() => {
		if (preset === "custom") return fromLocalDatetimeValue(customAt);
		if (preset === "tonight") return tonightMs();
		const ms = PRESETS.find((p) => p.value === preset)?.ms ?? null;
		return ms ? Date.now() + ms : Number.NaN;
	}, [preset, customAt]);

	const closesAtLabel = useMemo(
		() => (Number.isFinite(closesAtMs) ? formatCloseLabel(closesAtMs) : ""),
		[closesAtMs]
	);

	const tags = useMemo(
		() =>
			tagInput
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 8),
		[tagInput]
	);

	const questionTrim = question.trim();
	const descriptionTrim = description.trim();
	const questionOk =
		questionTrim.length >= 12 &&
		questionTrim.length <= 140 &&
		questionTrim.endsWith("?");
	const descriptionOk = descriptionTrim.length <= 1_000;
	const futureOk =
		Number.isFinite(closesAtMs) && closesAtMs > Date.now() + 5 * 60_000;
	const yesOk = yesPrice > 0.01 && yesPrice < 0.99;
	const liqOk = liquidity >= 100 && liquidity <= 50_000;
	const subjectOk =
		!!subject &&
		(subject.kind === "name"
			? subject.name.trim().length > 0 && subject.name.trim().length <= 60
			: subject.user._id !== me?._id);
	const formValid =
		questionOk && descriptionOk && futureOk && yesOk && liqOk && subjectOk;

	const subjectLabel =
		subject?.kind === "user"
			? (subject.user.name ?? subject.user.handle)
			: (subject?.name ?? "");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formValid || submitting || !subject) return;
		setSubmitting(true);
		try {
			const { slug } = await create({
				subjectUserId: subject.kind === "user" ? subject.user._id : undefined,
				subjectName: subject.kind === "name" ? subject.name.trim() : undefined,
				question: questionTrim,
				description: descriptionTrim,
				tags,
				closesAt: closesAtLabel,
				closesAtMs,
				initialYesPrice: yesPrice,
				initialLiquidity: liquidity,
			});
			toast.success("Ticket live", {
				description: "Anyone but you and the subject can trade it now.",
			});
			navigate({ to: "/ticket/$id", params: { id: slug } });
		} catch (err) {
			toast.error("Couldn't create ticket", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
			<section className="border border-rule bg-ink-2 p-6">
				<div className="border-rule border-b pb-3">
					<Kicker>TICKET DETAILS</Kicker>
					<p className="mt-2 text-bone-2 text-sm">
						Be specific. Vague questions resolve in arguments. Pick a clear,
						observable outcome.
					</p>
				</div>
				<form className="mt-6 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label>Subject</Label>
						{subject ? (
							<div className="flex items-center justify-between border border-brand/40 bg-brand-wash p-3">
								<div className="flex items-center gap-3">
									{subject.kind === "user" && subject.user.image ? (
										<img
											src={subject.user.image}
											alt=""
											className="size-9 border border-rule object-cover"
										/>
									) : (
										<div className="grid size-9 place-items-center border border-rule bg-ink text-bone-2 text-xs">
											{subjectLabel.slice(0, 2)}
										</div>
									)}
									<div className="min-w-0">
										<div className="truncate font-display font-semibold">
											{subjectLabel}
										</div>
										<div className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em]">
											{subject.kind === "user"
												? subject.user.handle
												: "OFF-PLATFORM"}
										</div>
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
							<SubjectPicker meId={me?._id} onPick={setSubject} />
						)}
						<p className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
							The person this ticket is about. They can't trade it.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="question">Question</Label>
						<Input
							id="question"
							placeholder={subject ? `Will ${subjectLabel}…?` : "Will they…?"}
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							maxLength={140}
							aria-invalid={question.length > 0 && !questionOk}
						/>
						<div className="flex justify-between font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
							<span>Must end with '?' and be 12–140 characters.</span>
							<span className="tabular-nums">{question.length}/140</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description (optional)</Label>
						<Textarea
							id="description"
							placeholder="How does it resolve? Any context traders should know."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={1_000}
							rows={3}
							aria-invalid={!descriptionOk}
						/>
						<div className="flex justify-between font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
							<span>Up to 1,000 characters.</span>
							<span className="tabular-nums">{description.length}/1000</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="tags">Tags (optional)</Label>
						<Input
							id="tags"
							placeholder="weekend, dating, fitness"
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
						/>
						{tags.length > 0 && (
							<div className="flex flex-wrap gap-1.5 pt-1">
								{tags.map((t) => (
									<Badge key={t} variant="outline">
										#{t}
									</Badge>
								))}
							</div>
						)}
					</div>

					<div className="border-rule border-t pt-6">
						<Label>Closes</Label>
						<div className="mt-2 flex flex-wrap gap-2">
							{PRESETS.map((p) => (
								<Button
									key={p.value}
									type="button"
									variant={preset === p.value ? "default" : "outline"}
									size="sm"
									onClick={() => setPreset(p.value)}
								>
									{p.label}
								</Button>
							))}
						</div>
						{preset === "custom" && (
							<Input
								type="datetime-local"
								value={customAt}
								onChange={(e) => setCustomAt(e.target.value)}
								className="mt-3 max-w-xs"
							/>
						)}
						<div className="mt-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
							{futureOk ? (
								<>
									CLOSES{" "}
									<span className="font-bold text-bone">{closesAtLabel}</span>
									<span className="ml-2 text-bone-3 normal-case tracking-normal">
										({new Date(closesAtMs).toLocaleString()})
									</span>
								</>
							) : (
								<span className="text-magenta">
									Closing time must be at least 5 minutes from now.
								</span>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-6 border-rule border-t pt-6 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="yes">
								Starting Yes price{" "}
								<span className="text-bone-3">(0.02 – 0.98)</span>
							</Label>
							<div className="flex items-center gap-3">
								<input
									id="yes"
									type="range"
									min={0.02}
									max={0.98}
									step={0.01}
									value={yesPrice}
									onChange={(e) => setYesPrice(Number(e.target.value))}
									className="flex-1 accent-brand"
								/>
								<div className="flex h-9 w-20 items-center justify-center border border-rule bg-ink font-bold font-mono text-brand text-sm tabular-nums">
									{CURRENCY_SYMBOL}
									{Math.round(yesPrice * 100)}
								</div>
							</div>
							<p className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
								Your hunch on the implied probability.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="liq">Initial liquidity</Label>
							<div className="flex items-center gap-2">
								<Input
									id="liq"
									type="number"
									min={100}
									max={50_000}
									step={50}
									value={liquidity}
									onChange={(e) => setLiquidity(Number(e.target.value))}
									className="mono-input"
								/>
								<span className="font-mono text-bone-3 text-sm">
									{CURRENCY_SYMBOL}
								</span>
							</div>
							<p className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
								Bigger liquidity = smaller swings per trade.
							</p>
						</div>
					</div>

					<div className="flex flex-col-reverse items-stretch gap-3 border-rule border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
						<Button asChild type="button" variant="ghost">
							<Link to="/tickets">Cancel</Link>
						</Button>
						<Button type="submit" disabled={!formValid || submitting}>
							{submitting ? (
								"PUBLISHING…"
							) : (
								<>
									<Send /> Publish ticket
								</>
							)}
						</Button>
					</div>
				</form>
			</section>

			<aside className="space-y-6">
				<section className="border border-rule bg-ink-2 p-5">
					<div className="flex items-center gap-2 border-rule border-b pb-3">
						<Check className="size-4 text-brand" />
						<Kicker>HOUSE RULES</Kicker>
					</div>
					<div className="mt-3 space-y-3 text-bone-2 text-sm leading-relaxed">
						<p>
							<strong className="text-bone">Be specific.</strong> "Will they
							flake?" is vague. "Will they cancel Friday's dinner less than 6h
							before?" resolves cleanly.
						</p>
						<p>
							<strong className="text-bone">Pick a source.</strong> Group chat,
							Venmo, photo, scoreboard. Without one, traders argue forever.
						</p>
						<p>
							<strong className="text-bone">Subjects can't trade.</strong>{" "}
							Neither can the creator. The ticket settles by what the rest of
							the room thinks.
						</p>
					</div>
				</section>
			</aside>
		</div>
	);
}

function SubjectPicker({
	meId,
	onPick,
}: {
	meId: Id<"users"> | undefined;
	onPick: (choice: SubjectChoice) => void;
}) {
	const [mode, setMode] = useState<"user" | "name">("user");
	const [q, setQ] = useState("");
	const [name, setName] = useState("");
	const trimmed = q.trim();
	const results = useQuery(
		api.users.search,
		mode === "user" && trimmed.length >= 1 ? { q: trimmed, limit: 8 } : "skip"
	);

	const trimmedName = name.trim();
	const nameOk = trimmedName.length > 0 && trimmedName.length <= 60;

	return (
		<div className="space-y-2">
			{mode === "user" ? (
				<>
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
										return (
											<li key={u._id}>
												<button
													type="button"
													disabled={isMe}
													onClick={() => onPick({ kind: "user", user: u })}
													className={cn(
														"flex w-full items-center gap-3 border-rule border-b px-3 py-2 text-left transition last:border-b-0",
														isMe
															? "cursor-not-allowed opacity-50"
															: "hover:bg-brand-wash"
													)}
												>
													{u.image ? (
														<img
															src={u.image}
															alt=""
															className="size-8 border border-rule object-cover"
														/>
													) : (
														<div className="grid size-8 place-items-center border border-rule bg-ink-2 text-bone-2 text-xs">
															{(u.name ?? u.handle).slice(0, 2)}
														</div>
													)}
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
				</>
			) : (
				<div className="flex flex-col gap-2 sm:flex-row">
					<Input
						placeholder="e.g. Carla from accounting"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={60}
					/>
					<Button
						type="button"
						disabled={!nameOk}
						onClick={() => onPick({ kind: "name", name: trimmedName })}
					>
						Use name
					</Button>
				</div>
			)}
			<button
				type="button"
				onClick={() => setMode(mode === "user" ? "name" : "user")}
				className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.12em] hover:text-brand"
			>
				{mode === "user"
					? "→ Not on Charles? Use a name instead"
					: "← Pick a user instead"}
			</button>
		</div>
	);
}

function SignInPanel() {
	return (
		<div className="mt-12 border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-3 text-2xl">
				Sign in to create a ticket
			</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				You need an account to publish a ticket. It's free and your first{" "}
				{CURRENCY_SYMBOL}2,000 in play-money shekels are on us.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
