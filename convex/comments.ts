import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

export const byMarket = query({
	args: { ticketId: v.id("tickets"), limit: v.optional(v.number()) },
	handler: async (ctx, { ticketId, limit = 50 }) => {
		const comments = await ctx.db
			.query("comments")
			.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
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
	args: { ticketId: v.id("tickets"), body: v.string() },
	handler: async (ctx, { ticketId, body }) => {
		const trimmed = body.trim();
		if (!trimmed) throw new Error("Comment cannot be empty");
		if (trimmed.length > 1000) throw new Error("Comment too long");
		const user = await requireUser(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		return await ctx.db.insert("comments", {
			userId: user._id,
			ticketId,
			body: trimmed,
		});
	},
});
