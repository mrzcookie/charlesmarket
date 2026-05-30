import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const sideUnion = v.union(v.literal("Yes"), v.literal("No"));

export default defineSchema({
	...authTables,

	users: defineTable({
		...authTables.users.validator.fields,
		handle: v.optional(v.string()),
		balance: v.optional(v.number()),
		joinedAt: v.optional(v.number()),
		isAdmin: v.optional(v.boolean()),
		lastDailyAt: v.optional(v.number()),
		lastTicketRewardAt: v.optional(v.number()),
		compensationV1: v.optional(v.boolean()),
	})
		.index("email", ["email"])
		.index("phone", ["phone"])
		.index("by_handle", ["handle"]),

	tickets: defineTable({
		slug: v.string(),
		question: v.string(),
		description: v.string(),
		yesPrice: v.number(),
		volume: v.number(),
		liquidity: v.number(),
		openInterest: v.number(),
		closesAt: v.string(),
		closesAtMs: v.number(),
		tags: v.array(v.string()),
		status: v.union(
			v.literal("open"),
			v.literal("closed"),
			v.literal("resolved"),
			v.literal("cancelled")
		),
		resolution: v.optional(sideUnion),
		createdAt: v.number(),
		// Subject is either a linked user (subjectUserId) OR a free-text name
		// (subjectName). Exactly one is set; enforced at mutation time.
		subjectUserId: v.optional(v.id("users")),
		subjectName: v.optional(v.string()),
		creatorId: v.id("users"),
	})
		.index("by_slug", ["slug"])
		.index("by_status", ["status"])
		.index("by_subject", ["subjectUserId"])
		.index("by_creator", ["creatorId"]),

	positions: defineTable({
		userId: v.id("users"),
		ticketId: v.id("tickets"),
		side: sideUnion,
		shares: v.number(),
		avgPrice: v.number(),
		realizedPnl: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_ticket", ["ticketId"])
		.index("by_user_ticket_side", ["userId", "ticketId", "side"]),

	trades: defineTable({
		userId: v.id("users"),
		ticketId: v.id("tickets"),
		side: sideUnion,
		kind: v.union(v.literal("buy"), v.literal("sell")),
		shares: v.number(),
		price: v.number(),
		cost: v.number(),
	})
		.index("by_ticket", ["ticketId"])
		.index("by_user", ["userId"]),

	comments: defineTable({
		userId: v.id("users"),
		ticketId: v.id("tickets"),
		body: v.string(),
	}).index("by_ticket", ["ticketId"]),

	priceTicks: defineTable({
		ticketId: v.id("tickets"),
		yesPrice: v.number(),
	}).index("by_ticket", ["ticketId"]),

	refundOffers: defineTable({
		tradeId: v.id("trades"),
		userId: v.id("users"),
		ticketId: v.id("tickets"),
		offeredBy: v.id("users"),
		side: sideUnion,
		shares: v.number(),
		cost: v.number(),
		status: v.union(
			v.literal("pending"),
			v.literal("accepted"),
			v.literal("rejected"),
			v.literal("cancelled")
		),
	})
		.index("by_user", ["userId"])
		.index("by_trade", ["tradeId"])
		.index("by_status", ["status"]),

	ticketReports: defineTable({
		ticketId: v.id("tickets"),
		reporterId: v.id("users"),
		description: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("validated"),
			v.literal("rejected")
		),
		reviewedBy: v.optional(v.id("users")),
		reviewedAt: v.optional(v.number()),
	})
		.index("by_ticket", ["ticketId"])
		.index("by_reporter", ["reporterId"])
		.index("by_status", ["status"]),
});
