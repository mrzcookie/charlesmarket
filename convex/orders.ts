import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./users";

const sideUnion = v.union(v.literal("Yes"), v.literal("No"));

function priceImpact(yesPrice: number, side: "Yes" | "No", amount: number) {
	const direction = side === "Yes" ? 1 : -1;
	const nudge = direction * (amount / 5000);
	return Math.max(0.01, Math.min(0.99, yesPrice + nudge));
}

export const place = mutation({
	args: {
		marketId: v.id("markets"),
		side: sideUnion,
		amount: v.number(),
	},
	handler: async (ctx, { marketId, side, amount }) => {
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new Error("Amount must be positive");
		}
		const user = await requireUser(ctx);
		const balance = user.balance ?? 0;
		if (balance < amount) throw new Error("Insufficient shekels");

		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		if (market.status !== "open") throw new Error("Market is closed");

		const price = side === "Yes" ? market.yesPrice : 1 - market.yesPrice;
		if (price <= 0 || price >= 1) throw new Error("Invalid market price");
		const shares = amount / price;

		await ctx.db.patch(user._id, { balance: balance - amount });

		const existing = await ctx.db
			.query("positions")
			.withIndex("by_user_market_side", (q) =>
				q.eq("userId", user._id).eq("marketId", marketId).eq("side", side)
			)
			.unique();

		if (existing) {
			const newShares = existing.shares + shares;
			const newAvg =
				(existing.shares * existing.avgPrice + shares * price) / newShares;
			await ctx.db.patch(existing._id, {
				shares: newShares,
				avgPrice: newAvg,
			});
		} else {
			await ctx.db.insert("positions", {
				userId: user._id,
				marketId,
				side,
				shares,
				avgPrice: price,
				realizedPnl: 0,
			});
		}

		await ctx.db.insert("trades", {
			userId: user._id,
			marketId,
			side,
			kind: "buy",
			shares,
			price,
			cost: amount,
		});

		const nextYes = priceImpact(market.yesPrice, side, amount);
		await ctx.db.patch(marketId, {
			yesPrice: nextYes,
			volume: market.volume + amount,
			openInterest: market.openInterest + amount,
		});
		await ctx.db.insert("priceTicks", { marketId, yesPrice: nextYes });

		return {
			shares,
			price,
			newBalance: balance - amount,
			yesPrice: nextYes,
		};
	},
});

export const sell = mutation({
	args: {
		marketId: v.id("markets"),
		side: sideUnion,
		shares: v.number(),
	},
	handler: async (ctx, { marketId, side, shares }) => {
		if (!Number.isFinite(shares) || shares <= 0) {
			throw new Error("Shares must be positive");
		}
		const user = await requireUser(ctx);

		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		if (market.status !== "open") throw new Error("Market is closed");

		const position = await ctx.db
			.query("positions")
			.withIndex("by_user_market_side", (q) =>
				q.eq("userId", user._id).eq("marketId", marketId).eq("side", side)
			)
			.unique();
		if (!position || position.shares < shares) {
			throw new Error("Not enough shares to sell");
		}

		const price = side === "Yes" ? market.yesPrice : 1 - market.yesPrice;
		const proceeds = shares * price;
		const costBasis = shares * position.avgPrice;
		const pnl = proceeds - costBasis;

		const balance = user.balance ?? 0;
		await ctx.db.patch(user._id, { balance: balance + proceeds });

		const remaining = position.shares - shares;
		if (remaining <= 1e-9) {
			await ctx.db.delete(position._id);
		} else {
			await ctx.db.patch(position._id, {
				shares: remaining,
				realizedPnl: position.realizedPnl + pnl,
			});
		}

		await ctx.db.insert("trades", {
			userId: user._id,
			marketId,
			side,
			kind: "sell",
			shares,
			price,
			cost: -proceeds,
		});

		const nextYes = priceImpact(
			market.yesPrice,
			side === "Yes" ? "No" : "Yes",
			proceeds
		);
		await ctx.db.patch(marketId, {
			yesPrice: nextYes,
			volume: market.volume + proceeds,
			openInterest: Math.max(0, market.openInterest - proceeds),
		});
		await ctx.db.insert("priceTicks", { marketId, yesPrice: nextYes });

		return { proceeds, pnl, newBalance: balance + proceeds };
	},
});
