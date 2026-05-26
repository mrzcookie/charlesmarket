import { v } from "convex/values";
import { query } from "./_generated/server";

export const top = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit = 25 }) => {
		const users = await ctx.db.query("users").collect();
		const rows = await Promise.all(
			users.map(async (u) => {
				const positions = await ctx.db
					.query("positions")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.collect();
				const trades = await ctx.db
					.query("trades")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.collect();

				let unrealized = 0;
				for (const p of positions) {
					const m = await ctx.db.get(p.ticketId);
					if (!m) continue;
					const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
					unrealized += p.shares * (current - p.avgPrice);
				}
				const realized = positions.reduce((acc, p) => acc + p.realizedPnl, 0);
				const volume = trades.reduce((acc, t) => acc + Math.abs(t.cost), 0);
				const wins = positions.filter((p) => p.realizedPnl > 0).length;
				const total = positions.length || 1;

				return {
					_id: u._id,
					handle: u.handle ?? "@anon",
					name: u.name ?? null,
					image: u.image ?? null,
					pnl: realized + unrealized,
					realizedPnl: realized,
					unrealizedPnl: unrealized,
					volume,
					winRate: wins / total,
					positions: positions.length,
				};
			})
		);

		return rows
			.filter((r) => r.volume > 0 || r.positions > 0)
			.sort((a, b) => b.pnl - a.pnl)
			.slice(0, limit);
	},
});
