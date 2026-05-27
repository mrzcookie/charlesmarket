import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { currentUser, isAdminUser, requireAdmin } from "./users";

const sideUnion = v.union(v.literal("Yes"), v.literal("No"));

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return base || `ticket-${Math.random().toString(36).slice(2, 8)}`;
}

async function uniqueSlug(
	ctx: QueryCtx,
	desired: string,
	exceptId?: Id<"tickets">
): Promise<string> {
	let candidate = desired;
	let i = 2;
	while (true) {
		const hit = await ctx.db
			.query("tickets")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique();
		if (!hit || hit._id === exceptId) return candidate;
		candidate = `${desired}-${i}`;
		i += 1;
	}
}

async function userMini(ctx: QueryCtx, userId: Id<"users">) {
	const u = await ctx.db.get(userId);
	if (!u) return null;
	return {
		_id: u._id,
		handle: u.handle ?? "@anon",
		name: u.name ?? null,
		image: u.image ?? null,
	};
}

type AdminSubject = {
	name: string;
	_id?: Id<"users">;
	handle?: string;
	image?: string | null;
};

async function subjectRef(
	ctx: QueryCtx,
	ticket: Doc<"tickets">
): Promise<AdminSubject | null> {
	if (ticket.subjectUserId) {
		const u = await userMini(ctx, ticket.subjectUserId);
		if (!u) return null;
		return {
			_id: u._id,
			handle: u.handle,
			name: u.name ?? u.handle,
			image: u.image,
		};
	}
	if (ticket.subjectName) return { name: ticket.subjectName };
	return null;
}

export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return [];
		const tickets = await ctx.db.query("tickets").order("desc").take(500);
		return await Promise.all(
			tickets.map(async (m) => ({
				...m,
				subject: await subjectRef(ctx, m),
				creator: await userMini(ctx, m.creatorId),
			}))
		);
	},
});

export const updateTicket = mutation({
	args: {
		ticketId: v.id("tickets"),
		question: v.optional(v.string()),
		description: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		closesAt: v.optional(v.string()),
		closesAtMs: v.optional(v.number()),
		slug: v.optional(v.string()),
		subjectUserId: v.optional(v.id("users")),
		subjectName: v.optional(v.string()),
		creatorId: v.optional(v.id("users")),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(args.ticketId);
		if (!ticket) throw new Error("Ticket not found");
		const patch: Partial<Doc<"tickets">> = {};
		if (args.question !== undefined) {
			const q = args.question.trim();
			if (q.length < 6) throw new Error("Question too short");
			patch.question = q;
		}
		if (args.description !== undefined) {
			patch.description = args.description.trim();
		}
		if (args.tags !== undefined) {
			patch.tags = args.tags
				.map((t) => t.trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 8);
		}
		if (args.closesAt !== undefined) patch.closesAt = args.closesAt.trim();
		if (args.closesAtMs !== undefined) patch.closesAtMs = args.closesAtMs;
		if (args.slug !== undefined) {
			patch.slug = await uniqueSlug(ctx, slugify(args.slug), args.ticketId);
		}
		if (args.subjectUserId !== undefined) {
			const subject = await ctx.db.get(args.subjectUserId);
			if (!subject) throw new Error("Subject user not found");
			patch.subjectUserId = args.subjectUserId;
			patch.subjectName = undefined;
		} else if (args.subjectName !== undefined) {
			const trimmed = args.subjectName.trim();
			if (!trimmed) throw new Error("Subject name cannot be empty");
			if (trimmed.length > 60) throw new Error("Subject name too long");
			patch.subjectName = trimmed;
			patch.subjectUserId = undefined;
		}
		if (args.creatorId !== undefined) {
			const creator = await ctx.db.get(args.creatorId);
			if (!creator) throw new Error("Creator user not found");
			patch.creatorId = args.creatorId;
		}
		await ctx.db.patch(args.ticketId, patch);
		return { ok: true };
	},
});

export const closeTicket = mutation({
	args: { ticketId: v.id("tickets") },
	handler: async (ctx, { ticketId }) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status === "resolved") throw new Error("Already resolved");
		if (ticket.status === "cancelled") throw new Error("Already cancelled");
		await ctx.db.patch(ticketId, { status: "closed" });
		return { ok: true };
	},
});

