import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, requireUser } from "./users";

export const myPendingRefunds = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!user) return [];
		const offers = await ctx.db
			.query("refundOffers")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.filter((q) => q.eq(q.field("status"), "pending"))
			.collect();
		return await Promise.all(
			offers.map(async (o) => {
				const ticket = await ctx.db.get(o.ticketId);
				return {
					_id: o._id,
					tradeId: o.tradeId,
					ticketQuestion: ticket?.question ?? "Unknown ticket",
					ticketSlug: ticket?.slug ?? "",
					side: o.side,
					shares: o.shares,
					cost: o.cost,
				};
			})
		);
	},
});

export const acceptRefund = mutation({
	args: { offerId: v.id("refundOffers") },
	handler: async (ctx, { offerId }) => {
		const user = await requireUser(ctx);
		const offer = await ctx.db.get(offerId);
		if (!offer) throw new Error("Offer not found");
		if (offer.userId !== user._id) throw new Error("Not your offer");
		if (offer.status !== "pending") throw new Error("Offer is no longer pending");

		const trade = await ctx.db.get(offer.tradeId);
		if (!trade) throw new Error("Original trade no longer exists");

		// Refund cash: cost is positive for buy (money spent), so adding it back refunds.
		await ctx.db.patch(user._id, {
			balance: (user.balance ?? 0) + trade.cost,
		});

		// Adjust position
		const position = await ctx.db
			.query("positions")
			.withIndex("by_user_ticket_side", (q) =>
				q
					.eq("userId", user._id)
					.eq("ticketId", offer.ticketId)
					.eq("side", offer.side)
			)
			.unique();

		if (trade.kind === "buy") {
			if (position) {
				const next = Math.max(0, position.shares - trade.shares);
				if (next <= 1e-9) {
					await ctx.db.delete(position._id);
				} else {
					await ctx.db.patch(position._id, { shares: next });
				}
			}
		} else {
			if (position) {
				await ctx.db.patch(position._id, {
					shares: position.shares + trade.shares,
				});
			} else {
				await ctx.db.insert("positions", {
					userId: user._id,
					ticketId: offer.ticketId,
					side: offer.side,
					shares: trade.shares,
					avgPrice: trade.price,
					realizedPnl: 0,
				});
			}
		}

		// Adjust ticket volume and open interest
		const ticket = await ctx.db.get(offer.ticketId);
		if (ticket) {
			const absCost = Math.abs(trade.cost);
			const oiDelta = trade.kind === "buy" ? -absCost : absCost;
			await ctx.db.patch(offer.ticketId, {
				volume: Math.max(0, ticket.volume - absCost),
				openInterest: Math.max(0, ticket.openInterest + oiDelta),
			});
		}

		await ctx.db.delete(offer.tradeId);
		await ctx.db.patch(offerId, { status: "accepted" });
		return { ok: true };
	},
});

export const rejectRefund = mutation({
	args: { offerId: v.id("refundOffers") },
	handler: async (ctx, { offerId }) => {
		const user = await requireUser(ctx);
		const offer = await ctx.db.get(offerId);
		if (!offer) throw new Error("Offer not found");
		if (offer.userId !== user._id) throw new Error("Not your offer");
		if (offer.status !== "pending") throw new Error("Offer is no longer pending");
		await ctx.db.patch(offerId, { status: "rejected" });
		return { ok: true };
	},
});
