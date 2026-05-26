import { mutation, query } from "./_generated/server";
import { currentUser, requireUser } from "./users";

export const STARTING_BALANCE = 2000;
export const DAILY_BONUS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export const get = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		return user?.balance ?? STARTING_BALANCE;
	},
});

/**
 * Idempotent — grants the ₪50 daily stipend if the user hasn't claimed in the
 * past 24h. Safe to call from the client on every app load; it'll no-op when
 * not due.
 */
export const claimDailyIfDue = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await requireUser(ctx);
		const now = Date.now();
		const last = user.lastDailyAt ?? 0;
		if (now - last < DAY_MS) {
			return { granted: false, balance: user.balance ?? 0 };
		}
		const next = (user.balance ?? 0) + DAILY_BONUS;
		await ctx.db.patch(user._id, {
			balance: next,
			lastDailyAt: now,
		});
		return { granted: true, balance: next, amount: DAILY_BONUS };
	},
});
