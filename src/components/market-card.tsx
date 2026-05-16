import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	CURRENCY_SYMBOL,
	cents,
	type Market,
	money,
	type UIMarket,
} from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useBalance } from "@/lib/wallet";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SignInButton } from "./auth-controls";
import { marketId, Sparkline } from "./console";

type Variant = "default" | "compact" | "featured";

export function MarketCard({
	market,
	variant = "default",
}: {
	market: Market;
	variant?: Variant;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogSide, setDialogSide] = useState<"Yes" | "No">("Yes");

	const openBuy = (side: "Yes" | "No") => {
		setDialogSide(side);
		setDialogOpen(true);
	};

	const yes = market.yesPrice;
	const no = 1 - yes;
	const id = marketId(market.slug);
	const sparkPts = market.history.map((h) => h.yes);

	if (variant === "featured") {
		return (
			<>
				<Link
					to="/market/$id"
					params={{ id: market.slug }}
					className="group block border border-rule bg-ink-2 p-6 transition-colors hover:border-rule-bright hover:bg-ink-3 sm:p-8"
				>
					<TicketMeta market={market} id={id} />
					<h3 className="display-headline mt-6 text-2xl sm:text-3xl md:text-[2.5rem]">
						{market.question}
					</h3>
					<div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
						<div className="flex h-32 items-end sm:h-40">
							<Sparkline
								points={sparkPts}
								trend={market.trend}
								width={520}
								height={140}
								className="h-full w-full"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<PriceSlab
								side="yes"
								price={yes}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									openBuy("Yes");
								}}
							/>
							<PriceSlab
								side="no"
								price={no}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									openBuy("No");
								}}
							/>
						</div>
					</div>
					<TicketFooter market={market} />
				</Link>

				{"_id" in market && (
					<QuickBuyDialog
						market={market as UIMarket}
						open={dialogOpen}
						onOpenChange={setDialogOpen}
						initialSide={dialogSide}
					/>
				)}
			</>
		);
	}

	if (variant === "compact") {
		return (
			<>
				<Link
					to="/market/$id"
					params={{ id: market.slug }}
					className="ledger-row group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-3 py-3 sm:gap-6 sm:px-4 sm:py-4"
				>
					<span className="font-bold font-mono text-bone-3 text-xs tabular-nums">
						{id}
					</span>
					<div className="min-w-0">
						<div className="line-clamp-2 font-display font-semibold text-bone text-sm leading-tight tracking-[-0.01em] group-hover:text-brand sm:text-base">
							{market.question}
						</div>
						<div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-bone-3 uppercase tracking-[0.12em]">
							<span>{market.category}</span>
							<span aria-hidden="true">·</span>
							<span>{market.closesIn}</span>
						</div>
					</div>
					<Sparkline
						points={sparkPts}
						trend={market.trend}
						width={68}
						height={22}
						className="hidden sm:block"
					/>
					<div className="flex items-center gap-2">
						<span className="font-bold font-mono text-brand text-sm tabular-nums">
							{cents(yes)}
						</span>
						<span className="font-mono text-bone-3 text-xs tabular-nums">
							/ {cents(no)}
						</span>
					</div>
				</Link>

				{"_id" in market && (
					<QuickBuyDialog
						market={market as UIMarket}
						open={dialogOpen}
						onOpenChange={setDialogOpen}
						initialSide={dialogSide}
					/>
				)}
			</>
		);
	}

	return (
		<>
			<Link
				to="/market/$id"
				params={{ id: market.slug }}
				className="group flex h-full flex-col border border-rule bg-ink-2 p-4 transition-colors hover:border-rule-bright hover:bg-ink-3 sm:p-5"
			>
				<TicketMeta market={market} id={id} />
				<h3 className="display-question mt-3 line-clamp-3 text-bone text-lg group-hover:text-brand sm:text-xl">
					{market.question}
				</h3>
				<div className="mt-4 flex h-10 items-end">
					<Sparkline
						points={sparkPts}
						trend={market.trend}
						width={240}
						height={36}
						className="h-full w-full"
					/>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<PriceSlab
						side="yes"
						price={yes}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							openBuy("Yes");
						}}
					/>
					<PriceSlab
						side="no"
						price={no}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							openBuy("No");
						}}
					/>
				</div>
				<TicketFooter market={market} />
			</Link>

			{"_id" in market && (
				<QuickBuyDialog
					market={market as UIMarket}
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					initialSide={dialogSide}
				/>
			)}
		</>
	);
}

function TicketMeta({ market, id }: { market: Market; id: string }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.12em]">
			<div className="flex items-center gap-2 text-bone-3">
				<span className="font-bold text-bone">{id}</span>
				<span aria-hidden="true">·</span>
				<span>{market.category}</span>
			</div>
			<TrendBadge trend={market.trend} delta={market.delta} />
		</div>
	);
}

