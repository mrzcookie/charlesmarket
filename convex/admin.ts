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

const CATEGORIES = [
	"Antics",
	"Mishaps",
	"Relationships",
	"Career",
	"Health",
	"Travel",
	"Money",
] as const;

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return base || `market-${Math.random().toString(36).slice(2, 8)}`;
}

async function uniqueSlug(
	ctx: QueryCtx,
	desired: string,
	exceptId?: Id<"markets">
): Promise<string> {
	let candidate = desired;
	let i = 2;
	while (true) {
		const hit = await ctx.db
			.query("markets")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique();
		if (!hit || hit._id === exceptId) return candidate;
		candidate = `${desired}-${i}`;
		i += 1;
	}
}

export const listAll = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!isAdminUser(user)) return [];
		return await ctx.db.query("markets").order("desc").take(500);
	},
});

export const createMarket = mutation({
	args: {
		question: v.string(),
		description: v.string(),
		category: v.string(),
		tags: v.array(v.string()),
		closesAt: v.string(),
		closesAtMs: v.number(),
		initialYesPrice: v.number(),
		initialLiquidity: v.number(),
		slugOverride: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const question = args.question.trim();
		const description = args.description.trim();
		const closesAt = args.closesAt.trim();
		if (question.length < 6 || !/\?$/.test(question)) {
			throw new Error("Question must end with '?'");
		}
		if (description.length > 1_000) {
			throw new Error("Description must be 1,000 characters or fewer");
		}
		if (!CATEGORIES.includes(args.category as (typeof CATEGORIES)[number])) {
			throw new Error("Invalid category");
		}
		if (!Number.isFinite(args.closesAtMs) || args.closesAtMs < Date.now()) {
			throw new Error("Closing time must be in the future");
		}
		if (
			!Number.isFinite(args.initialYesPrice) ||
			args.initialYesPrice <= 0.01 ||
			args.initialYesPrice >= 0.99
		) {
			throw new Error("Initial Yes price must be between 0.01 and 0.99");
		}
		if (
			!Number.isFinite(args.initialLiquidity) ||
			args.initialLiquidity < 100
		) {
			throw new Error("Initial liquidity must be at least 100");
		}

		const tags = args.tags
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean)
			.slice(0, 8);
		const desired = slugify(args.slugOverride ?? question);
		const slug = await uniqueSlug(ctx, desired);
		const now = Date.now();

		const marketId = await ctx.db.insert("markets", {
			slug,
			question,
			description,
			category: args.category,
			yesPrice: args.initialYesPrice,
			volume: 0,
			liquidity: args.initialLiquidity,
			openInterest: 0,
			closesAt,
			closesAtMs: args.closesAtMs,
			tags,
			status: "open",
			createdAt: now,
		});
		await ctx.db.insert("priceTicks", {
			marketId,
			yesPrice: args.initialYesPrice,
		});
		return { marketId, slug };
	},
});

export const updateMarket = mutation({
	args: {
		marketId: v.id("markets"),
		question: v.optional(v.string()),
		description: v.optional(v.string()),
		category: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		closesAt: v.optional(v.string()),
		closesAtMs: v.optional(v.number()),
		slug: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const market = await ctx.db.get(args.marketId);
		if (!market) throw new Error("Market not found");
		const patch: Partial<Doc<"markets">> = {};
		if (args.question !== undefined) {
			const q = args.question.trim();
			if (q.length < 6) throw new Error("Question too short");
			patch.question = q;
		}
		if (args.description !== undefined) {
			patch.description = args.description.trim();
		}
		if (args.category !== undefined) {
			if (!CATEGORIES.includes(args.category as (typeof CATEGORIES)[number])) {
				throw new Error("Invalid category");
			}
			patch.category = args.category;
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
			patch.slug = await uniqueSlug(ctx, slugify(args.slug), args.marketId);
		}
		await ctx.db.patch(args.marketId, patch);
		return { ok: true };
	},
});

export const closeMarket = mutation({
	args: { marketId: v.id("markets") },
	handler: async (ctx, { marketId }) => {
		await requireAdmin(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		if (market.status === "resolved") {
			throw new Error("Already resolved");
		}
		await ctx.db.patch(marketId, { status: "closed" });
		return { ok: true };
	},
});

export const reopenMarket = mutation({
	args: { marketId: v.id("markets") },
	handler: async (ctx, { marketId }) => {
		await requireAdmin(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		if (market.status === "resolved") {
			throw new Error("Already resolved");
		}
		await ctx.db.patch(marketId, { status: "open" });
		return { ok: true };
	},
});

async function settlePositions(
	ctx: MutationCtx,
	marketId: Id<"markets">,
	resolution: "Yes" | "No"
) {
	const positions = await ctx.db
		.query("positions")
		.withIndex("by_market", (q) => q.eq("marketId", marketId))
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
			marketId,
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

export const resolveMarket = mutation({
	args: {
		marketId: v.id("markets"),
		resolution: sideUnion,
	},
	handler: async (ctx, { marketId, resolution }) => {
		await requireAdmin(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");
		if (market.status === "resolved") {
			throw new Error("Already resolved");
		}

		await settlePositions(ctx, marketId, resolution);

		const finalYes = resolution === "Yes" ? 1 : 0;
		await ctx.db.patch(marketId, {
			status: "resolved",
			resolution,
			yesPrice: finalYes,
			openInterest: 0,
		});
		await ctx.db.insert("priceTicks", { marketId, yesPrice: finalYes });
		return { ok: true };
	},
});

export const deleteMarket = mutation({
	args: { marketId: v.id("markets") },
	handler: async (ctx, { marketId }) => {
		await requireAdmin(ctx);
		const market = await ctx.db.get(marketId);
		if (!market) throw new Error("Market not found");

		const childTables = [
			"trades",
			"positions",
			"comments",
			"priceTicks",
		] as const;
		for (const table of childTables) {
			const rows = await ctx.db
				.query(table)
				.withIndex("by_market", (q) => q.eq("marketId", marketId))
				.collect();
			for (const r of rows) {
				await ctx.db.delete(r._id);
			}
		}

		const proposals = await ctx.db
			.query("marketProposals")
			.withIndex("by_status", (q) => q.eq("status", "approved"))
			.collect();
		for (const p of proposals) {
			if (p.approvedMarketId === marketId) {
				await ctx.db.patch(p._id, { approvedMarketId: undefined });
			}
		}

		await ctx.db.delete(marketId);
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
				const market = await ctx.db.get(t.marketId);
				return {
					_id: t._id,
					_creationTime: t._creationTime,
					side: t.side,
					kind: t.kind,
					shares: t.shares,
					price: t.price,
					cost: t.cost,
					marketQuestion: market?.question ?? "Deleted market",
					marketSlug: market?.slug ?? "",
				};
			})
		);
	},
});
