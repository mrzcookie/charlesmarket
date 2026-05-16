import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error("Not signed in");
	const user = await ctx.db.get(userId);
	if (!user) throw new Error("User record missing");
	return user;
}

export async function currentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
	const userId = await getAuthUserId(ctx);
	if (!userId) return null;
	return await ctx.db.get(userId);
}

export function isAdminUser(user: Doc<"users"> | null | undefined): boolean {
	return Boolean(user?.isAdmin);
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
	const user = await requireUser(ctx);
	if (!isAdminUser(user)) throw new Error("Admin only");
	return user;
}

export const me = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		if (!user) return null;
		return {
			_id: user._id,
			email: user.email,
			name: user.name,
			image: user.image,
			handle: user.handle ?? "@anon",
			balance: user.balance ?? 0,
			joinedAt: user.joinedAt,
			isAdmin: isAdminUser(user),
		};
	},
});

export const amIAdmin = query({
	args: {},
	handler: async (ctx) => {
		const user = await currentUser(ctx);
		return isAdminUser(user);
	},
});

export const updateHandle = mutation({
	args: { handle: v.string() },
	handler: async (ctx, { handle }) => {
		const user = await requireUser(ctx);
		const trimmed = handle.trim();
		if (!trimmed) throw new Error("Handle cannot be empty");
		const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
		if (normalized.length > 32) throw new Error("Handle is too long");
		await ctx.db.patch(user._id, { handle: normalized });
		return normalized;
	},
});

function normalizeHandleParam(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * Public profile + stats for a given handle. Returns null if no such user.
 * Same shape as the leaderboard row so consumers can reuse rendering.
 */
export const publicProfile = query({
	args: { handle: v.string() },
	handler: async (ctx, { handle }) => {
		const normalized = normalizeHandleParam(handle);
		const user = await ctx.db
			.query("users")
			.withIndex("by_handle", (q) => q.eq("handle", normalized))
			.unique();
		if (!user) return null;

		const positions = await ctx.db
			.query("positions")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const trades = await ctx.db
			.query("trades")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		let unrealized = 0;
		for (const p of positions) {
			const m = await ctx.db.get(p.marketId);
			if (!m) continue;
			const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
			unrealized += p.shares * (current - p.avgPrice);
		}
		const realized = positions.reduce((acc, p) => acc + p.realizedPnl, 0);
		const volume = trades.reduce((acc, t) => acc + Math.abs(t.cost), 0);
		const wins = positions.filter((p) => p.realizedPnl > 0).length;
		const denom = positions.length || 1;

		return {
			_id: user._id,
			handle: user.handle ?? "@anon",
			image: user.image ?? null,
			joinedAt: user.joinedAt ?? user._creationTime,
			isAdmin: isAdminUser(user),
			pnl: realized + unrealized,
			realizedPnl: realized,
			unrealizedPnl: unrealized,
			volume,
			winRate: wins / denom,
			positionsCount: positions.length,
			tradesCount: trades.length,
		};
	},
});

/**
 * Open positions for a given handle, sorted by current value desc.
 */
export const publicPositions = query({
	args: { handle: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { handle, limit = 25 }) => {
		const normalized = normalizeHandleParam(handle);
		const user = await ctx.db
			.query("users")
			.withIndex("by_handle", (q) => q.eq("handle", normalized))
			.unique();
		if (!user) return [];

		const positions = await ctx.db
			.query("positions")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const markets = await Promise.all(
			positions.map((p) => ctx.db.get(p.marketId))
		);

		return positions
			.map((p, i) => {
				const m = markets[i];
				if (!m) return null;
				const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
				const cost = p.shares * p.avgPrice;
				const value = p.shares * current;
				return {
					_id: p._id,
					marketId: p.marketId,
					marketSlug: m.slug,
					question: m.question,
					side: p.side,
					shares: p.shares,
					avgPrice: p.avgPrice,
					current,
					cost,
					value,
					pnl: value - cost,
					marketStatus: m.status,
				};
			})
			.filter((p): p is NonNullable<typeof p> => p !== null)
			.sort((a, b) => b.value - a.value)
			.slice(0, limit);
	},
});

/**
 * Recent trades for a given handle, newest first.
 */
export const publicTrades = query({
	args: { handle: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { handle, limit = 20 }) => {
		const normalized = normalizeHandleParam(handle);
		const user = await ctx.db
			.query("users")
			.withIndex("by_handle", (q) => q.eq("handle", normalized))
			.unique();
		if (!user) return [];

		const trades = await ctx.db
			.query("trades")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.take(limit);

		const marketIds = Array.from(new Set(trades.map((t) => t.marketId)));
		const markets = await Promise.all(marketIds.map((id) => ctx.db.get(id)));
		const metaById = new Map(
			markets
				.filter((m): m is NonNullable<typeof m> => m !== null)
				.map((m) => [m._id, { question: m.question, slug: m.slug }])
		);

		return trades.map((t) => {
			const meta = metaById.get(t.marketId);
			return {
				_id: t._id,
				_creationTime: t._creationTime,
				marketId: t.marketId,
				marketSlug: meta?.slug ?? "",
				question: meta?.question ?? "Unknown market",
				side: t.side,
				kind: t.kind,
				shares: t.shares,
				price: t.price,
				cost: t.cost,
			};
		});
	},
});
