import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, requireUser } from "./users";

export const STARTING_BALANCE = 1000;

export const get = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		return user?.balance ?? STARTING_BALANCE;
	},
});

export const topUp = mutation({
	args: { amount: v.number() },
	handler: async (ctx, { amount }) => {
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new Error("Top-up amount must be positive");
		}
		const user = await requireUser(ctx);
		const next = (user.balance ?? 0) + amount;
		await ctx.db.patch(user._id, { balance: next });
		return next;
	},
});

export const reset = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		await ctx.db.patch(user._id, { balance: STARTING_BALANCE });
		return STARTING_BALANCE;
	},
});
