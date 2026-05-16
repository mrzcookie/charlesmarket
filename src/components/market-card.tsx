import { Link } from "@tanstack/react-router";
import { useConvexAuth, useMutation } from "convex/react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

export function MarketCard({ market }: { market: Market }) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogSide, setDialogSide] = useState<"Yes" | "No">("Yes");

	const openBuy = (side: "Yes" | "No") => {
		setDialogSide(side);
		setDialogOpen(true);
	};

	const yes = market.yesPrice;
	const no = 1 - yes;

	return (
		<>
			<Link
				to="/market/$id"
				params={{ id: market.slug }}
				className="group block"
			>
				<Card className="h-full gap-4 transition-shadow hover:shadow-md">
					<CardContent className="flex flex-col gap-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<Badge variant="secondary" className="text-[10px] uppercase">
									{market.category}
								</Badge>
								<h3 className="mt-2 line-clamp-2 font-semibold text-base leading-snug group-hover:text-primary">
									{market.question}
								</h3>
							</div>
							<TrendBadge trend={market.trend} delta={market.delta} />
						</div>

						<PriceBar yes={yes} no={no} />

						<div className="grid grid-cols-2 gap-2">
							<BuyButton
								outcome="yes"
								price={yes}
								onBuy={() => openBuy("Yes")}
							/>
							<BuyButton outcome="no" price={no} onBuy={() => openBuy("No")} />
						</div>
					</CardContent>
					<CardFooter className="justify-between border-t pt-3 text-muted-foreground text-xs">
						<span>Vol {money(market.volume)}</span>
						<span>Liq {money(market.liquidity)}</span>
						<span>Closes {market.closesIn}</span>
					</CardFooter>
				</Card>
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

function QuickBuyDialog({
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

	// Sync side when dialog re-opens with a different initial side
	const handleOpenChange = (next: boolean) => {
		if (next) setSide(initialSide);
		onOpenChange(next);
	};

	const price = side === "Yes" ? market.yesPrice : 1 - market.yesPrice;
	const cost = Number(amount) || 0;
	const shares = price > 0 ? cost / price : 0;
	const insufficient = isAuthenticated && cost > balance;

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
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle className="line-clamp-2 font-medium text-muted-foreground text-sm leading-snug">
						{market.question}
					</DialogTitle>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-3 py-2">
						<div className="h-10 w-full animate-pulse rounded bg-muted" />
						<div className="h-10 w-full animate-pulse rounded bg-muted" />
					</div>
				) : !isAuthenticated ? (
					<div className="space-y-4 py-2">
						<p className="text-muted-foreground text-sm">
							Sign in to place orders. Everyone starts with {CURRENCY_SYMBOL}
							1,000 in play-money shekels.
						</p>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-md border bg-yes/10 px-3 py-2 text-center">
								<div className="text-muted-foreground text-xs">Yes</div>
								<div className="font-mono font-semibold text-yes">
									{cents(market.yesPrice)}
								</div>
							</div>
							<div className="rounded-md border bg-no/10 px-3 py-2 text-center">
								<div className="text-muted-foreground text-xs">No</div>
								<div className="font-mono font-semibold text-no">
									{cents(1 - market.yesPrice)}
								</div>
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
					<div className="space-y-4 py-2">
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={side === "Yes" ? "yes" : "secondary"}
								onClick={() => setSide("Yes")}
							>
								Yes · {cents(market.yesPrice)}
							</Button>
							<Button
								variant={side === "No" ? "no" : "secondary"}
								onClick={() => setSide("No")}
							>
								No · {cents(1 - market.yesPrice)}
							</Button>
						</div>

						<div className="space-y-1.5">
							<Label
								htmlFor="quick-amount"
								className="text-muted-foreground text-xs"
							>
								Amount
							</Label>
							<div className="flex items-center gap-2 rounded-md border bg-muted px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
								<span className="font-mono text-muted-foreground">
									{CURRENCY_SYMBOL}
								</span>
								<Input
									id="quick-amount"
									inputMode="decimal"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="h-10 border-0 bg-transparent p-0 font-semibold text-lg shadow-none focus-visible:border-0 focus-visible:ring-0"
								/>
								<span className="text-muted-foreground text-xs">
									/ {mounted ? Math.round(balance).toLocaleString() : "—"}
								</span>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{["50", "100", "250", "500"].map((v) => (
								<Button
									key={v}
									variant="outline"
									size="xs"
									onClick={() => setAmount(v)}
								>
									{CURRENCY_SYMBOL}
									{v}
								</Button>
							))}
						</div>

						<div className="space-y-1.5 rounded-md bg-muted/50 px-3 py-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Avg price</span>
								<span className="font-mono">{cents(price)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Shares</span>
								<span className="font-mono">{shares.toFixed(2)}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Max payout</span>
								<span className="font-semibold">
									{CURRENCY_SYMBOL}
									{Math.round(shares).toLocaleString()}
								</span>
							</div>
						</div>

						<Button
							variant={side === "Yes" ? "yes" : "no"}
							size="lg"
							className="w-full"
							disabled={submitting || insufficient || cost <= 0}
							onClick={submit}
						>
							{submitting
								? "Placing…"
								: insufficient
									? "Not enough shekels"
									: cost <= 0
										? "Enter an amount"
										: `Buy ${side} · ${CURRENCY_SYMBOL}${Math.round(cost).toLocaleString()}`}
						</Button>

						<Link
							to="/market/$id"
							params={{ id: market.slug }}
							className="block text-center text-muted-foreground text-xs hover:text-foreground"
							onClick={() => onOpenChange(false)}
						>
							View full market →
						</Link>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

export function TrendBadge({
	trend,
	delta,
}: {
	trend: Market["trend"];
	delta: number;
}) {
	const Icon =
		trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
	return (
		<div
			className={cn(
				"flex shrink-0 flex-col items-end text-xs",
				trend === "up" && "text-yes",
				trend === "down" && "text-no",
				trend === "flat" && "text-muted-foreground"
			)}
		>
			<div className="flex items-center gap-1 font-mono font-semibold text-sm">
				<Icon className="size-3.5" />
				{cents(Math.abs(delta))}
			</div>
			<div className="text-[10px] text-muted-foreground">24h</div>
		</div>
	);
}

export function PriceBar({ yes, no }: { yes: number; no: number }) {
	return (
		<div>
			<div className="flex items-center justify-between font-mono text-xs">
				<span className="font-semibold text-yes">Yes {cents(yes)}</span>
				<span className="font-semibold text-no">No {cents(no)}</span>
			</div>
			<div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div className="bg-yes" style={{ width: `${yes * 100}%` }} />
				<div className="bg-no" style={{ width: `${no * 100}%` }} />
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
			size="sm"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onBuy?.();
			}}
		>
			Buy {outcome === "yes" ? "Yes" : "No"} · {cents(price)}
		</Button>
	);
}
