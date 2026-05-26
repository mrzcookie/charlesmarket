import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";

// One-shot v1 → v2 migration. Callable only via `npx convex run`, which
// requires CONVEX_DEPLOY_KEY (treat that key like prod admin credentials).
// No `requireAdmin` because the deploy-key gate already enforces ops trust.
//
// The runbook lives in MIGRATION.md. Build the payload via
// `scripts/build-migration-payload.mjs` and pass it on stdin:
//
//   cat payload.json | npx convex run migrations:importV1Snapshot --prod
//
// What this does:
//   1. Walks `markets[]` and inserts equivalent rows into the `tickets` table,
//      assigning every legacy ticket `subjectUserId = charlesUserId` and
//      `creatorId = defaultCreatorId`. Dedupes by slug (rerunnable).
//   2. For each child row, swaps the old `marketId` for the freshly minted
//      `ticketId` via the local translation map and inserts.
//   3. Returns counts so you can sanity-check.
//
// What it doesn't do:
//   - Preserve `_creationTime` on child rows. Convex sets that on insert; the
//     historical timestamp is lost. Acceptable for friend-group scale; the
//     ticket close times and resolution status survive.
//   - Migrate `marketProposals`. The v2 model has no proposal flow.
//   - Migrate `users`. The `users` table didn't change shape; legacy rows
//     pass v2 validation untouched. Don't wipe them.

const sideUnion = v.union(v.literal("Yes"), v.literal("No"));

const v1Market = v.object({
	_id: v.string(),
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
});

const v1Position = v.object({
	userId: v.id("users"),
	marketId: v.string(),
	side: sideUnion,
	shares: v.number(),
	avgPrice: v.number(),
	realizedPnl: v.number(),
});

const v1Trade = v.object({
	userId: v.id("users"),
	marketId: v.string(),
	side: sideUnion,
	kind: v.union(v.literal("buy"), v.literal("sell")),
	shares: v.number(),
	price: v.number(),
	cost: v.number(),
});

const v1Comment = v.object({
	userId: v.id("users"),
	marketId: v.string(),
	body: v.string(),
});

const v1PriceTick = v.object({
	marketId: v.string(),
	yesPrice: v.number(),
});

const v1Report = v.object({
	marketId: v.string(),
	reporterId: v.id("users"),
	description: v.string(),
	status: v.union(
		v.literal("pending"),
		v.literal("validated"),
		v.literal("rejected")
	),
	reviewedBy: v.optional(v.id("users")),
	reviewedAt: v.optional(v.number()),
});

export const importV1Snapshot = mutation({
	args: {
		charlesUserId: v.id("users"),
		defaultCreatorId: v.id("users"),
		markets: v.array(v1Market),
		positions: v.optional(v.array(v1Position)),
		trades: v.optional(v.array(v1Trade)),
		comments: v.optional(v.array(v1Comment)),
		priceTicks: v.optional(v.array(v1PriceTick)),
		ticketReports: v.optional(v.array(v1Report)),
		dryRun: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const charles = await ctx.db.get(args.charlesUserId);
		if (!charles) throw new Error("charlesUserId not found in users table");
		const creator = await ctx.db.get(args.defaultCreatorId);
		if (!creator) throw new Error("defaultCreatorId not found in users table");

		const counts = {
			ticketsInserted: 0,
			ticketsSkipped: 0,
			positions: 0,
			trades: 0,
			comments: 0,
			priceTicks: 0,
			ticketReports: 0,
			orphans: 0,
		};

		// markets → tickets, building the id translation map.
		const idMap = new Map<string, Id<"tickets">>();
		for (const m of args.markets) {
			const existing = await ctx.db
				.query("tickets")
				.withIndex("by_slug", (q) => q.eq("slug", m.slug))
				.unique();
			if (existing) {
				idMap.set(m._id, existing._id);
				counts.ticketsSkipped += 1;
				continue;
			}
			if (args.dryRun) {
				counts.ticketsInserted += 1;
				continue;
			}
			const newId = await ctx.db.insert("tickets", {
				slug: m.slug,
				question: m.question,
				description: m.description,
				yesPrice: m.yesPrice,
				volume: m.volume,
				liquidity: m.liquidity,
				openInterest: m.openInterest,
				closesAt: m.closesAt,
				closesAtMs: m.closesAtMs,
				tags: m.tags,
				status: m.status,
				resolution: m.resolution,
				createdAt: m.createdAt,
				subjectUserId: args.charlesUserId,
				creatorId: args.defaultCreatorId,
			});
			idMap.set(m._id, newId);
			counts.ticketsInserted += 1;
		}

		const translate = (oldMarketId: string): Id<"tickets"> | null =>
			idMap.get(oldMarketId) ?? null;

		for (const p of args.positions ?? []) {
			const ticketId = translate(p.marketId);
			if (!ticketId) {
				counts.orphans += 1;
				continue;
			}
			if (!args.dryRun) {
				await ctx.db.insert("positions", {
					userId: p.userId,
					ticketId,
					side: p.side,
					shares: p.shares,
					avgPrice: p.avgPrice,
					realizedPnl: p.realizedPnl,
				});
			}
			counts.positions += 1;
		}

		for (const t of args.trades ?? []) {
			const ticketId = translate(t.marketId);
			if (!ticketId) {
				counts.orphans += 1;
				continue;
			}
			if (!args.dryRun) {
				await ctx.db.insert("trades", {
					userId: t.userId,
					ticketId,
					side: t.side,
					kind: t.kind,
					shares: t.shares,
					price: t.price,
					cost: t.cost,
				});
			}
			counts.trades += 1;
		}

		for (const c of args.comments ?? []) {
			const ticketId = translate(c.marketId);
			if (!ticketId) {
				counts.orphans += 1;
				continue;
			}
			if (!args.dryRun) {
				await ctx.db.insert("comments", {
					userId: c.userId,
					ticketId,
					body: c.body,
				});
			}
			counts.comments += 1;
		}

		for (const tick of args.priceTicks ?? []) {
			const ticketId = translate(tick.marketId);
			if (!ticketId) {
				counts.orphans += 1;
				continue;
			}
			if (!args.dryRun) {
				await ctx.db.insert("priceTicks", {
					ticketId,
					yesPrice: tick.yesPrice,
				});
			}
			counts.priceTicks += 1;
		}

		for (const r of args.ticketReports ?? []) {
			const ticketId = translate(r.marketId);
			if (!ticketId) {
				counts.orphans += 1;
				continue;
			}
			if (!args.dryRun) {
				await ctx.db.insert("ticketReports", {
					ticketId,
					reporterId: r.reporterId,
					description: r.description,
					status: r.status,
					reviewedBy: r.reviewedBy,
					reviewedAt: r.reviewedAt,
				});
			}
			counts.ticketReports += 1;
		}

		return { counts, dryRun: !!args.dryRun };
	},
});
