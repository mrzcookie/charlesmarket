import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
} from "convex/react";
import { ArrowRight, Lightbulb, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SignInButton } from "@/components/auth-controls";
import { Kicker } from "@/components/console";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { CURRENCY_SYMBOL, categories } from "@/lib/markets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/propose")({
	component: ProposePage,
});

type Example = {
	question: string;
	description: string;
	category: string;
	tags: string;
};

const EXAMPLES: Example[] = [
	{
		question: "Will Charles return the rental car without a new dent?",
		description:
			"Resolves YES if the Hertz inspection report shows no new damage versus pickup.",
		category: "Mishaps",
		tags: "travel, chaos",
	},
	{
		question: "Will Charles finish 'Annihilation' before our book club?",
		description:
			"Resolves YES if Charles can answer 3 spoiler questions at the June 10 meetup.",
		category: "Antics",
		tags: "reading, book-club",
	},
	{
		question: "Will Charles RSVP to the wedding within 7 days?",
		description:
			"Resolves YES if the wedding website shows Charles's RSVP submitted within 7 days of the invite.",
		category: "Relationships",
		tags: "wedding, deadline",
	},
];

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

function ProposePage() {
	return (
		<main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
			<header>
				<Kicker>PROPOSE</Kicker>
				<h1 className="display-headline mt-2 text-4xl sm:text-5xl">
					Pitch the next ticket
				</h1>
				<p className="mt-3 max-w-2xl text-bone-2 text-sm sm:text-base">
					Submit a question, set the closing date, and the moderators will
					approve, reject, or send notes. Approved tickets go live with your
					starting Yes price.
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

function AuthedBody() {
	const submit = useMutation(api.proposals.submit);
	const navigate = useNavigate();

	const [question, setQuestion] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState<string>("Antics");
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
	const formValid = questionOk && descriptionOk && futureOk && yesOk && liqOk;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formValid || submitting) return;
		setSubmitting(true);
		try {
			await submit({
				question: questionTrim,
				description: descriptionTrim,
				category,
				tags,
				closesAt: closesAtLabel,
				closesAtMs,
				initialYesPrice: yesPrice,
				initialLiquidity: liquidity,
			});
			toast.success("Proposal submitted", {
				description: "Admins will review it shortly.",
			});
			navigate({ to: "/portfolio" });
		} catch (err) {
			toast.error("Couldn't submit proposal", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	const fillExample = (ex: Example) => {
		setQuestion(ex.question);
		setDescription(ex.description);
		setCategory(ex.category);
		setTagInput(ex.tags);
	};

	return (
		<div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.6fr_1fr]">
			<section className="border border-rule bg-ink-2 p-6">
				<div className="border-rule border-b pb-3">
					<Kicker>TICKET DETAILS</Kicker>
					<p className="mt-2 text-bone-2 text-sm">
						Be specific. Vague questions get rejected, the question itself
						should make the YES/NO call unambiguous.
					</p>
				</div>
				<form className="mt-6 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="question">Question</Label>
						<Input
							id="question"
							placeholder="Will Charles…?"
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
						<Label htmlFor="category">Category</Label>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger id="category">
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
							<Link to="/markets">Cancel</Link>
						</Button>
						<Button type="submit" disabled={!formValid || submitting}>
							{submitting ? (
								"SUBMITTING…"
							) : (
								<>
									<Send /> Submit for review
								</>
							)}
						</Button>
					</div>
				</form>
			</section>

			<aside className="space-y-6">
				<section className="border border-rule bg-ink-2 p-5">
					<div className="flex items-center gap-2 border-rule border-b pb-3">
						<Lightbulb className="size-4 text-brand" />
						<Kicker>SHIPPING RULES</Kicker>
					</div>
					<div className="mt-3 space-y-3 text-bone-2 text-sm leading-relaxed">
						<p>
							<strong className="text-bone">Be specific.</strong> "Will Charles
							flake?" is too vague. "Will Charles cancel Friday's hang less than
							6h before?" is testable.
						</p>
						<p>
							<strong className="text-bone">Pick a source.</strong> Group chat
							receipts, Venmo, photo evidence. Without a source, traders argue
							forever.
						</p>
						<p>
							<strong className="text-bone">Set a deadline.</strong> Open ended
							markets never settle.
						</p>
					</div>
				</section>

				<section className="border border-rule bg-ink-2 p-5">
					<div className="border-rule border-b pb-3">
						<Kicker>EXAMPLES</Kicker>
						<p className="mt-2 text-bone-3 text-xs">Click to autofill.</p>
					</div>
					<div className="mt-3 space-y-2">
						{EXAMPLES.map((ex) => (
							<button
								key={ex.question}
								type="button"
								onClick={() => fillExample(ex)}
								className="group block w-full border border-rule bg-ink p-3 text-left text-sm transition hover:border-brand hover:bg-brand-wash"
							>
								<div className="flex items-start justify-between gap-2">
									<span className="font-display font-semibold text-bone group-hover:text-brand">
										{ex.question}
									</span>
									<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-bone-3 group-hover:text-brand" />
								</div>
								<div className="mt-1 font-mono text-[10px] text-bone-3 uppercase tracking-[0.14em]">
									{ex.category}
								</div>
							</button>
						))}
					</div>
				</section>
			</aside>
		</div>
	);
}

function SignInPanel() {
	return (
		<div className="mt-12 border border-rule bg-ink-2 px-6 py-16 text-center">
			<Kicker>SIGNED OUT</Kicker>
			<h2 className="display-headline mt-3 text-2xl">
				Sign in to propose a ticket
			</h2>
			<p className="mx-auto mt-3 max-w-md text-bone-2 text-sm">
				You need an account to submit a proposal. It's free and your first
				{CURRENCY_SYMBOL}1,000 in play-money shekels are on us.
			</p>
			<SignInButton size="lg" className="mt-6" label="Sign in with Google" />
		</div>
	);
}
