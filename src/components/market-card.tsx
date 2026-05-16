import { Link } from "@tanstack/react-router";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cents, type Market, money } from "@/lib/markets";
import { cn } from "@/lib/utils";

export function MarketCard({ market }: { market: Market }) {
	const yes = market.yesPrice;
	const no = 1 - yes;

	return (
		<Link to="/market/$id" params={{ id: market.slug }} className="group block">
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
						<BuyButton outcome="yes" price={yes} />
						<BuyButton outcome="no" price={no} />
					</div>
				</CardContent>
				<CardFooter className="justify-between border-t pt-3 text-muted-foreground text-xs">
					<span>Vol {money(market.volume)}</span>
					<span>Liq {money(market.liquidity)}</span>
					<span>Closes {market.closesIn}</span>
				</CardFooter>
			</Card>
		</Link>
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
}: {
	outcome: "yes" | "no";
	price: number;
}) {
	return (
		<Button
			variant={outcome === "yes" ? "yes-soft" : "no-soft"}
			size="sm"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
			}}
		>
			Buy {outcome === "yes" ? "Yes" : "No"} · {cents(price)}
		</Button>
	);
}
