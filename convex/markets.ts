import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
	args: { category: v.optional(v.string()) },
	handler: async (ctx, { category }) => {
		if (category && category !== "All") {
			return await ctx.db
				.query("markets")
				.withIndex("by_category", (q) => q.eq("category", category))
				.collect();
		}
		return await ctx.db.query("markets").collect();
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		return await ctx.db
			.query("markets")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
	},
});

export const trending = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit = 4 }) => {
		const all = await ctx.db.query("markets").collect();
		const open = all.filter((m) => m.status === "open");
		return open.sort((a, b) => b.volume - a.volume).slice(0, limit);
	},
});

export const history = query({
	args: { marketId: v.id("markets"), limit: v.optional(v.number()) },
	handler: async (ctx, { marketId, limit = 100 }) => {
		const ticks = await ctx.db
			.query("priceTicks")
			.withIndex("by_market", (q) => q.eq("marketId", marketId))
			.order("desc")
			.take(limit);
		return ticks.reverse();
	},
});
