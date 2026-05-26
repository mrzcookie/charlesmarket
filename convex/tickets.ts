import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { isAdminUser, requireUser } from "./users";

const MIN_QUESTION = 12;
const MAX_QUESTION = 140;
const MIN_LIQUIDITY = 100;
const MAX_LIQUIDITY = 50_000;

function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 60);
	return base || `ticket-${Math.random().toString(36).slice(2, 8)}`;
}

async function uniqueSlug(ctx: QueryCtx, desired: string): Promise<string> {
	let candidate = desired;
	let i = 2;
	while (true) {
		const hit = await ctx.db
			.query("tickets")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique();
		if (!hit) return candidate;
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

async function enrichMarket(ctx: QueryCtx, m: Doc<"tickets">) {
	const [subject, creator] = await Promise.all([
		userMini(ctx, m.subjectUserId),
		userMini(ctx, m.creatorId),
	]);
	return { ...m, subject, creator };
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const docs = await ctx.db.query("tickets").collect();
		return await Promise.all(docs.map((m) => enrichMarket(ctx, m)));
	},
});

export const getBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const m = await ctx.db
			.query("tickets")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!m) return null;
		return await enrichMarket(ctx, m);
	},
});

export const trending = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, { limit = 4 }) => {
		const all = await ctx.db.query("tickets").collect();
		const open = all
			.filter((m) => m.status === "open")
			.sort((a, b) => b.volume - a.volume)
			.slice(0, limit);
		return await Promise.all(open.map((m) => enrichMarket(ctx, m)));
	},
});

export const history = query({
	args: { ticketId: v.id("tickets"), limit: v.optional(v.number()) },
	handler: async (ctx, { ticketId, limit = 100 }) => {
		const ticks = await ctx.db
			.query("priceTicks")
			.withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
			.order("desc")
			.take(limit);
		return ticks.reverse();
	},
});

export const create = mutation({
	args: {
		subjectUserId: v.id("users"),
		question: v.string(),
		description: v.string(),
		tags: v.array(v.string()),
		closesAt: v.string(),
		closesAtMs: v.number(),
		initialYesPrice: v.number(),
		initialLiquidity: v.number(),
		// Admin-only escape hatch — when set + caller is admin, self-subject
		// is allowed. Used by the admin Create dialog.
		adminOverride: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const user = await requireUser(ctx);

		const subject = await ctx.db.get(args.subjectUserId);
		if (!subject) throw new Error("Subject user not found");
		if (subject._id === user._id) {
			if (!(args.adminOverride && isAdminUser(user))) {
				throw new Error("You can't make a ticket about yourself");
			}
		}

		const question = args.question.trim();
		const description = args.description.trim();
		const closesAt = args.closesAt.trim();
		const tags = args.tags
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean)
			.slice(0, 8);

		if (question.length < MIN_QUESTION || question.length > MAX_QUESTION) {
			throw new Error(
				`Question must be ${MIN_QUESTION}-${MAX_QUESTION} characters`
			);
		}
		if (!/\?$/.test(question)) throw new Error("Question must end with '?'");
		if (description.length > 1_000) {
			throw new Error("Description must be 1,000 characters or fewer");
		}
		if (!closesAt) throw new Error("Closing date label is required");
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
			args.initialLiquidity < MIN_LIQUIDITY ||
			args.initialLiquidity > MAX_LIQUIDITY
		) {
			throw new Error(
				`Initial liquidity must be ${MIN_LIQUIDITY}-${MAX_LIQUIDITY}`
			);
		}

		const slug = await uniqueSlug(ctx, slugify(question));
		const now = Date.now();

		const ticketId = await ctx.db.insert("tickets", {
			slug,
			question,
			description,
			yesPrice: args.initialYesPrice,
			volume: 0,
			liquidity: args.initialLiquidity,
			openInterest: 0,
			closesAt,
			closesAtMs: args.closesAtMs,
			tags,
			status: "open",
			createdAt: now,
			subjectUserId: subject._id,
			creatorId: user._id,
		});
		await ctx.db.insert("priceTicks", {
			ticketId,
			yesPrice: args.initialYesPrice,
		});
		return { ticketId, slug };
	},
});

export const bySubject = query({
	args: { handle: v.string(), limit: v.optional(v.number()) },
	handler: async (ctx, { handle, limit = 50 }) => {
		const normalized = handle.startsWith("@") ? handle : `@${handle}`;
		const subject = await ctx.db
			.query("users")
			.withIndex("by_handle", (q) => q.eq("handle", normalized))
			.unique();
		if (!subject) return [];
		const rows = await ctx.db
			.query("tickets")
			.withIndex("by_subject", (q) => q.eq("subjectUserId", subject._id))
			.order("desc")
			.take(limit);
		return await Promise.all(rows.map((m) => enrichMarket(ctx, m)));
	},
});