function TicketFooter({ market }: { market: Market }) {
	return (
		<div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-rule border-t pt-3 font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
			<span>
				VOL{" "}
				<span className="text-bone tabular-nums">{money(market.volume)}</span>
			</span>
			<span>
				LIQ{" "}
				<span className="text-bone tabular-nums">
					{money(market.liquidity)}
				</span>
			</span>
			<span>
				CLOSES <span className="text-bone">{market.closesIn}</span>
			</span>
		</div>
	);
}

function PriceSlab({
	side,
	price,
	onClick,
}: {
	side: "yes" | "no";
	price: number;
	onClick: (e: React.MouseEvent) => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			data-side={side}
			className="price-slab"
		>
			<span className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.14em]">
				{side === "yes" ? "BUY YES" : "BUY NO"}
			</span>
			<span
				className={cn(
					"font-bold font-mono text-xl tabular-nums",
					side === "yes" ? "text-brand" : "text-magenta"
				)}
			>
				{cents(price)}
			</span>
		</button>
	);
}

export function QuickBuyDialog({
	market,
	open,
	onOpenChange,
	initialSide,
}: {
	market: UIMarket;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialSide: "Yes" | "No";
}) {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const { balance, mounted } = useBalance();
	const placeOrder = useMutation(api.orders.place);

	const [side, setSide] = useState<"Yes" | "No">(initialSide);
	const [amount, setAmount] = useState("100");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (open) setSide(initialSide);
	}, [open, initialSide]);

	const price = side === "Yes" ? market.yesPrice : 1 - market.yesPrice;
	const cost = Number(amount) || 0;
	const shares = price > 0 ? cost / price : 0;
	const insufficient = isAuthenticated && cost > balance;
	const id = marketId(market.slug);

	const submit = async () => {
		if (cost <= 0) return;
		if (insufficient) {
			toast.error("Not enough shekels", {
				description: `You have ${CURRENCY_SYMBOL}${Math.round(balance)} but tried to spend ${CURRENCY_SYMBOL}${Math.round(cost)}.`,
			});
			return;
		}
		setSubmitting(true);
		try {
			const result = await placeOrder({
				marketId: market._id as Id<"markets">,
				side,
				amount: cost,
			});
			toast.success(
				`Bought ${side} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`,
				{
					description: `${result.shares.toFixed(2)} shares @ ${cents(result.price)} · payout ${CURRENCY_SYMBOL}${Math.round(result.shares).toLocaleString()}`,
				}
			);
			setAmount("100");
			onOpenChange(false);
		} catch (err) {
			toast.error("Order failed", {
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm gap-3 sm:gap-4">
				<DialogHeader className="pr-8">
					<div className="font-mono font-semibold text-[11px] text-bone-3 uppercase tracking-[0.14em]">
						QUICK ORDER · {id}
					</div>
					<DialogTitle className="line-clamp-3 font-display text-base leading-snug">
						{market.question}
					</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-3 py-2">
						<div className="h-10 w-full animate-pulse bg-ink-3" />
						<div className="h-10 w-full animate-pulse bg-ink-3" />
					</div>
				) : !isAuthenticated ? (
					<div className="space-y-4 py-2">
						<p className="text-bone-2 text-sm">
							Sign in to trade. Everyone starts with {CURRENCY_SYMBOL}1,000 in
							play-money shekels.
						</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="price-slab" data-side="yes" data-active="true">
								<span className="text-[10px]">YES</span>
								<span className="font-bold text-base">
									{cents(market.yesPrice)}
								</span>
							</div>
							<div className="price-slab" data-side="no" data-active="true">
								<span className="text-[10px]">NO</span>
								<span className="font-bold text-base">
									{cents(1 - market.yesPrice)}
								</span>
							</div>
						</div>
						<SignInButton
							variant="default"
							size="lg"
							className="w-full"
							label="Sign in with Google"
						/>
					</div>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setSide("Yes")}
								data-side="yes"
								data-active={side === "Yes" ? "true" : undefined}
								className="price-slab"
							>
								<span className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
									YES
								</span>
								<span
									className={cn(
										"font-bold font-mono text-lg tabular-nums",
										side === "Yes" ? "text-brand" : "text-bone"
									)}
								>
									{cents(market.yesPrice)}
								</span>
							</button>
							<button
								type="button"
								onClick={() => setSide("No")}
								data-side="no"
								data-active={side === "No" ? "true" : undefined}
								className="price-slab"
							>
								<span className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.12em]">
									NO
								</span>
								<span
									className={cn(
										"font-bold font-mono text-lg tabular-nums",
										side === "No" ? "text-magenta" : "text-bone"
									)}
								>
									{cents(1 - market.yesPrice)}
								</span>
							</button>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<Label
									htmlFor="quick-amount"
									className="font-mono font-semibold text-[10px] text-bone-3 uppercase tracking-[0.14em]"
								>
									Amount
								</Label>
								<span className="font-mono text-[11px] text-bone-3 uppercase tracking-[0.1em]">
									CASH{" "}
									<span className="text-bone tabular-nums">
										{CURRENCY_SYMBOL}
										{mounted ? Math.round(balance).toLocaleString() : "—"}
									</span>
								</span>
							</div>
							<div
								className={cn(
									"flex items-center gap-2 rounded-[4px] border border-rule bg-ink px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
									insufficient &&
										"border-magenta/60 focus-within:border-magenta"
								)}
							>
								<span className="font-mono text-bone-3">{CURRENCY_SYMBOL}</span>
								<Input
									id="quick-amount"
									inputMode="decimal"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="mono-input h-11 border-0 bg-transparent p-0 text-lg shadow-none focus-visible:border-0 focus-visible:ring-0"
								/>
							</div>
							<div className="grid grid-cols-4 gap-1.5 pt-1">
								{["50", "100", "250", "500"].map((v) => (
									<Button
										key={v}
										variant="outline"
										size="sm"
										onClick={() => setAmount(v)}
									>
										{CURRENCY_SYMBOL}
										{v}
									</Button>
								))}
							</div>
						</div>

						<div className="space-y-1.5 border border-rule bg-ink p-3 font-mono text-[12px] tabular-nums">
							<Row label="AVG PRICE" value={cents(price)} />
							<Row label="SHARES" value={shares.toFixed(2)} />
							<div className="border-rule border-t pt-1.5">
								<Row
									label="MAX PAYOUT"
									value={`${CURRENCY_SYMBOL}${Math.round(shares).toLocaleString()}`}
									accent
								/>
							</div>
						</div>

						<Button
							variant={side === "Yes" ? "yes" : "no"}
							size="lg"
							className="h-12 w-full text-sm"
							disabled={submitting || insufficient || cost <= 0}
							onClick={submit}
						>
							{submitting
								? "PLACING…"
								: insufficient
									? "NOT ENOUGH SHEKELS"
									: cost <= 0
										? "ENTER AN AMOUNT"
										: `BUY ${side.toUpperCase()} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`}
						</Button>

						<Link
							to="/market/$id"
							params={{ id: market.slug }}
							className="block text-center font-mono text-[11px] text-bone-3 uppercase tracking-[0.14em] hover:text-brand"
							onClick={() => onOpenChange(false)}
						>
							→ Open full ticket
						</Link>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function Row({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center justify-between text-[12px]">
			<span className="text-bone-3 tracking-[0.12em]">{label}</span>
			<span className={cn(accent ? "font-bold text-brand" : "text-bone")}>
				{value}
			</span>
		</div>
	);
}

export function TrendBadge({
	trend,
	delta,
}: {
	trend: Market["trend"];
	delta: number;
}) {
	const sign = trend === "up" ? "▲" : trend === "down" ? "▼" : "─";
	const tone =
		trend === "up"
			? "text-brand"
			: trend === "down"
				? "text-magenta"
				: "text-bone-3";
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 font-bold font-mono text-[11px] uppercase tabular-nums tracking-[0.1em]",
				tone
			)}
		>
			<span aria-hidden="true">{sign}</span>
			{trend === "flat" ? "—" : cents(Math.abs(delta))}
		</span>
	);
}

export function PriceBar({ yes, no }: { yes: number; no: number }) {
	return (
		<div>
			<div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em]">
				<span className="font-bold text-brand tabular-nums">
					YES {cents(yes)}
				</span>
				<span className="font-bold text-magenta tabular-nums">
					NO {cents(no)}
				</span>
			</div>
			<div className="mt-1.5 flex h-1 w-full overflow-hidden bg-ink-3">
				<div className="bg-brand" style={{ width: `${yes * 100}%` }} />
				<div className="bg-magenta" style={{ width: `${no * 100}%` }} />
			</div>
		</div>
	);
}

export function BuyButton({
	outcome,
	price,
	onBuy,
}: {
	outcome: "yes" | "no";
	price: number;
	onBuy?: () => void;
}) {
	return (
		<Button
			variant={outcome === "yes" ? "yes-soft" : "no-soft"}
			className="h-10 sm:h-9"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onBuy?.();
			}}
		>
			BUY {outcome.toUpperCase()} · {cents(price)}
		</Button>
	);
}
