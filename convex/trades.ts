import { v } from "convex/values";
import { query } from "./_generated/server";
import { currentUser } from "./users";

export const byMarket = query({
	args: { ticketId: v.id("tickets"), limit: v.optional(v.number()) },
	handler: async (ctx, { ticketId, limit = 25 }) => {
		const trades = await ctx.db
			.query("trades")
			.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
			.order("desc")
			.take(limit);
		const userIds = Array.from(new Set(trades.map((t) => t.userId)));
		const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
		const handleById = new Map(
			users
				.filter((u): u is NonNullable<typeof u> => u !== null)
				.map((u) => [u._id, u.handle ?? "@anon"])
		);
		return trades.map((t) => ({
			_id: t._id,
			_creationTime: t._creationTime,
			ticketId: t.ticketId,
			side: t.side,
			kind: t.kind,
			shares: t.shares,
			price: t.price,
			cost: t.cost,
			handle: handleById.get(t.userId) ?? "@unknown",
		}));
	},
});

export const positions = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!user) return [];
		const positions = await ctx.db
			.query("positions")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const tickets = await Promise.all(
			positions.map((p) => ctx.db.get(p.ticketId))
		);
		return positions
			.map((p, i) => {
				const m = tickets[i];
				if (!m) return null;
				const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
				const cost = p.shares * p.avgPrice;
				const value = p.shares * current;
				return {
					_id: p._id,
					ticketId: p.ticketId,
					ticketSlug: m.slug,
					question: m.question,
					side: p.side,
					shares: p.shares,
					avgPrice: p.avgPrice,
					current,
					cost,
					value,
					pnl: value - cost,
					realizedPnl: p.realizedPnl,
				};
			})
			.filter((p): p is NonNullable<typeof p> => p !== null);
	},
});

export const settled = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit = 10 }) => {
		const user = await currentUser(ctx);
		if (!user) return [];
		const trades = await ctx.db
			.query("trades")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.take(limit);
		const tickets = await Promise.all(
			trades.map((t) => ctx.db.get(t.ticketId))
		);
		return trades
			.map((t, i) => {
				const m = tickets[i];
				if (!m || m.status !== "resolved") return null;
				return {
					question: m.question,
					side: t.side,
					result: m.resolution,
					pnl: m.resolution === t.side ? t.shares - t.cost : -t.cost,
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
	},
});
