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
		ticketId: v.id("tickets"),
		side: sideUnion,
		amount: v.number(),
	},
	handler: async (ctx, { ticketId, side, amount }) => {
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new Error("Amount must be positive");
		}
		const user = await requireUser(ctx);
		const balance = user.balance ?? 0;
		if (balance < amount) throw new Error("Insufficient shekels");

		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status !== "open") throw new Error("Ticket is closed");
		if (ticket.subjectUserId === user._id) {
			throw new Error("You can't trade on a ticket about you");
		}
		if (ticket.creatorId === user._id) {
			throw new Error("You can't trade on a ticket you created");
		}

		const price = side === "Yes" ? ticket.yesPrice : 1 - ticket.yesPrice;
		if (price <= 0 || price >= 1) throw new Error("Invalid ticket price");
		const shares = amount / price;

		await ctx.db.patch(user._id, { balance: balance - amount });

		const existing = await ctx.db
			.query("positions")
			.withIndex("by_user_ticket_side", (q) =>
				q.eq("userId", user._id).eq("ticketId", ticketId).eq("side", side)
			)
			.first();

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
				ticketId,
				side,
				shares,
				avgPrice: price,
				realizedPnl: 0,
			});
		}

		await ctx.db.insert("trades", {
			userId: user._id,
			ticketId,
			side,
			kind: "buy",
			shares,
			price,
			cost: amount,
		});

		const nextYes = priceImpact(ticket.yesPrice, side, amount);
		await ctx.db.patch(ticketId, {
			yesPrice: nextYes,
			volume: ticket.volume + amount,
			openInterest: ticket.openInterest + amount,
		});
		await ctx.db.insert("priceTicks", { ticketId, yesPrice: nextYes });

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
		ticketId: v.id("tickets"),
		side: sideUnion,
		shares: v.number(),
	},
	handler: async (ctx, { ticketId, side, shares }) => {
		if (!Number.isFinite(shares) || shares <= 0) {
			throw new Error("Shares must be positive");
		}
		const user = await requireUser(ctx);

		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status !== "open") throw new Error("Ticket is closed");
		if (ticket.subjectUserId === user._id) {
			throw new Error("You can't trade on a ticket about you");
		}
		if (ticket.creatorId === user._id) {
			throw new Error("You can't trade on a ticket you created");
		}

		const position = await ctx.db
			.query("positions")
			.withIndex("by_user_ticket_side", (q) =>
				q.eq("userId", user._id).eq("ticketId", ticketId).eq("side", side)
			)
			.first();
		if (!position || position.shares < shares) {
			throw new Error("Not enough shares to sell");
		}

		const price = side === "Yes" ? ticket.yesPrice : 1 - ticket.yesPrice;
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
			ticketId,
			side,
			kind: "sell",
			shares,
			price,
			cost: -proceeds,
		});

		const nextYes = priceImpact(
			ticket.yesPrice,
			side === "Yes" ? "No" : "Yes",
			proceeds
		);
		await ctx.db.patch(ticketId, {
			yesPrice: nextYes,
			volume: ticket.volume + proceeds,
			openInterest: Math.max(0, ticket.openInterest - proceeds),
		});
		await ctx.db.insert("priceTicks", { ticketId, yesPrice: nextYes });

		return { proceeds, pnl, newBalance: balance + proceeds };
	},
});