export const reopenTicket = mutation({
	args: { ticketId: v.id("tickets") },
	handler: async (ctx, { ticketId }) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status === "resolved") throw new Error("Already resolved");
		if (ticket.status === "cancelled") throw new Error("Already cancelled");
		await ctx.db.patch(ticketId, { status: "open" });
		return { ok: true };
	},
});

export const cancelTicket = mutation({
	args: { ticketId: v.id("tickets") },
	handler: async (ctx, { ticketId }) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status === "resolved") throw new Error("Already resolved");
		if (ticket.status === "cancelled") throw new Error("Already cancelled");

		await cancelTicketPositions(ctx, ticketId);
		await ctx.db.patch(ticketId, { status: "cancelled", openInterest: 0 });
		return { ok: true };
	},
});

export async function cancelTicketPositions(
	ctx: MutationCtx,
	ticketId: Id<"tickets">
) {
	const positions = await ctx.db
		.query("positions")
		.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
		.collect();

	for (const p of positions) {
		if (p.shares <= 0) continue;
		const refund = p.shares * p.avgPrice;
		const user = await ctx.db.get(p.userId);
		if (user) {
			await ctx.db.patch(p.userId, {
				balance: (user.balance ?? 0) + refund,
			});
		}
		await ctx.db.insert("trades", {
			userId: p.userId,
			ticketId,
			side: p.side,
			kind: "sell",
			shares: p.shares,
			price: p.avgPrice,
			cost: -refund,
		});
		await ctx.db.patch(p._id, { shares: 0 });
	}
}

async function settlePositions(
	ctx: MutationCtx,
	ticketId: Id<"tickets">,
	resolution: "Yes" | "No"
) {
	const positions = await ctx.db
		.query("positions")
		.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
		.collect();

	for (const p of positions) {
		const won = p.side === resolution;
		const payout = won ? p.shares : 0;
		const costBasis = p.shares * p.avgPrice;
		const pnl = payout - costBasis;
		const user = await ctx.db.get(p.userId);
		if (user) {
			await ctx.db.patch(p.userId, {
				balance: (user.balance ?? 0) + payout,
			});
		}
		await ctx.db.insert("trades", {
			userId: p.userId,
			ticketId,
			side: p.side,
			kind: "sell",
			shares: p.shares,
			price: won ? 1 : 0,
			cost: -payout,
		});
		await ctx.db.patch(p._id, {
			shares: 0,
			realizedPnl: p.realizedPnl + pnl,
		});
	}
}

export const resolveTicket = mutation({
	args: {
		ticketId: v.id("tickets"),
		resolution: sideUnion,
	},
	handler: async (ctx, { ticketId, resolution }) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");
		if (ticket.status === "resolved") throw new Error("Already resolved");
		if (ticket.status === "cancelled") throw new Error("Already cancelled");

		await settlePositions(ctx, ticketId, resolution);

		const finalYes = resolution === "Yes" ? 1 : 0;
		await ctx.db.patch(ticketId, {
			status: "resolved",
			resolution,
			yesPrice: finalYes,
			openInterest: 0,
		});
		await ctx.db.insert("priceTicks", { ticketId, yesPrice: finalYes });
		return { ok: true };
	},
});

export const deleteTicket = mutation({
	args: { ticketId: v.id("tickets") },
	handler: async (ctx, { ticketId }) => {
		await requireAdmin(ctx);
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new Error("Ticket not found");

		const childTables = [
			"trades",
			"positions",
			"comments",
			"priceTicks",
		] as const;
		for (const table of childTables) {
			const rows = await ctx.db
				.query(table)
				.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
				.collect();
			for (const r of rows) {
				await ctx.db.delete(r._id);
			}
		}

		await ctx.db.delete(ticketId);
		return { ok: true };
	},
});

export const grantAdmin = mutation({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		await requireAdmin(ctx);
		const target = await ctx.db
			.query("users")
			.withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
			.unique();
		if (!target) throw new Error("User not found");
		await ctx.db.patch(target._id, { isAdmin: true });
		return { ok: true };
	},
});

