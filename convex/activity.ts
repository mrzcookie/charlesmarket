import { v } from "convex/values";
import { query } from "./_generated/server";

type FeedEvent =
	| {
			kind: "trade";
			_id: string;
			ts: number;
			handle: string;
			marketId: string;
			marketSlug: string;
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
			handle: string;
			marketId: string;
			marketSlug: string;
			question: string;
			body: string;
	  }
	| {
			kind: "resolve";
			_id: string;
			ts: number;
			marketId: string;
			marketSlug: string;
			question: string;
			resolution: "Yes" | "No";
	  };

export const feed = query({
	args: {
		limit: v.optional(v.number()),
		filter: v.optional(
			v.union(
				v.literal("all"),
				v.literal("trades"),
				v.literal("comments"),
				v.literal("resolutions")
			)
		),
	},
	handler: async (ctx, { limit = 50, filter = "all" }) => {
		const events: FeedEvent[] = [];

		const seenUsers = new Map<string, string>();
		const resolveHandle = async (userId: string) => {
			const cached = seenUsers.get(userId);
			if (cached) return cached;
			// biome-ignore lint/suspicious/noExplicitAny: Id cast
			const u = await ctx.db.get(userId as any);
			const handle = (u as { handle?: string } | null)?.handle ?? "@anon";
			seenUsers.set(userId, handle);
			return handle;
		};

		const seenMarkets = new Map<string, { slug: string; question: string }>();
		const resolveMarket = async (marketId: string) => {
			const cached = seenMarkets.get(marketId);
			if (cached) return cached;
			// biome-ignore lint/suspicious/noExplicitAny: Id cast
			const m = await ctx.db.get(marketId as any);
			const data = {
				slug: (m as { slug?: string } | null)?.slug ?? "unknown",
				question:
					(m as { question?: string } | null)?.question ?? "Unknown market",
			};
			seenMarkets.set(marketId, data);
			return data;
		};

		if (filter === "all" || filter === "trades") {
			const trades = await ctx.db.query("trades").order("desc").take(limit);
			for (const t of trades) {
				const m = await resolveMarket(t.marketId);
				events.push({
					kind: "trade",
					_id: t._id,
					ts: t._creationTime,
					handle: await resolveHandle(t.userId),
					marketId: t.marketId,
					marketSlug: m.slug,
					question: m.question,
					side: t.side,
					action: t.kind,
					shares: t.shares,
					price: t.price,
					cost: t.cost,
				});
			}
		}

		if (filter === "all" || filter === "comments") {
			const comments = await ctx.db.query("comments").order("desc").take(limit);
			for (const c of comments) {
				const m = await resolveMarket(c.marketId);
				events.push({
					kind: "comment",
					_id: c._id,
					ts: c._creationTime,
					handle: await resolveHandle(c.userId),
					marketId: c.marketId,
					marketSlug: m.slug,
					question: m.question,
					body: c.body,
				});
			}
		}

		if (filter === "all" || filter === "resolutions") {
			const resolved = await ctx.db
				.query("markets")
				.withIndex("by_status", (q) => q.eq("status", "resolved"))
				.order("desc")
				.take(limit);
			for (const m of resolved) {
				if (!m.resolution) continue;
				events.push({
					kind: "resolve",
					_id: m._id,
					ts: m._creationTime,
					marketId: m._id,
					marketSlug: m.slug,
					question: m.question,
					resolution: m.resolution,
				});
			}
		}

		events.sort((a, b) => b.ts - a.ts);
		return events.slice(0, limit);
	},
});
