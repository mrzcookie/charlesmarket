import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
} from "convex/react";
import { ArrowRight, Lightbulb, Send, Sparkles } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCY_SYMBOL, categories } from "@/lib/markets";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/propose")({
	component: ProposePage,
});

type Example = {
	question: string;
	category: string;
	resolutionSource: string;
	tags: string;
};

const EXAMPLES: Example[] = [
	{
		question: "Will Charles return the rental car without a new dent?",
		category: "Mishaps",
		resolutionSource: "Hertz inspection report",
		tags: "travel, chaos",
	},
	{
		question: "Will Charles finish 'Annihilation' before our book club?",
		category: "Antics",
		resolutionSource: "Live quiz at book club",
		tags: "reading, book-club",
	},
	{
		question: "Will Charles RSVP to the wedding within 7 days?",
		category: "Relationships",
		resolutionSource: "Wedding RSVP timestamp",
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
		<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
			<header className="flex flex-col gap-2">
				<Badge variant="brand" className="w-fit gap-1.5">
					<Sparkles className="size-3.5" /> Propose a market
				</Badge>
				<h1 className="font-bold text-3xl tracking-tight">
					Pitch your next Charles market
				</h1>
				<p className="max-w-2xl text-muted-foreground">
					Submit a question, set the closing date, and the moderators will
					approve, reject, or send notes. Approved markets go live with your
					starting Yes price and liquidity.
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
	const [category, setCategory] = useState<string>("Antics");
	const [resolutionSource, setResolutionSource] = useState("");
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
	const questionOk =
		questionTrim.length >= 12 &&
		questionTrim.length <= 140 &&
		questionTrim.endsWith("?");
	const resolutionOk = resolutionSource.trim().length > 0;
	const futureOk =
		Number.isFinite(closesAtMs) && closesAtMs > Date.now() + 5 * 60_000;
	const yesOk = yesPrice > 0.01 && yesPrice < 0.99;
	const liqOk = liquidity >= 100 && liquidity <= 50_000;
	const formValid = questionOk && resolutionOk && futureOk && yesOk && liqOk;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formValid || submitting) return;
		setSubmitting(true);
		try {
			await submit({
				question: questionTrim,
				category,
				resolutionSource: resolutionSource.trim(),
				tags,
				closesAt: closesAtLabel,
				closesAtMs,
				initialYesPrice: yesPrice,
				initialLiquidity: liquidity,
			});
			toast.success("Proposal submitted", {
				description: "Moderators will review it shortly.",
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
		setCategory(ex.category);
		setResolutionSource(ex.resolutionSource);
		setTagInput(ex.tags);
	};

	return (
		<div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
			<Card>
				<CardHeader>
					<CardTitle>Market details</CardTitle>
					<CardDescription>
						Be specific. Vague questions get rejected — the question itself
						should make the YES/NO call unambiguous.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="space-y-6" onSubmit={handleSubmit}>
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
							<div className="flex justify-between text-muted-foreground text-xs">
								<span>Must end with '?' and be 12–140 characters.</span>
								<span className="font-mono">{question.length}/140</span>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
								<Label htmlFor="source">Resolution source</Label>
								<Input
									id="source"
									placeholder="e.g. group chat timestamp, receipt, Strava"
									value={resolutionSource}
									onChange={(e) => setResolutionSource(e.target.value)}
									maxLength={120}
								/>
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
										<Badge
											key={t}
											variant="outline"
											className="font-mono text-xs"
										>
											#{t}
										</Badge>
									))}
								</div>
							)}
						</div>

						<Separator />

						<div className="space-y-3">
							<Label>Closes</Label>
							<div className="flex flex-wrap gap-2">
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
									className="max-w-xs"
								/>
							)}
							<div className="text-muted-foreground text-xs">
								{futureOk ? (
									<>
										Will close{" "}
										<span className="font-medium text-foreground">
											{closesAtLabel}
										</span>{" "}
										({new Date(closesAtMs).toLocaleString()})
									</>
								) : (
									<span className="text-destructive">
										Closing time must be at least 5 minutes from now.
									</span>
								)}
							</div>
						</div>

						<Separator />

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="yes">
									Starting Yes price{" "}
									<span className="text-muted-foreground">(0.02 – 0.98)</span>
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
										className="flex-1 accent-primary"
									/>
									<Badge
										variant="brand"
										className="w-16 justify-center font-mono"
									>
										{CURRENCY_SYMBOL}
										{Math.round(yesPrice * 100)}
									</Badge>
								</div>
								<p className="text-muted-foreground text-xs">
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
										className="font-mono"
									/>
									<span className="font-mono text-muted-foreground text-sm">
										{CURRENCY_SYMBOL}
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									Bigger liquidity = smaller price swings per trade.
								</p>
							</div>
						</div>

						<Separator />

						<div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
							<Button asChild type="button" variant="ghost">
								<Link to="/markets">Cancel</Link>
							</Button>
							<Button type="submit" disabled={!formValid || submitting}>
								{submitting ? (
									"Submitting…"
								) : (
									<>
										<Send /> Submit for review
									</>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<aside className="space-y-4">
				<Card className="bg-gradient-to-br from-accent/40 to-card">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Lightbulb className="size-4 text-primary" />
							Tips for great markets
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-muted-foreground text-sm">
						<p>
							<strong className="text-foreground">Be specific.</strong> "Will
							Charles flake?" is too vague. "Will Charles cancel Friday's hang
							less than 6h before?" is testable.
						</p>
						<p>
							<strong className="text-foreground">Pick a source.</strong> Group
							chat receipts, Venmo, photo evidence. Without a source, traders
							argue forever.
						</p>
						<p>
							<strong className="text-foreground">Set a deadline.</strong>{" "}
							Open-ended markets never settle.
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Examples</CardTitle>
						<CardDescription>Click to autofill.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{EXAMPLES.map((ex) => (
							<button
								key={ex.question}
								type="button"
								onClick={() => fillExample(ex)}
								className="block w-full rounded-md border border-transparent bg-muted/50 p-3 text-left text-sm transition hover:border-primary/40 hover:bg-accent"
							>
								<div className="flex items-start justify-between gap-2">
									<span className="font-medium">{ex.question}</span>
									<ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
								</div>
								<div className="mt-1 text-muted-foreground text-xs">
									{ex.category} · {ex.resolutionSource}
								</div>
							</button>
						))}
					</CardContent>
				</Card>
			</aside>
		</div>
	);
}

function SignInPanel() {
	return (
		<Card className="mt-8 border-primary/30 bg-accent/30">
			<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
				<h2 className="font-semibold text-xl">Sign in to propose a market</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					You need an account to submit a proposal. It's free and your first
					1,000 shekels are on us.
				</p>
				<SignInButton size="lg" label="Sign in with Google" />
			</CardContent>
		</Card>
	);
}