// Bootstrap the very first admin. Refuses to run once any admin exists, so it
// can't be used to backdoor in later. Run via `npx convex run admin:bootstrapAdmin '{"email":"..."}'`.
export const bootstrapAdmin = mutation({
	args: { email: v.string() },
	handler: async (ctx, { email }) => {
		const users = await ctx.db.query("users").collect();
		const existing = users.find((u) => u.isAdmin);
		if (existing) {
			throw new Error(
				"An admin already exists. Use grantAdmin from the admin console."
			);
		}
		const target = users.find(
			(u) => (u.email ?? "").toLowerCase() === email.trim().toLowerCase()
		);
		if (!target) {
			throw new Error(
				`No user with email ${email}. Sign in once first, then re-run.`
			);
		}
		await ctx.db.patch(target._id, { isAdmin: true });
		return { ok: true, userId: target._id };
	},
});

export const revokeAdmin = mutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const me = await requireAdmin(ctx);
		if (me._id === userId) throw new Error("Can't revoke yourself");
		const target = await ctx.db.get(userId);
		if (!target) throw new Error("User not found");
		await ctx.db.patch(userId, { isAdmin: false });
		return { ok: true };
	},
});

export const listUsers = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const users = await ctx.db.query("users").collect();
		return users.map((u) => ({
			_id: u._id,
			_creationTime: u._creationTime,
			email: u.email ?? null,
			handle: u.handle ?? "@anon",
			name: u.name ?? null,
			balance: u.balance ?? 0,
			joinedAt: u.joinedAt ?? null,
			isAdmin: Boolean(u.isAdmin),
		}));
	},
});

export const adminUpdateUser = mutation({
	args: {
		userId: v.id("users"),
		handle: v.optional(v.string()),
		name: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const user = await ctx.db.get(args.userId);
		if (!user) throw new Error("User not found");
		const patch: Partial<Doc<"users">> = {};
		if (args.handle !== undefined) {
			const h = args.handle.trim();
			const normalized = h.startsWith("@") ? h : `@${h}`;
			if (normalized.length > 32) throw new Error("Handle too long");
			patch.handle = normalized;
		}
		if (args.name !== undefined) {
			const n = args.name.trim();
			if (!n) throw new Error("Name cannot be empty");
			if (n.length > 60) throw new Error("Name too long");
			patch.name = n;
		}
		await ctx.db.patch(args.userId, patch);
		return { ok: true };
	},
});

export const deleteUser = mutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const me = await requireAdmin(ctx);
		if (me._id === userId) throw new Error("Cannot delete yourself");
		const user = await ctx.db.get(userId);
		if (!user) throw new Error("User not found");
		await ctx.db.delete(userId);
		return { ok: true };
	},
});

export const userTrades = query({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		await requireAdmin(ctx);
		const trades = await ctx.db
			.query("trades")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.take(50);
		return await Promise.all(
			trades.map(async (t) => {
				const ticket = await ctx.db.get(t.ticketId);
				const pendingOffer = await ctx.db
					.query("refundOffers")
					.withIndex("by_trade", (q) => q.eq("tradeId", t._id))
					.filter((q) => q.eq(q.field("status"), "pending"))
					.first();
				return {
					_id: t._id,
					_creationTime: t._creationTime,
					side: t.side,
					kind: t.kind,
					shares: t.shares,
					price: t.price,
					cost: t.cost,
					ticketQuestion: ticket?.question ?? "Deleted ticket",
					ticketSlug: ticket?.slug ?? "",
					pendingOfferId: pendingOffer?._id ?? null,
				};
			})
		);
	},
});

export const offerRefund = mutation({
	args: { tradeId: v.id("trades") },
	handler: async (ctx, { tradeId }) => {
		const admin = await requireAdmin(ctx);
		const trade = await ctx.db.get(tradeId);
		if (!trade) throw new Error("Trade not found");
		const existing = await ctx.db
			.query("refundOffers")
			.withIndex("by_trade", (q) => q.eq("tradeId", tradeId))
			.filter((q) => q.eq(q.field("status"), "pending"))
			.first();
		if (existing) throw new Error("A refund offer is already pending for this trade");
		await ctx.db.insert("refundOffers", {
			tradeId,
			userId: trade.userId,
			ticketId: trade.ticketId,
			offeredBy: admin._id,
			side: trade.side,
			shares: trade.shares,
			cost: trade.cost,
			status: "pending",
		});
		return { ok: true };
	},
});

