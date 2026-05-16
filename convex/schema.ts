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
	})
		.index("email", ["email"])
		.index("phone", ["phone"]),

	marketProposals: defineTable({
		proposerId: v.id("users"),
		question: v.string(),
		description: v.string(),
		category: v.string(),
		resolutionSource: v.string(),
		tags: v.array(v.string()),
		closesAt: v.string(),
		closesAtMs: v.number(),
		initialYesPrice: v.number(),
		initialLiquidity: v.number(),
		status: v.union(
			v.literal("pending"),
			v.literal("approved"),
			v.literal("rejected")
		),
		rejectionReason: v.optional(v.string()),
		reviewedBy: v.optional(v.id("users")),
		reviewedAt: v.optional(v.number()),
		approvedMarketId: v.optional(v.id("markets")),
	})
		.index("by_status", ["status"])
		.index("by_proposer", ["proposerId"]),

	markets: defineTable({
		slug: v.string(),
		question: v.string(),
		description: v.string(),
		category: v.string(),
		yesPrice: v.number(),
		volume: v.number(),
		liquidity: v.number(),
		openInterest: v.number(),
		closesAt: v.string(),
		closesAtMs: v.number(),
		resolutionSource: v.string(),
		tags: v.array(v.string()),
		status: v.union(
			v.literal("open"),
			v.literal("closed"),
			v.literal("resolved")
		),
		resolution: v.optional(sideUnion),
		createdAt: v.number(),
	})
		.index("by_slug", ["slug"])
		.index("by_category", ["category"])
		.index("by_status", ["status"]),

	positions: defineTable({
		userId: v.id("users"),
		marketId: v.id("markets"),
		side: sideUnion,
		shares: v.number(),
		avgPrice: v.number(),
		realizedPnl: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_market", ["marketId"])
		.index("by_user_market_side", ["userId", "marketId", "side"]),

	trades: defineTable({
		userId: v.id("users"),
		marketId: v.id("markets"),
		side: sideUnion,
		kind: v.union(v.literal("buy"), v.literal("sell")),
		shares: v.number(),
		price: v.number(),
		cost: v.number(),
	})
		.index("by_market", ["marketId"])
		.index("by_user", ["userId"]),

	comments: defineTable({
		userId: v.id("users"),
		marketId: v.id("markets"),
		body: v.string(),
	}).index("by_market", ["marketId"]),

	priceTicks: defineTable({
		marketId: v.id("markets"),
		yesPrice: v.number(),
	}).index("by_market", ["marketId"]),
});
