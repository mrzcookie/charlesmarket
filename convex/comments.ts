import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

export const byMarket = query({
	args: { marketId: v.id("markets"), limit: v.optional(v.number()) },
	handler: async (ctx, { marketId, limit = 50 }) => {
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_market", (q) => q.eq("marketId", marketId))
			.order("desc")
			.take(limit);
		const userIds = Array.from(new Set(comments.map((c) => c.userId)));
		const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
		const handleById = new Map(
			users
				.filter((u): u is NonNullable<typeof u> => u !== null)
				.map((u) => [u._id, u.handle ?? "@anon"])
		);
		return comments.map((c) => ({
			_id: c._id,
			_creationTime: c._creationTime,
			body: c.body,
			handle: handleById.get(c.userId) ?? "@unknown",
		}));
	},
});

export const add = mutation({
	args: { marketId: v.id("markets"), body: v.string() },
	handler: async (ctx, { marketId, body }) => {
		const trimmed = body.trim();
		if (!trimmed) throw new Error("Comment cannot be empty");
		if (trimmed.length > 1000) throw new Error("Comment too long");
		const user = await requireUser(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		return await ctx.db.insert("comments", {
			userId: user._id,
			marketId,
			body: trimmed,
		});
	},
});