export const cancelRefundOffer = mutation({
	args: { offerId: v.id("refundOffers") },
	handler: async (ctx, { offerId }) => {
		await requireAdmin(ctx);
		const offer = await ctx.db.get(offerId);
		if (!offer) throw new Error("Offer not found");
		if (offer.status !== "pending") throw new Error("Offer is no longer pending");
		await ctx.db.patch(offerId, { status: "cancelled" });
		return { ok: true };
	},
});

export const ticketTrades = query({
	args: { ticketId: v.id("tickets"), limit: v.optional(v.number()) },
	handler: async (ctx, { ticketId, limit = 200 }) => {
		await requireAdmin(ctx);
		const trades = await ctx.db
			.query("trades")
			.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
			.order("desc")
			.take(limit);

		const userIds = Array.from(new Set(trades.map((t) => t.userId)));
		const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
		const userMap = new Map(
			users
				.filter((u): u is NonNullable<typeof u> => u !== null)
				.map((u) => [
					u._id,
					{
						handle: u.handle ?? "@anon",
						name: u.name ?? null,
						image: u.image ?? null,
					},
				])
		);

		return trades.map((t) => ({
			_id: t._id,
			_creationTime: t._creationTime,
			userId: t.userId,
			user: userMap.get(t.userId) ?? null,
			side: t.side,
			kind: t.kind,
			shares: t.shares,
			price: t.price,
			cost: t.cost,
		}));
	},
});

/**
 * Reverse a single trade: refund the cost to the user, adjust their position
 * (or recreate it for a sell-refund), and decrement the ticket's volume. Does
 * NOT revert the ticket price or priceTicks — those reflect history. Position
 * avgPrice is left as-is (recomputing across blended trades is brittle).
 */
export const refundTrade = mutation({
	args: { tradeId: v.id("trades") },
	handler: async (ctx, { tradeId }) => {
		await requireAdmin(ctx);
		const trade = await ctx.db.get(tradeId);
		if (!trade) throw new Error("Trade not found");

		const user = await ctx.db.get(trade.userId);
		const ticket = await ctx.db.get(trade.ticketId);
		if (!ticket) throw new Error("Ticket not found");

		// Refund cash. Buy cost is positive (paid out); sell cost is negative
		// (proceeds received). Reversing means undoing both.
		if (user) {
			const next = Math.max(0, (user.balance ?? 0) + trade.cost);
			await ctx.db.patch(user._id, { balance: next });
		}

		// Adjust position. Buy refund removes shares; sell refund adds them back.
		const position = await ctx.db
			.query("positions")
			.withIndex("by_user_ticket_side", (q) =>
				q
					.eq("userId", trade.userId)
					.eq("ticketId", trade.ticketId)
					.eq("side", trade.side)
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
			// sell refund — add shares back
			if (position) {
				await ctx.db.patch(position._id, {
					shares: position.shares + trade.shares,
				});
			} else {
				await ctx.db.insert("positions", {
					userId: trade.userId,
					ticketId: trade.ticketId,
					side: trade.side,
					shares: trade.shares,
					avgPrice: trade.price,
					realizedPnl: 0,
				});
			}
		}

		// Adjust ticket aggregates. Volume and openInterest move proportionally.
		const absCost = Math.abs(trade.cost);
		const nextVolume = Math.max(0, ticket.volume - absCost);
		const oiDelta = trade.kind === "buy" ? -absCost : absCost;
		const nextOpenInterest = Math.max(0, ticket.openInterest + oiDelta);
		await ctx.db.patch(ticket._id, {
			volume: nextVolume,
			openInterest: nextOpenInterest,
		});

		await ctx.db.delete(tradeId);
		return { ok: true };
	},
});

