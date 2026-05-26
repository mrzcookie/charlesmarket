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

export const updateDisplayName = mutation({
	args: { name: v.string() },
	handler: async (ctx, { name }) => {
		const user = await requireUser(ctx);
		const trimmed = name.trim();
		if (!trimmed) throw new Error("Display name cannot be empty");
		if (trimmed.length > 60) throw new Error("Display name is too long");
		await ctx.db.patch(user._id, { name: trimmed });
		return trimmed;
	},
});

export const search = query({
	args: { q: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { q, limit = 10 }) => {
		const needle = q.trim().toLowerCase().replace(/^@/, "");
		if (!needle) return [];
		const users = await ctx.db.query("users").take(500);
		const scored = users
			.map((u) => {
				const handle = (u.handle ?? "").toLowerCase().replace(/^@/, "");
				const name = (u.name ?? "").toLowerCase();
				if (!handle.includes(needle) && !name.includes(needle)) return null;
				const handleIdx = handle.indexOf(needle);
				const nameIdx = name.indexOf(needle);
				const best = [handleIdx, nameIdx].filter((i) => i >= 0).sort()[0] ?? 99;
				return { user: u, score: best };
			})
			.filter((x): x is { user: Doc<"users">; score: number } => x !== null)
			.sort((a, b) => a.score - b.score)
			.slice(0, limit);

		return scored.map(({ user }) => ({
			_id: user._id,
			handle: user.handle ?? "@anon",
			name: user.name ?? null,
			image: user.image ?? null,
		}));
	},
});

export const byId = query({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const user = await ctx.db.get(userId);
		if (!user) return null;
		return {
			_id: user._id,
			handle: user.handle ?? "@anon",
			name: user.name ?? null,
			image: user.image ?? null,
		};
	},
});

function normalizeHandleParam(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/**
 * Public profile + stats for a given handle. Returns null if no such user.
 * Includes the user's leaderboard rank (same ranking rule as api.leaderboard.top).
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

		// Build pnl rows for every user so we can both fetch the target's stats
		// and compute the target's leaderboard rank in one pass.
		const allUsers = await ctx.db.query("users").collect();
		const rows = await Promise.all(
			allUsers.map(async (u) => {
				const positions = await ctx.db
					.query("positions")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.collect();
				const trades = await ctx.db
					.query("trades")
					.withIndex("by_user", (q) => q.eq("userId", u._id))
					.collect();

				let unrealized = 0;
				for (const p of positions) {
					const m = await ctx.db.get(p.ticketId);
					if (!m) continue;
					const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
					unrealized += p.shares * (current - p.avgPrice);
				}
				const realized = positions.reduce((acc, p) => acc + p.realizedPnl, 0);
				const volume = trades.reduce((acc, t) => acc + Math.abs(t.cost), 0);
				const wins = positions.filter((p) => p.realizedPnl > 0).length;
				return {
					_id: u._id,
					pnl: realized + unrealized,
					realized,
					unrealized,
					volume,
					winRate: wins / (positions.length || 1),
					positionsCount: positions.length,
					tradesCount: trades.length,
					ranked: trades.length > 0 || positions.length > 0,
				};
			})
		);

		const me = rows.find((r) => r._id === user._id);
		if (!me) return null;

		// Same filter as leaderboard.top — unranked users aren't part of the
		// denominator either.
		const ranked = rows.filter((r) => r.ranked).sort((a, b) => b.pnl - a.pnl);
		const rankIdx = ranked.findIndex((r) => r._id === user._id);
		const rank = rankIdx >= 0 ? rankIdx + 1 : null;
		const traderCount = ranked.length;

		return {
			_id: user._id,
			handle: user.handle ?? "@anon",
			name: user.name ?? null,
			image: user.image ?? null,
			joinedAt: user.joinedAt ?? user._creationTime,
			isAdmin: isAdminUser(user),
			pnl: me.pnl,
			realizedPnl: me.realized,
			unrealizedPnl: me.unrealized,
			volume: me.volume,
			winRate: me.winRate,
			positionsCount: me.positionsCount,
			tradesCount: me.tradesCount,
			rank,
			traderCount,
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
		const tickets = await Promise.all(
			positions.map((p) => ctx.db.get(p.ticketId))
		);

		return positions
			.map((p, i) => {
				const m = tickets[i];
				if (!m) return null;
				const current = p.side === "Yes" ? m.yesPrice : 1 - m.yesPrice;
				const cost = p.shares * p.avgPrice;
				const value = p.shares * current;
				return {
					_id: p._id,
					ticketId: p.ticketId,
					ticketSlug: m.slug,
					question: m.question,
					side: p.side,
					shares: p.shares,
					avgPrice: p.avgPrice,
					current,
					cost,
					value,
					pnl: value - cost,
					ticketStatus: m.status,
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

		const ticketIds = Array.from(new Set(trades.map((t) => t.ticketId)));
		const tickets = await Promise.all(ticketIds.map((id) => ctx.db.get(id)));
		const metaById = new Map(
			tickets
				.filter((m): m is NonNullable<typeof m> => m !== null)
				.map((m) => [m._id, { question: m.question, slug: m.slug }])
		);

		return trades.map((t) => {
			const meta = metaById.get(t.ticketId);
			return {
				_id: t._id,
				_creationTime: t._creationTime,
				ticketId: t.ticketId,
				ticketSlug: meta?.slug ?? "",
				question: meta?.question ?? "Unknown ticket",
				side: t.side,
				kind: t.kind,
				shares: t.shares,
				price: t.price,
				cost: t.cost,
			};
		});
	},
});