type UserFeedEvent =
	| {
			kind: "trade";
			_id: string;
			ts: number;
			ticketSlug: string;
			question: string;
			side: "Yes" | "No";
			action: "buy" | "sell";
			shares: number;
			price: number;
			cost: number;
	  }
	| {
			kind: "comment";
			_id: string;
			ts: number;
			ticketSlug: string;
			question: string;
			body: string;
	  }
	| {
			kind: "ticket";
			_id: string;
			ts: number;
			ticketSlug: string;
			question: string;
			role: "subject" | "creator";
			status: "open" | "closed" | "resolved" | "cancelled";
	  };

/**
 * Per-user merged activity: trades + comments + proposals submitted.
 * Same shape style as activity.feed but scoped to one userId.
 */
export const userActivity = query({
	args: { userId: v.id("users"), limit: v.optional(v.number()) },
	handler: async (ctx, { userId, limit = 50 }) => {
		await requireAdmin(ctx);
		const events: UserFeedEvent[] = [];

		const seenMarkets = new Map<string, { slug: string; question: string }>();
		const resolveTicket = async (ticketId: Id<"tickets">) => {
			const cached = seenMarkets.get(ticketId);
			if (cached) return cached;
			const m = await ctx.db.get(ticketId);
			const data = {
				slug: m?.slug ?? "unknown",
				question: m?.question ?? "Deleted ticket",
			};
			seenMarkets.set(ticketId, data);
			return data;
		};

		const trades = await ctx.db
			.query("trades")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.take(limit);
		for (const t of trades) {
			const m = await resolveTicket(t.ticketId);
			events.push({
				kind: "trade",
				_id: t._id,
				ts: t._creationTime,
				ticketSlug: m.slug,
				question: m.question,
				side: t.side,
				action: t.kind,
				shares: t.shares,
				price: t.price,
				cost: t.cost,
			});
		}

		const comments = await ctx.db.query("comments").order("desc").take(500);
		for (const c of comments) {
			if (c.userId !== userId) continue;
			const m = await resolveTicket(c.ticketId);
			events.push({
				kind: "comment",
				_id: c._id,
				ts: c._creationTime,
				ticketSlug: m.slug,
				question: m.question,
				body: c.body,
			});
		}

		const subjectTickets = await ctx.db
			.query("tickets")
			.withIndex("by_subject", (q) => q.eq("subjectUserId", userId))
			.order("desc")
			.take(limit);
		const creatorTickets = await ctx.db
			.query("tickets")
			.withIndex("by_creator", (q) => q.eq("creatorId", userId))
			.order("desc")
			.take(limit);
		for (const m of [...subjectTickets, ...creatorTickets]) {
			events.push({
				kind: "ticket",
				_id: m._id,
				ts: m._creationTime,
				ticketSlug: m.slug,
				question: m.question,
				role: m.subjectUserId === userId ? "subject" : "creator",
				status: m.status,
			});
		}

		events.sort((a, b) => b.ts - a.ts);
		return events.slice(0, limit);
	},
});

/**
 * Adjust a user's cash balance. Set absolute via `setTo`, or add/remove via
 * `delta`. Either field must be provided.
 */
export const adjustBalance = mutation({
	args: {
		userId: v.id("users"),
		setTo: v.optional(v.number()),
		delta: v.optional(v.number()),
	},
	handler: async (ctx, { userId, setTo, delta }) => {
		await requireAdmin(ctx);
		const user = await ctx.db.get(userId);
		if (!user) throw new Error("User not found");
		let next: number;
		if (typeof setTo === "number") {
			if (setTo < 0) throw new Error("Balance cannot be negative");
			next = Math.round(setTo);
		} else if (typeof delta === "number") {
			next = Math.max(0, Math.round((user.balance ?? 0) + delta));
		} else {
			throw new Error("Provide setTo or delta");
		}
		await ctx.db.patch(userId, { balance: next });
		return next;
	},
});

/**
 * One-shot: credit ₪100 to every user as compensation for the daily-bonus bug.
 * Run once via: npx convex run admin:grantCompensation
 * Safe to re-run — skips users who already have compensationV1 set.
 */
export const grantCompensation = mutation({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users").collect();
		let credited = 0;
		for (const user of users) {
			if (user.compensationV1) continue;
			await ctx.db.patch(user._id, {
				balance: (user.balance ?? 0) + 100,
				compensationV1: true,
			});
			credited += 1;
		}
		return { credited, total: users.length };
	},
});
